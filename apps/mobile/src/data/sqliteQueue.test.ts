import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSerializedDatabase, runTransaction } from './sqliteQueue';

/** Records statements in execution order; each call yields to the event loop like a native call. */
function fakeConnection() {
  const log: string[] = [];
  const step = (sql: string) =>
    new Promise<void>((resolve) =>
      setImmediate(() => {
        log.push(sql);
        resolve();
      })
    );
  const raw = {
    execAsync: (sql: string) => step(sql),
    runAsync: (sql: string) => step(sql),
    getFirstAsync: async (sql: string) => {
      await step(sql);
      return null;
    },
    getAllAsync: async (sql: string) => {
      await step(sql);
      return [];
    },
    closeAsync: () => step('CLOSE'),
    withTransactionAsync: async (task: () => Promise<void>) => task(),
  };
  return { raw, log, db: createSerializedDatabase(raw) };
}

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, opened };
}

describe('sqlite queue transactions', () => {
  it('makes outside callers wait until COMMIT', async () => {
    const { db, log } = fakeConnection();
    const inside = gate();
    const tx = runTransaction(db, async (t) => {
      await t.runAsync('tx write 1');
      await inside.opened;
      await t.runAsync('tx write 2');
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const outside = db.runAsync('sync ack');
    await new Promise((resolve) => setTimeout(resolve, 5));
    inside.open();
    await Promise.all([tx, outside]);
    assert.deepEqual(log, ['BEGIN', 'tx write 1', 'tx write 2', 'COMMIT', 'sync ack']);
  });

  it('keeps an outside write out of a transaction that rolls back', async () => {
    const { db, log } = fakeConnection();
    const inside = gate();
    const tx = runTransaction(db, async (t) => {
      await t.runAsync('tx write');
      await inside.opened;
      throw new Error('constraint failed');
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const outside = db.runAsync("UPDATE sync_outbox SET transfer_status = 'acked'");
    inside.open();
    await assert.rejects(tx, /constraint failed/);
    await outside;
    assert.deepEqual(log, [
      'BEGIN',
      'tx write',
      'ROLLBACK',
      "UPDATE sync_outbox SET transfer_status = 'acked'",
    ]);
  });

  it('joins a nested runTransaction called with the tx handle', async () => {
    const { db, log } = fakeConnection();
    await runTransaction(db, async (t) => {
      await runTransaction(t, async (inner) => {
        await inner.runAsync('nested write');
      });
    });
    assert.deepEqual(log, ['BEGIN', 'nested write', 'COMMIT']);
  });

  it('serialises back-to-back transactions and plain calls in FIFO order', async () => {
    const { db, log } = fakeConnection();
    await Promise.all([
      runTransaction(db, async (t) => {
        await t.runAsync('a1');
        await t.runAsync('a2');
      }),
      db.getFirstAsync('read'),
      runTransaction(db, async (t) => {
        await t.runAsync('b1');
      }),
    ]);
    assert.deepEqual(log, ['BEGIN', 'a1', 'a2', 'COMMIT', 'read', 'BEGIN', 'b1', 'COMMIT']);
  });

  it('rejects a tx handle used after the transaction ended', async () => {
    const { db } = fakeConnection();
    let leaked: typeof db | null = null;
    await runTransaction(db, async (t) => {
      leaked = t;
    });
    await assert.rejects(leaked!.runAsync('late write'), /after COMMIT/);
  });

  it('refuses raw expo-sqlite transactions on the serialised handle', async () => {
    const { db } = fakeConnection();
    await assert.rejects(db.withTransactionAsync(async () => undefined), /runTransaction/);
  });
});
