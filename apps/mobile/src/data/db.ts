import * as SQLite from 'expo-sqlite';
import { demoDbName, isDemoModeEnabled, opsDbName } from './demoMode';
import { runMigrations } from './migrations';

const QUEUED_METHODS = new Set([
  'runAsync',
  'getFirstAsync',
  'getAllAsync',
  'execAsync',
  'withTransactionAsync',
  'withExclusiveTransactionAsync',
  'closeAsync',
]);

let tail: Promise<void> = Promise.resolve();
let depth = 0;

type ClosableDb = { closeAsync: () => Promise<void> };
const globalDb = globalThis as typeof globalThis & { __appsurveySqlite?: ClosableDb };

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

/** One native statement at a time. Nested calls inside a transaction run inline. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  if (depth > 0) return withLockRetry(task);
  const run = tail.then(async () => {
    depth += 1;
    try {
      return await withLockRetry(task);
    } finally {
      depth -= 1;
    }
  });
  tail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function closeLeakedConnection(): Promise<void> {
  const previous = globalDb.__appsurveySqlite;
  globalDb.__appsurveySqlite = undefined;
  if (!previous) return;
  try {
    await previous.closeAsync();
  } catch {
    /* A reloaded bundle may already have dropped the native connection. */
  }
}

function serializeDatabase(db: SQLite.SQLiteDatabase): SQLite.SQLiteDatabase {
  return new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      if (!QUEUED_METHODS.has(String(prop))) return value.bind(target);
      return (...args: unknown[]) =>
        enqueue(() => Reflect.apply(value, target, args) as Promise<unknown>);
    },
  });
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let openedName: string | null = null;
let seedPromise: Promise<void> | null = null;

type SeedHook = (db: SQLite.SQLiteDatabase) => Promise<void>;
let seedHook: SeedHook | null = null;

/** Registered by the CLMRS pack module so opening the database does not import it. */
export function setDatabaseSeed(hook: SeedHook): void {
  seedHook = hook;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  const demo = await isDemoModeEnabled();
  const name = demo ? demoDbName() : opsDbName();

  if (dbPromise && openedName === name) {
    const db = await dbPromise;
    await runSeed(db);
    return db;
  }

  if (dbPromise && openedName !== name) {
    try {
      const old = await dbPromise;
      await old.closeAsync();
    } catch {
      /* ignore */
    }
    dbPromise = null;
    seedPromise = null;
  }

  openedName = name;
  const opening = (async () => {
    await closeLeakedConnection();
    const raw = await SQLite.openDatabaseAsync(name);
    globalDb.__appsurveySqlite = raw;
    const db = serializeDatabase(raw);
    try {
      await db.execAsync('PRAGMA busy_timeout = 5000');
    } catch {
      /* The next queued statement retries instead of leaving the file locked. */
    }
    await runMigrations(db);
    return db;
  })();
  dbPromise = opening;
  opening.catch(() => {
    if (dbPromise === opening) {
      dbPromise = null;
      openedName = null;
      seedPromise = null;
    }
    const leaked = globalDb.__appsurveySqlite;
    globalDb.__appsurveySqlite = undefined;
    void leaked?.closeAsync().catch(() => undefined);
  });
  const db = await opening;
  await runSeed(db);
  return db;
}

async function runSeed(db: SQLite.SQLiteDatabase): Promise<void> {
  if (!seedHook) return;
  if (!seedPromise) {
    const hook = seedHook;
    seedPromise = hook(db).catch((error: unknown) => {
      seedPromise = null;
      throw error;
    });
  }
  await seedPromise;
}

/** Force reopen after toggling demo mode */
export async function resetDatabaseConnection(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      await db.closeAsync();
    } catch {
      /* ignore */
    }
  }
  dbPromise = null;
  openedName = null;
  seedPromise = null;
}

export function newId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}
