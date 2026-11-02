/**
 * Local data encryption at rest.
 *
 * DATABASES (scpb_local.db, scpb_demo.db) — SQLCipher, enabled.
 * - `expo-sqlite` is built with `useSQLCipher: true` (app.json). This needs a native
 *   build (EAS or `expo prebuild`); Expo Go and older APKs have no SQLCipher, and then
 *   the app keeps opening the plain file (status `sqlcipher_unavailable`, see dbEncryption.ts).
 * - Key: 32 random bytes (SQLite CSPRNG, OS-seeded) as 64 hex chars, generated on first
 *   launch, stored only in expo-secure-store (Android Keystore-wrapped, iOS Keychain
 *   AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY) under `scpb_sqlcipher_key_v1`. Never in code or in
 *   the database. Applied as a raw key (`PRAGMA key = "x'…'"`) right after open, so no PBKDF2.
 * - Upgrade from a plain database: `sqlcipher_export` into `<name>.cipher-tmp`, verify
 *   (quick_check, user_version, row count of every table including sync_outbox), then
 *   rename plain → `.plain-bak`, tmp → `<name>`, delete the backup. Any failure keeps the
 *   plain file and retries on the next open; a crash at any step is repaired on the next
 *   launch. Deleting the plain backup is a normal unlink: flash storage gives no secure
 *   erase, so old plain pages can survive until the filesystem reuses them (FBE still applies).
 * - Key lost (keystore reset, BadPadding after reinstall): the unreadable database is renamed
 *   to `<name>.unreadable-<ms>` (kept, never deleted) and a new empty one is created; its
 *   unsent rows are unrecoverable without the old key.
 *
 * THREAT MODEL
 * Already in place without SQLCipher: Android app sandbox (other apps cannot read
 * filesDir), file-based encryption of the data partition (mandatory on Android 10+), and
 * `allowBackup: false` (no adb / cloud backup or device-to-device copy).
 * SQLCipher adds protection when the file is read outside the app's own process:
 * - filesystem extraction of a powered-on, already-unlocked phone (forensic tools, a root
 *   exploit that dumps files) — FBE keys are then in memory and do not help;
 * - phones with no lock screen, where FBE credential storage is not tied to a secret;
 * - stray copies of the file (debug `run-as` pulls, support dumps, future backup bugs).
 * It does NOT protect against: code running as the app (root that drives the Keystore as
 * our UID, a tampered build), anyone using the unlocked, logged-in app, or memory dumps.
 *
 * ATTACHMENTS (filesDir/attachments/<account>/<uuid>.<ext>) — NOT encrypted by the app.
 * Consent signatures (SVG strokes), consent photos (`restricted_protection`) and session
 * photos stay plain on disk; only the sandbox and FBE protect them. Reasons:
 * - No AES primitive in the dependency set (no expo-crypto / quick-crypto). AES in JS on
 *   Hermes is too slow for multi-MB photos on field phones and would be hand-rolled crypto.
 * - Every consumer needs plaintext at a file path: `<Image source={{ uri }}>`
 *   (seance-detail), `FileSystem.uploadAsync` (syncService) streams from a path, and
 *   `FileSystem.downloadAsync` (syncPull) writes plaintext before it could be encrypted.
 *   Decrypting into cache files would put plaintext back on disk; data URIs of full photos
 *   are too heavy in memory.
 * - What identifies a file lives in the encrypted database: names are random UUIDs, and
 *   entity_type / entity_id (which planter, household or child), caption and access level
 *   are only in the `attachments` table. A file dump yields unlabelled images and strokes.
 * Residual risk accepted for now: in the three scenarios above, faces in consent photos and
 * signature shapes can be read. Also plain: ImagePicker copies and `consent-signature-*.svg`
 * left in cacheDirectory after saving.
 * Path to close it: add a native AES-GCM module, write `<uuid>.<ext>.enc` with a second
 * secure-store key, decrypt into memory for display, decrypt to a cache file deleted in a
 * `finally` around upload, encrypt right after download, track it with an `enc_version`
 * column plus a one-off migration of existing files, and delete picker cache copies on save.
 */

export const DB_ENCRYPTION_STATUS = 'sqlcipher' as const;

export const DB_ENCRYPTION_PLAN = {
  keyStorage: 'expo-secure-store (Android Keystore / iOS Keychain), key scpb_sqlcipher_key_v1',
  neverInCode: true,
  neverInDb: true,
  photosCoveredBySqliteEncryption: false,
};
