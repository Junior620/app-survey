# Encryption at rest: device test plan

What changed and why: `src/data/encryptionNotes.ts`. Logic: `src/data/dbEncryption.ts`
(unit tests in `dbEncryption.test.ts` cover the crash and failure paths below).

## Setup

- **New build** (SQLCipher only exists in a native build made after this change):
  `npm run build:apk` (EAS preview), or locally `npx expo prebuild --platform android --clean`
  then a release build. The local `android/` folder is generated and currently lacks
  `expo.sqlite.useSQLCipher=true`; rebuild it, don't reuse it as is. Expo Go cannot test this.
- **Old build**: `scpb-survey-release.apk` (versionCode 5, plain SQLite), signed with the same
  release key so `adb install -r` keeps its data.
- **File checks** need access to `/data/data/com.scpb.survey`. Release APKs aren't debuggable,
  so use an emulator with a *Google APIs* image (not *Google Play*) and `adb root`.
  On a physical phone, use only the logcat checks.
- Log filter: `adb logcat -s ReactNativeJS | grep dbEncryption`. Each database open prints
  `[dbEncryption] <name>: <mode> (<detail>)`. The key itself is never logged.
- Header check (16 bytes): `adb shell "head -c 16 /data/data/com.scpb.survey/files/SQLite/scpb_local.db" | xxd`
  — plain prints `SQLite format 3.`; encrypted prints random bytes.

## 1. Fresh install

1. `adb uninstall com.scpb.survey`, then install the new APK and log in online.
2. Expect logcat `scpb_local.db: encrypted (created)`. The header is random.
3. Create a planter and a survey with a consent signature and photo. Force-stop, relaunch.
   Expect `encrypted (existing)`, with all data and photos still shown (the key persisted).
4. Sync online. The outbox empties, rows show up in Supabase, and the photo and signature
   objects are in the attachments bucket.
5. Demo mode on: expect `scpb_demo.db: encrypted (created)`. Demo mode off: `scpb_local.db: encrypted (existing)`.

## 2. Upgrade from a plain database with pending outbox rows (main case)

1. Uninstall, install the **old** APK, log in online, then switch to airplane mode.
2. Create 2 planters, 1 full survey with household / child roster, consent signature +
   consent photo, and 1 training session photo. Note the pending count on the Sync screen (N).
3. Check that the header says `SQLite format 3`.
4. Still offline: `adb install -r <new>.apk`. Launch.
5. Expect `scpb_local.db: encrypted (migrated)`, a random header, and no
   `scpb_local.db.cipher-tmp` / `.plain-bak` left in `files/SQLite/`
   (`adb shell ls -la /data/data/com.scpb.survey/files/SQLite/`).
6. The Sync screen still shows **N** pending. Planters, survey answers, roster and photos show as before.
7. Force-stop and relaunch: expect `encrypted (existing)`.
8. Go online and sync. The outbox drains to 0. Supabase has every row and both storage objects;
   open the photo from the admin side to confirm the uploaded bytes are a valid image.
9. Log in with the same account on a second fresh install. The pull downloads the
   attachments, and they show up (the download path is unchanged).

## 3. Migration failure keeps the plain database (emulator)

1. Repeat steps 2.1–2.3. Then fill the disk so less free space remains than the DB size:
   `adb shell "dd if=/dev/zero of=/sdcard/fill bs=1M count=<free MB − 1>"`.
2. Install the new APK and launch. Expect the warning `Migration failed; keeping the plain
   database`, then `plain (migration_failed)`. The header is still `SQLite format 3`, the
   app works, and N rows are still pending. No `.cipher-tmp` is left.
3. `adb shell rm /sdcard/fill`, then force-stop and relaunch. Expect `encrypted (migrated)` with N pending.

## 4. Interrupted swap (emulator, optional; unit-tested)

Simulate a crash between the two renames. Then force-stop, and on a copy of an old plain DB:
`cd files/SQLite; mv scpb_local.db scpb_local.db.plain-bak`. Next, drop in a
`scpb_local.db.cipher-tmp` taken from an encrypted run of the same data (this step is
optional; without it, the backup must be restored). Launch: the DB is back under its name
and encrypted (or migrated again), with all rows present and no leftover files.

## 5. Key loss (emulator, destructive)

1. With an encrypted DB, force-stop. Delete the secure store entry:
   `adb shell rm /data/data/com.scpb.survey/shared_prefs/SecureStore.xml`.
2. Launch. Expect `encrypted (recreated_after_key_loss)`, and
   `scpb_local.db.unreadable-<ms>` kept next to a new empty DB. The app is usable (log in again).
   This is the documented, accepted loss of unsent data without the key.

## 6. Reinstall / backup

- Uninstall, then reinstall. Everything is gone, including the key and the DB (`allowBackup: false`),
  and you get `encrypted (created)`.
- `adb backup com.scpb.survey` produces no app data.

## 7. Non-regression

- With 2,000+ planters, cold-start time stays within ~10% of the old build (raw key, no PBKDF2).
  The first launch after the upgrade also pays the one-time export.
- Background or auto sync after a reboot, before the first unlock: on Android the app
  can't run before the first unlock anyway. Check after the first unlock with the screen locked.

Pass = every scenario above, plus: pending counts are never lower after the upgrade,
and no `.cipher-tmp` / `.plain-bak` survives a successful launch.
