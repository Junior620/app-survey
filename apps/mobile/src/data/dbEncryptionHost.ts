import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { databaseKeyStore } from '../services/secureStore';
import {
  prepareEncryptedDatabase,
  type CipherConnection,
  type CipherHost,
  type DatabaseEncryptionStatus,
  type PreparedDatabase,
} from './dbEncryption';

const SIDECARS = ['-wal', '-shm', '-journal'];

function databaseDirectory(): string {
  const dir = SQLite.defaultDatabaseDirectory as string | null | undefined;
  if (!dir) throw new Error('Répertoire SQLite indisponible sur cet appareil.');
  return String(dir).replace(/\/+$/, '');
}

function absolutePath(name: string): string {
  return `${databaseDirectory()}/${name}`;
}

function fileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${encodeURI(path)}`;
}

async function fileExists(path: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(fileUri(path));
  return info.exists;
}

function adapt(db: SQLite.SQLiteDatabase): CipherConnection {
  return {
    exec: (sql) => db.execAsync(sql),
    getFirst: <T>(sql: string) => db.getFirstAsync<T>(sql),
    getAll: <T>(sql: string) => db.getAllAsync<T>(sql),
    close: () => db.closeAsync(),
  };
}

const expoCipherHost: CipherHost = {
  async open(name) {
    // A private connection: the native cache would otherwise hand back the app's keyed one.
    return adapt(await SQLite.openDatabaseAsync(name, { useNewConnection: true }));
  },
  absolutePath,
  exists: (name) => fileExists(absolutePath(name)),
  async move(from, to) {
    const src = absolutePath(from);
    const dest = absolutePath(to);
    if (await fileExists(dest)) throw new Error(`${to} existe déjà.`);
    await FileSystem.moveAsync({ from: fileUri(src), to: fileUri(dest) });
    for (const suffix of SIDECARS) {
      // A stale -wal next to the destination would be replayed into the moved file.
      await FileSystem.deleteAsync(fileUri(dest + suffix), { idempotent: true });
      if (await fileExists(src + suffix)) {
        await FileSystem.moveAsync({ from: fileUri(src + suffix), to: fileUri(dest + suffix) });
      }
    }
  },
  async remove(name) {
    const path = absolutePath(name);
    for (const suffix of ['', ...SIDECARS]) {
      await FileSystem.deleteAsync(fileUri(path + suffix), { idempotent: true });
    }
  },
  now: () => Date.now(),
  warn: (msg, error) => console.warn(msg, error ?? ''),
};

const lastStatus = new Map<string, DatabaseEncryptionStatus>();

/** Encrypts / recovers `name` on disk and returns the key the main connection must apply. */
export async function prepareDatabaseFile(name: string): Promise<PreparedDatabase> {
  const prepared = await prepareEncryptedDatabase(expoCipherHost, name, databaseKeyStore);
  lastStatus.set(name, prepared.status);
  // Visible in `adb logcat` on release builds; the device test plan relies on it.
  console.info(`[dbEncryption] ${name}: ${prepared.status.mode} (${prepared.status.detail})`);
  return prepared;
}

/** For diagnostics: what the last open of each database found and did. */
export function getDatabaseEncryptionStatus(name: string): DatabaseEncryptionStatus | null {
  return lastStatus.get(name) ?? null;
}
