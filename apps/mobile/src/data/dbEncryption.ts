/**
 * SQLCipher bootstrap for the local databases, kept free of Expo imports so the
 * migration and crash-recovery rules can run under `node --test`.
 *
 * Files next to `<name>` while a plain database is being encrypted:
 * - `<name>.cipher-tmp`  encrypted copy being written; only trusted once `<name>.plain-bak` exists
 * - `<name>.plain-bak`   the plain original, set aside during the swap, deleted afterwards
 * - `<name>.unreadable-<ts>`  a database no key opens (key lost); kept, never deleted
 */

export const DB_KEY_HEX_LENGTH = 64;

/** Minimal connection surface used here; the Expo host adapts SQLiteDatabase to it. */
export interface CipherConnection {
  exec(sql: string): Promise<void>;
  getFirst<T>(sql: string): Promise<T | null>;
  getAll<T>(sql: string): Promise<T[]>;
  close(): Promise<void>;
}

export interface CipherHost {
  /** A fresh, unkeyed connection (never a cached one). `:memory:` must be supported. */
  open(name: string): Promise<CipherConnection>;
  /** Absolute filesystem path of a database name, as SQLite expects it in ATTACH. */
  absolutePath(name: string): string;
  exists(name: string): Promise<boolean>;
  /** Moves the database file and its -wal / -shm / -journal sidecars. */
  move(from: string, to: string): Promise<void>;
  /** Deletes the database file and its sidecars; missing files are not an error. */
  remove(name: string): Promise<void>;
  now(): number;
  warn(message: string, error?: unknown): void;
}

export interface DatabaseKeyStore {
  /** Resolves null only when no key is stored; any storage failure must reject. */
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
}

export type DatabaseEncryptionStatus =
  | { mode: 'encrypted'; detail: 'created' | 'existing' | 'migrated' | 'recreated_after_key_loss'; quarantinedAs?: string }
  | { mode: 'plain'; detail: 'sqlcipher_unavailable' }
  | { mode: 'plain'; detail: 'migration_failed'; error: string };

export type PreparedDatabase = {
  /** Hex key to apply with keyPragma() on the main connection, or null to open it plain. */
  keyHex: string | null;
  status: DatabaseEncryptionStatus;
};

export function tmpNameFor(name: string): string {
  return `${name}.cipher-tmp`;
}

export function backupNameFor(name: string): string {
  return `${name}.plain-bak`;
}

export function isValidKeyHex(value: string): boolean {
  return new RegExp(`^[0-9a-f]{${DB_KEY_HEX_LENGTH}}$`).test(value);
}

/** Raw-key form: SQLCipher skips PBKDF2 since the key is already 256 random bits. */
export function keyPragma(keyHex: string, schema?: string): string {
  assertKey(keyHex);
  const target = schema ? `${schema}.` : '';
  return `PRAGMA ${target}key = "x'${keyHex}'"`;
}

function assertKey(keyHex: string): void {
  if (!isValidKeyHex(keyHex)) throw new Error('Clé de chiffrement locale invalide.');
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function closeQuietly(conn: CipherConnection | null): Promise<void> {
  try {
    await conn?.close();
  } catch {
    /* The connection is unusable anyway. */
  }
}

export async function sqlcipherVersion(conn: CipherConnection): Promise<string | null> {
  try {
    const row = await conn.getFirst<{ cipher_version?: string }>('PRAGMA cipher_version');
    return row?.cipher_version ? String(row.cipher_version) : null;
  } catch {
    return null;
  }
}

/** 32 bytes from SQLite's CSPRNG (seeded from the OS), so no JS crypto polyfill is needed. */
export async function randomKeyHex(conn: CipherConnection): Promise<string> {
  const row = await conn.getFirst<{ k: string }>('SELECT lower(hex(randomblob(32))) AS k');
  const key = String(row?.k ?? '');
  assertKey(key);
  return key;
}

/**
 * Returns the stored key, or generates and persists one. The new key is only
 * returned after it reads back identically, so nothing is ever encrypted with a
 * key that would be gone on the next launch.
 */
export async function loadOrCreateKey(
  store: DatabaseKeyStore,
  generate: () => Promise<string>
): Promise<{ keyHex: string; created: boolean }> {
  const existing = await store.get();
  if (existing != null) {
    assertKey(existing);
    return { keyHex: existing, created: false };
  }
  const fresh = await generate();
  assertKey(fresh);
  await store.set(fresh);
  const stored = await store.get();
  if (stored !== fresh) {
    throw new Error('La clé de chiffrement locale n’a pas pu être enregistrée.');
  }
  return { keyHex: fresh, created: true };
}

type Readability = 'encrypted' | 'plain' | 'unreadable';

/** SQLITE_NOTADB is the only answer meaning "wrong key / not this format". */
export function isNotADatabaseError(error: unknown): boolean {
  return /not a database|file is encrypted/i.test(message(error));
}

async function canRead(conn: CipherConnection): Promise<boolean> {
  try {
    await conn.getFirst('SELECT count(*) AS n FROM sqlite_master');
    return true;
  } catch (error) {
    // Locked, I/O or busy errors must not be read as "wrong key", or a good database
    // would be quarantined; let them fail this open so the next one retries.
    if (isNotADatabaseError(error)) return false;
    throw error;
  }
}

async function classify(host: CipherHost, name: string, keyHex: string): Promise<Readability> {
  let conn: CipherConnection | null = await host.open(name);
  try {
    await conn.exec(keyPragma(keyHex));
    if (await canRead(conn)) return 'encrypted';
  } finally {
    await closeQuietly(conn);
  }
  conn = await host.open(name);
  try {
    return (await canRead(conn)) ? 'plain' : 'unreadable';
  } finally {
    await closeQuietly(conn);
  }
}

type Snapshot = { userVersion: number; counts: Record<string, number> };

async function snapshot(conn: CipherConnection, schema = 'main'): Promise<Snapshot> {
  const version = await conn.getFirst<{ user_version: number }>(`PRAGMA ${schema}.user_version`);
  const tables = await conn.getAll<{ name: string }>(
    `SELECT name FROM ${schema}.sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  );
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const quoted = `"${t.name.replace(/"/g, '""')}"`;
    const row = await conn.getFirst<{ n: number }>(`SELECT count(*) AS n FROM ${schema}.${quoted}`);
    counts[t.name] = Number(row?.n ?? 0);
  }
  return { userVersion: Number(version?.user_version ?? 0), counts };
}

function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  if (a.userVersion !== b.userVersion) return false;
  const keys = Object.keys(a.counts);
  if (keys.length !== Object.keys(b.counts).length) return false;
  return keys.every((k) => a.counts[k] === b.counts[k]);
}

/** Writes an encrypted copy to `<name>.cipher-tmp` and checks it against the plain source. */
async function exportEncryptedCopy(host: CipherHost, name: string, keyHex: string): Promise<void> {
  const tmp = tmpNameFor(name);
  await host.remove(tmp);

  let expected: Snapshot;
  const src = await host.open(name);
  try {
    // Fold any WAL content into the main file so the plain copy set aside later is complete.
    await src.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    expected = await snapshot(src);
    await src.exec(
      `ATTACH DATABASE ${sqlString(host.absolutePath(tmp))} AS cipher_export KEY "x'${keyHex}'"`
    );
    try {
      await src.exec(`SELECT sqlcipher_export('cipher_export')`);
      // sqlcipher_export copies schema and rows, not the header field migrations rely on.
      await src.exec(`PRAGMA cipher_export.user_version = ${expected.userVersion}`);
    } finally {
      await src.exec('DETACH DATABASE cipher_export');
    }
  } finally {
    await closeQuietly(src);
  }

  const dst = await host.open(tmp);
  try {
    await dst.exec(keyPragma(keyHex));
    const check = await dst.getFirst<{ quick_check: string }>('PRAGMA quick_check');
    if (check?.quick_check !== 'ok') {
      throw new Error(`Copie chiffrée corrompue (${check?.quick_check ?? 'inconnu'}).`);
    }
    const actual = await snapshot(dst);
    if (!sameSnapshot(expected, actual)) {
      throw new Error('La copie chiffrée ne contient pas les mêmes lignes que la base d’origine.');
    }
  } finally {
    await closeQuietly(dst);
  }
}

/** plain → .plain-bak, .cipher-tmp → plain name, then drop the backup. */
async function swapInEncryptedCopy(host: CipherHost, name: string): Promise<void> {
  const tmp = tmpNameFor(name);
  const bak = backupNameFor(name);
  await host.remove(bak);
  await host.move(name, bak);
  try {
    await host.move(tmp, name);
  } catch (error) {
    await host.move(bak, name);
    throw error;
  }
  try {
    await host.remove(bak);
  } catch (error) {
    host.warn('[dbEncryption] Plain backup not deleted yet; retried next launch.', error);
  }
}

/** Puts the files back into a consistent state after a crash in a previous run. */
async function recoverInterruptedSwap(host: CipherHost, name: string): Promise<void> {
  const tmp = tmpNameFor(name);
  const bak = backupNameFor(name);
  if (!(await host.exists(name)) && (await host.exists(bak))) {
    // The backup is only created after the encrypted copy passed verification.
    if (await host.exists(tmp)) await host.move(tmp, name);
    else await host.move(bak, name);
  }
  // A temp copy left over without a pending swap is a partial export.
  if (await host.exists(tmp)) await host.remove(tmp);
}

/**
 * Must run before the main connection opens `name`. Never deletes the only copy
 * of a database: plain data stays until its encrypted copy has been verified,
 * and a database no key opens is renamed aside.
 */
export async function prepareEncryptedDatabase(
  host: CipherHost,
  name: string,
  store: DatabaseKeyStore
): Promise<PreparedDatabase> {
  const probe = await host.open(':memory:');
  let keyHex: string;
  let keyCreated: boolean;
  try {
    if (!(await sqlcipherVersion(probe))) {
      // Web, Expo Go or a native build made before useSQLCipher: PRAGMA key would be ignored.
      return { keyHex: null, status: { mode: 'plain', detail: 'sqlcipher_unavailable' } };
    }
    ({ keyHex, created: keyCreated } = await loadOrCreateKey(store, () => randomKeyHex(probe)));
  } finally {
    await closeQuietly(probe);
  }

  await recoverInterruptedSwap(host, name);

  if (!(await host.exists(name))) {
    return { keyHex, status: { mode: 'encrypted', detail: 'created' } };
  }

  const state = await classify(host, name, keyHex);
  if (state === 'encrypted') {
    const bak = backupNameFor(name);
    if (await host.exists(bak)) await host.remove(bak);
    return { keyHex, status: { mode: 'encrypted', detail: 'existing' } };
  }

  if (state === 'plain') {
    try {
      await exportEncryptedCopy(host, name, keyHex);
      await swapInEncryptedCopy(host, name);
      return { keyHex, status: { mode: 'encrypted', detail: 'migrated' } };
    } catch (error) {
      host.warn('[dbEncryption] Migration failed; keeping the plain database for now.', error);
      if (!(await host.exists(name))) {
        // Mid-swap with the plain file set aside: opening now would create an empty
        // database over it. Fail this open; recoverInterruptedSwap fixes it next time.
        throw error;
      }
      try {
        await host.remove(tmpNameFor(name));
      } catch {
        /* recoverInterruptedSwap drops it next launch. */
      }
      return { keyHex: null, status: { mode: 'plain', detail: 'migration_failed', error: message(error) } };
    }
  }

  // Encrypted with a key the store no longer has (keystore reset) or damaged: unrecoverable
  // here, but keep the file for forensics instead of blocking every launch.
  const quarantinedAs = `${name}.unreadable-${host.now()}`;
  host.warn(
    `[dbEncryption] ${name} cannot be opened (${keyCreated ? 'key was missing' : 'wrong key or corrupt'}); moved to ${quarantinedAs}.`
  );
  await host.move(name, quarantinedAs);
  return { keyHex, status: { mode: 'encrypted', detail: 'recreated_after_key_loss', quarantinedAs } };
}
