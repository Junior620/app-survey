import * as SQLite from 'expo-sqlite';
import { keyPragma } from './dbEncryption';
import { prepareDatabaseFile } from './dbEncryptionHost';
import { demoDbName, isDemoModeEnabled, opsDbName } from './demoMode';
import { runMigrations } from './migrations';
import { createSerializedDatabase, runTransaction as runQueuedTransaction } from './sqliteQueue';

/** Serialised connection: transactions must go through `runTransaction`. */
export type AppDatabase = Omit<
  SQLite.SQLiteDatabase,
  'withTransactionAsync' | 'withExclusiveTransactionAsync'
>;

/** Handle passed to a `runTransaction` callback; only it may run statements inside the transaction. */
export type DbTx = Pick<SQLite.SQLiteDatabase, 'runAsync' | 'getFirstAsync' | 'getAllAsync' | 'execAsync'>;

/** Run `task` in one transaction; every caller outside it waits until COMMIT/ROLLBACK. */
export function runTransaction<T>(db: AppDatabase | DbTx, task: (tx: DbTx) => Promise<T>): Promise<T> {
  return runQueuedTransaction<DbTx, T>(db, task);
}

type ClosableDb = { closeAsync: () => Promise<void> };
const globalDb = globalThis as typeof globalThis & { __appsurveySqlite?: ClosableDb };

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

let dbPromise: Promise<AppDatabase> | null = null;
let openedName: string | null = null;
let seedPromise: Promise<void> | null = null;

type SeedHook = (db: AppDatabase) => Promise<void>;
let seedHook: SeedHook | null = null;

/** Registered by the CLMRS pack module so opening the database does not import it. */
export function setDatabaseSeed(hook: SeedHook): void {
  seedHook = hook;
}

export async function getDatabase(): Promise<AppDatabase> {
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
    const prepared = await prepareDatabaseFile(name);
    const raw = await SQLite.openDatabaseAsync(name);
    globalDb.__appsurveySqlite = raw;
    if (prepared.keyHex) {
      // Must be the first statement on the connection, before anything reads the file.
      await raw.execAsync(keyPragma(prepared.keyHex));
      await raw.getFirstAsync('SELECT count(*) AS n FROM sqlite_master');
    }
    const db: AppDatabase = createSerializedDatabase(raw);
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

async function runSeed(db: AppDatabase): Promise<void> {
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

type WebCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

/** UUID v4 from the platform CSPRNG when available; Math.random only as a last resort. */
export function newId(): string {
  const cryptoApi = (globalThis as { crypto?: WebCrypto }).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = (Math.random() * 256) | 0;
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
