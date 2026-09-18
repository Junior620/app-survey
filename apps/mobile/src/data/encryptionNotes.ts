/**
 * Encryption readiness notes (Phase Backend / Hardening):
 * - Do NOT store DB encryption key in source or inside the database.
 * - Prefer SecureStore / Keystore / Keychain for the key material.
 * - expo-sqlite SQLCipher support must be confirmed before enabling.
 * - File attachments are OUTSIDE SQLite — encrypt separately if required.
 * Until then, demo DB holds only fictitious non-sensitive samples.
 */

export const DB_ENCRYPTION_STATUS = 'not_enabled' as const;

export const DB_ENCRYPTION_PLAN = {
  keyStorage: 'expo-secure-store + platform keystore',
  neverInCode: true,
  neverInDb: true,
  photosCoveredBySqliteEncryption: false,
};
