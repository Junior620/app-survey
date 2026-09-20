import * as SQLite from 'expo-sqlite';
import { demoDbName, isDemoModeEnabled, opsDbName } from './demoMode';
import { runMigrations } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let openedName: string | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  const demo = await isDemoModeEnabled();
  const name = demo ? demoDbName() : opsDbName();

  if (dbPromise && openedName === name) {
    return dbPromise;
  }

  if (dbPromise && openedName !== name) {
    try {
      const old = await dbPromise;
      await old.closeAsync();
    } catch {
      /* ignore */
    }
    dbPromise = null;
  }

  openedName = name;
  dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(name);
    await runMigrations(db);
    try {
      const { ensureClmrsSeeds } = await import('../clmrs/persistence/rulePacksRepository');
      await ensureClmrsSeeds(db);
    } catch {
      /* seed best-effort — tables may be mid-migrate */
    }
    return db;
  })();

  return dbPromise;
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
