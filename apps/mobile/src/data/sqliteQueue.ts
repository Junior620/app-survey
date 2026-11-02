/**
 * Serialises every statement on the shared SQLite connection through one FIFO queue.
 *
 * Transactions hold the queue for their whole duration. Only the `tx` handle passed to
 * the `runTransaction` callback executes inside the transaction; every other caller
 * (sync push/pull, UI reads, other repository writes) waits for COMMIT or ROLLBACK.
 *
 * Never await the queued database from inside a transaction callback: the call waits
 * behind the transaction that is waiting for it. Pass `tx` down instead.
 */

const QUEUED_METHODS = new Set([
  'runAsync',
  'getFirstAsync',
  'getAllAsync',
  'execAsync',
  'closeAsync',
]);

const TX_METHODS = new Set(['runAsync', 'getFirstAsync', 'getAllAsync', 'execAsync']);

/** Raw expo-sqlite transaction helpers bypass the queue, so the serialised handle refuses them. */
const RAW_TRANSACTION_METHODS = new Set(['withTransactionAsync', 'withExclusiveTransactionAsync']);

type Executor = { execAsync: (source: string) => Promise<void> };

const SLOW_TRANSACTION_MS = 15_000;

function isLockedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /database is locked|finalizeAsync/i.test(message);
}

async function withLockRetry<T>(task: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      last = error;
      if (!isLockedError(error) || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
  throw last;
}

type Queue = { tail: Promise<void> };

function enqueue<T>(queue: Queue, task: () => Promise<T>): Promise<T> {
  const run = queue.tail.then(task);
  queue.tail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

type Serialized = { raw: Executor; queue: Queue };

const serializedHandles = new WeakMap<object, Serialized>();
const openTransactions = new WeakSet<object>();

/** Wrap a raw connection so each queued method waits its turn. */
export function createSerializedDatabase<D extends object>(raw: D): D {
  const state: Serialized = { raw: raw as unknown as Executor, queue: { tail: Promise.resolve() } };
  const handle = new Proxy(raw, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      const name = String(prop);
      if (RAW_TRANSACTION_METHODS.has(name)) {
        return () =>
          Promise.reject(new Error(`${name} bypasses the SQLite queue; use runTransaction(db, (tx) => …)`));
      }
      if (!QUEUED_METHODS.has(name)) return value.bind(target);
      return (...args: unknown[]) =>
        enqueue(state.queue, () =>
          withLockRetry(() => Reflect.apply(value, target, args) as Promise<unknown>)
        );
    },
  });
  serializedHandles.set(handle, state);
  return handle;
}

/** Statements on `tx` run directly on the connection the transaction already owns. */
function createTransactionHandle<D extends object>(raw: D): { tx: D; close: () => void } {
  let open = true;
  const tx = new Proxy(raw, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      const name = String(prop);
      if (!TX_METHODS.has(name)) {
        return () =>
          Promise.reject(new Error(`${name} is not available on a transaction handle`));
      }
      return (...args: unknown[]) => {
        if (!open) {
          return Promise.reject(new Error('Transaction handle used after COMMIT/ROLLBACK'));
        }
        return withLockRetry(() => Reflect.apply(value, target, args) as Promise<unknown>);
      };
    },
  });
  openTransactions.add(tx);
  return {
    tx,
    close: () => {
      open = false;
      openTransactions.delete(tx);
    },
  };
}

/**
 * Run `task` in one transaction that holds the queue until COMMIT/ROLLBACK.
 * Called with a `tx` handle (nested helper), the task joins that transaction.
 */
export async function runTransaction<D extends object, T>(
  db: D,
  task: (tx: D) => Promise<T>
): Promise<T> {
  if (openTransactions.has(db)) return task(db);
  const state = serializedHandles.get(db);
  if (!state) throw new Error('runTransaction requires a database from getDatabase() or a tx handle');

  return enqueue(state.queue, async () => {
    const raw = state.raw;
    await withLockRetry(() => raw.execAsync('BEGIN'));
    const { tx, close } = createTransactionHandle(raw as unknown as D);
    const slow = setTimeout(() => {
      console.warn(
        '[sqlite] transaction open for 15s; a call inside it may be awaiting the queued db instead of tx'
      );
    }, SLOW_TRANSACTION_MS);
    try {
      const result = await task(tx);
      close();
      await withLockRetry(() => raw.execAsync('COMMIT'));
      return result;
    } catch (error) {
      close();
      try {
        await raw.execAsync('ROLLBACK');
      } catch {
        /* SQLite already rolled back (e.g. failed COMMIT on a constraint). */
      }
      throw error;
    } finally {
      clearTimeout(slow);
    }
  });
}
