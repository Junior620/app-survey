import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  backupNameFor,
  keyPragma,
  loadOrCreateKey,
  prepareEncryptedDatabase,
  tmpNameFor,
  type CipherConnection,
  type CipherHost,
  type DatabaseKeyStore,
} from './dbEncryption';

const KEY_A = 'a1'.repeat(32);
const KEY_GEN = 'b2'.repeat(32);
const DIR = '/data/files/SQLite';
const NAME = 'scpb_local.db';

type FakeFile = { key: string | null; userVersion: number; tables: Record<string, number> };

class Crash extends Error {}

/** In-memory stand-in for SQLCipher + the file system, enough for the statements dbEncryption issues. */
class FakeHost implements CipherHost {
  files = new Map<string, FakeFile>();
  cipher = true;
  exportFails = false;
  lockedReads = false;
  crashed = false;
  /** Simulates the process dying right before this host operation. */
  crashBefore: ((op: string, a: string, b?: string) => boolean) | null = null;
  warnings: string[] = [];

  private guard(op: string, a: string, b?: string): void {
    if (this.crashed) throw new Crash('process is dead');
    if (this.crashBefore?.(op, a, b)) {
      this.crashed = true;
      throw new Crash(`crash before ${op} ${a}`);
    }
  }

  relaunch(): void {
    this.crashed = false;
    this.crashBefore = null;
  }

  absolutePath(name: string): string {
    return `${DIR}/${name}`;
  }

  async exists(name: string): Promise<boolean> {
    this.guard('exists', name);
    return this.files.has(name);
  }

  async move(from: string, to: string): Promise<void> {
    this.guard('move', from, to);
    const f = this.files.get(from);
    if (!f) throw new Error(`${from} missing`);
    if (this.files.has(to)) throw new Error(`${to} exists`);
    this.files.delete(from);
    this.files.set(to, f);
  }

  async remove(name: string): Promise<void> {
    this.guard('remove', name);
    this.files.delete(name);
  }

  now(): number {
    return 1700000000000;
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  async open(name: string): Promise<CipherConnection> {
    this.guard('open', name);
    const host = this;
    let key: string | null = null;
    let attached: { alias: string; name: string } | null = null;

    const file = (): FakeFile => {
      if (name === ':memory:') return { key: null, userVersion: 0, tables: {} };
      if (host.lockedReads) throw new Error('database is locked');
      let f = host.files.get(name);
      if (!f) {
        f = { key, userVersion: 0, tables: {} };
        host.files.set(name, f);
      }
      if (f.key !== key) throw new Error('file is not a database');
      return f;
    };

    return {
      async exec(sql) {
        let m: RegExpMatchArray | null;
        if ((m = sql.match(/^PRAGMA key = "x'([0-9a-f]+)'"$/))) {
          key = m[1]!;
        } else if (/^PRAGMA wal_checkpoint/.test(sql)) {
          file();
        } else if ((m = sql.match(/^ATTACH DATABASE '(.+)' AS (\w+) KEY "x'([0-9a-f]+)'"$/))) {
          const attachedName = m[1]!.slice(DIR.length + 1);
          if (!host.files.has(attachedName)) {
            host.files.set(attachedName, { key: m[3]!, userVersion: 0, tables: {} });
          }
          attached = { alias: m[2]!, name: attachedName };
        } else if ((m = sql.match(/^SELECT sqlcipher_export\('(\w+)'\)$/))) {
          if (!host.cipher) throw new Error('no such function: sqlcipher_export');
          if (host.exportFails) throw new Error('database or disk is full');
          assert.equal(attached?.alias, m[1]);
          host.files.get(attached!.name)!.tables = { ...file().tables };
        } else if ((m = sql.match(/^PRAGMA (\w+)\.user_version = (\d+)$/))) {
          assert.equal(attached?.alias, m[1]);
          host.files.get(attached!.name)!.userVersion = Number(m[2]);
        } else if (/^DETACH DATABASE/.test(sql)) {
          attached = null;
        } else {
          throw new Error(`unexpected exec: ${sql}`);
        }
      },
      async getFirst<T>(sql: string): Promise<T | null> {
        let m: RegExpMatchArray | null;
        if (sql === 'PRAGMA cipher_version') {
          return (host.cipher ? { cipher_version: '4.6.1 community' } : null) as T | null;
        }
        if (/randomblob\(32\)/.test(sql)) return { k: KEY_GEN } as T;
        if (/FROM sqlite_master$/.test(sql)) {
          file();
          return { n: 1 } as T;
        }
        if (sql === 'PRAGMA main.user_version') return { user_version: file().userVersion } as T;
        if (sql === 'PRAGMA quick_check') return { quick_check: (file(), 'ok') } as T;
        if ((m = sql.match(/^SELECT count\(\*\) AS n FROM main\."(\w+)"$/))) {
          return { n: file().tables[m[1]!] ?? 0 } as T;
        }
        throw new Error(`unexpected getFirst: ${sql}`);
      },
      async getAll<T>(sql: string): Promise<T[]> {
        if (/FROM main\.sqlite_master/.test(sql)) {
          return Object.keys(file().tables)
            .sort()
            .map((t) => ({ name: t })) as T[];
        }
        throw new Error(`unexpected getAll: ${sql}`);
      },
      async close() {
        /* nothing to release */
      },
    };
  }
}

class MemoryStore implements DatabaseKeyStore {
  value: string | null;
  sets = 0;
  dropWrites = false;
  failReads = false;
  constructor(value: string | null = null) {
    this.value = value;
  }
  async get() {
    if (this.failReads) throw new Error('keystore unavailable');
    return this.value;
  }
  async set(v: string) {
    this.sets += 1;
    if (!this.dropWrites) this.value = v;
  }
}

function plainDbWithPendingOutbox(): FakeFile {
  return { key: null, userVersion: 9, tables: { planteurs: 12, sync_outbox: 3, attachments: 2 } };
}

describe('database key', () => {
  it('creates, persists and reuses one key', async () => {
    const store = new MemoryStore();
    const first = await loadOrCreateKey(store, async () => KEY_GEN);
    assert.deepEqual(first, { keyHex: KEY_GEN, created: true });
    const second = await loadOrCreateKey(store, async () => KEY_A);
    assert.deepEqual(second, { keyHex: KEY_GEN, created: false });
    assert.equal(store.sets, 1);
  });

  it('refuses a key that did not persist', async () => {
    const store = new MemoryStore();
    store.dropWrites = true;
    await assert.rejects(loadOrCreateKey(store, async () => KEY_GEN));
  });

  it('never generates a key when the keystore read fails', async () => {
    const store = new MemoryStore();
    store.failReads = true;
    await assert.rejects(loadOrCreateKey(store, async () => KEY_GEN));
    assert.equal(store.sets, 0);
  });

  it('builds a raw-key pragma and rejects anything but 64 hex chars', () => {
    assert.equal(keyPragma(KEY_A), `PRAGMA key = "x'${KEY_A}'"`);
    assert.throws(() => keyPragma(`${KEY_A.slice(2)}'"`));
  });
});

describe('prepareEncryptedDatabase', () => {
  it('fresh install: new key, database created encrypted', async () => {
    const host = new FakeHost();
    const store = new MemoryStore();
    const res = await prepareEncryptedDatabase(host, NAME, store);
    assert.deepEqual(res, { keyHex: KEY_GEN, status: { mode: 'encrypted', detail: 'created' } });
    assert.equal(store.value, KEY_GEN);
  });

  it('opens an existing encrypted database and drops a leftover plain backup', async () => {
    const host = new FakeHost();
    host.files.set(NAME, { key: KEY_A, userVersion: 9, tables: { sync_outbox: 1 } });
    host.files.set(backupNameFor(NAME), plainDbWithPendingOutbox());
    const res = await prepareEncryptedDatabase(host, NAME, new MemoryStore(KEY_A));
    assert.deepEqual(res.status, { mode: 'encrypted', detail: 'existing' });
    assert.deepEqual([...host.files.keys()], [NAME]);
  });

  it('migrates a plain database without losing outbox rows or the schema version', async () => {
    const host = new FakeHost();
    host.files.set(NAME, plainDbWithPendingOutbox());
    const res = await prepareEncryptedDatabase(host, NAME, new MemoryStore());
    assert.deepEqual(res, { keyHex: KEY_GEN, status: { mode: 'encrypted', detail: 'migrated' } });
    assert.deepEqual(host.files.get(NAME), { ...plainDbWithPendingOutbox(), key: KEY_GEN });
    assert.deepEqual([...host.files.keys()], [NAME]);
  });

  it('keeps the plain database when the export fails, and retries next launch', async () => {
    const host = new FakeHost();
    const store = new MemoryStore();
    host.files.set(NAME, plainDbWithPendingOutbox());
    host.exportFails = true;
    const failed = await prepareEncryptedDatabase(host, NAME, store);
    assert.equal(failed.keyHex, null);
    assert.equal(failed.status.mode, 'plain');
    assert.deepEqual(host.files.get(NAME), plainDbWithPendingOutbox());
    assert.equal(host.files.has(tmpNameFor(NAME)), false);

    host.exportFails = false;
    const retried = await prepareEncryptedDatabase(host, NAME, store);
    assert.deepEqual(retried.status, { mode: 'encrypted', detail: 'migrated' });
    assert.equal(host.files.get(NAME)!.tables.sync_outbox, 3);
  });

  const crashPoints: Array<[string, (op: string, a: string) => boolean]> = [
    ['during the export', (op, a) => op === 'open' && a === tmpNameFor(NAME)],
    ['before setting the plain file aside', (op, a) => op === 'move' && a === NAME],
    ['between the two renames', (op, a) => op === 'move' && a === tmpNameFor(NAME)],
  ];

  // A crash after the second rename only leaves the backup behind; see the "existing" case.
  for (const [label, crashBefore] of crashPoints) {
    it(`recovers from a crash ${label}`, async () => {
      const host = new FakeHost();
      const store = new MemoryStore();
      host.files.set(NAME, plainDbWithPendingOutbox());
      host.crashBefore = crashBefore;
      await assert.rejects(prepareEncryptedDatabase(host, NAME, store), Crash);

      host.relaunch();
      const res = await prepareEncryptedDatabase(host, NAME, store);
      assert.equal(res.status.mode, 'encrypted');
      assert.equal(res.keyHex, KEY_GEN);
      assert.deepEqual(host.files.get(NAME), { ...plainDbWithPendingOutbox(), key: KEY_GEN });
      assert.deepEqual([...host.files.keys()], [NAME]);
    });
  }

  it('leaves everything untouched when SQLCipher is not compiled in', async () => {
    const host = new FakeHost();
    const store = new MemoryStore();
    host.cipher = false;
    host.files.set(NAME, plainDbWithPendingOutbox());
    const res = await prepareEncryptedDatabase(host, NAME, store);
    assert.deepEqual(res, { keyHex: null, status: { mode: 'plain', detail: 'sqlcipher_unavailable' } });
    assert.equal(store.sets, 0);
    assert.deepEqual(host.files.get(NAME), plainDbWithPendingOutbox());
  });

  it('sets aside, never deletes, a database whose key is gone', async () => {
    const host = new FakeHost();
    host.files.set(NAME, { key: KEY_A, userVersion: 9, tables: { sync_outbox: 3 } });
    const res = await prepareEncryptedDatabase(host, NAME, new MemoryStore());
    assert.equal(res.status.mode, 'encrypted');
    assert.equal(res.keyHex, KEY_GEN);
    const aside = `${NAME}.unreadable-1700000000000`;
    assert.deepEqual(res.status, { mode: 'encrypted', detail: 'recreated_after_key_loss', quarantinedAs: aside });
    assert.equal(host.files.get(aside)!.key, KEY_A);
    assert.equal(host.files.has(NAME), false);
  });

  it('does not mistake a locked database for a wrong key', async () => {
    const host = new FakeHost();
    host.files.set(NAME, { key: KEY_A, userVersion: 9, tables: { sync_outbox: 3 } });
    host.lockedReads = true;
    await assert.rejects(prepareEncryptedDatabase(host, NAME, new MemoryStore(KEY_A)), /locked/);
    assert.deepEqual([...host.files.keys()], [NAME]);
  });
});
