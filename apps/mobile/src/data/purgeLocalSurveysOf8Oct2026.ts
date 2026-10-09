import * as SecureStore from 'expo-secure-store';
import { getDatabase } from './db';

/** Local midnight bounds for 8 Oct 2026, Africa/Lagos (UTC+1). ISO strings compare lexicographically. */
const FROM = '2026-10-07T23:00:00.000Z';
const TO = '2026-10-08T23:00:00.000Z';
const MARKER = 'purge-surveys-20261008';

const SURVEY_ENTITY_TYPES = [
  'survey_response',
  'survey_consent',
  'attachment',
  'detection_result',
  'remediation_case',
] as const;

/**
 * One-shot removal of survey artifacts collected on 8 Oct 2026.
 * The phone database is not reachable from the PC; this runs on the device.
 * Planteurs, sites and questionnaire definitions are left in place.
 */
export async function purgeLocalSurveysOf8Oct2026(accountId: string): Promise<void> {
  const done = await SecureStore.getItemAsync(MARKER);
  if (done === '1') return;

  const db = await getDatabase();
  const day = [FROM, TO, FROM, TO];
  const inResponses = `SELECT id FROM survey_responses
    WHERE account_id = ? AND ((created_at >= ? AND created_at < ?) OR (updated_at >= ? AND updated_at < ?))`;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM detection_signals
       WHERE run_id IN (
         SELECT id FROM detection_runs
         WHERE account_id = ? AND survey_response_id IN (${inResponses})
       )`,
      [accountId, accountId, ...day]
    );
    await db.runAsync(
      `DELETE FROM detection_runs
       WHERE account_id = ? AND (
         survey_response_id IN (${inResponses})
         OR (created_at >= ? AND created_at < ?)
       )`,
      [accountId, accountId, ...day, FROM, TO]
    );
    await db.runAsync(
      `DELETE FROM remediation_case_events
       WHERE case_id IN (
         SELECT id FROM remediation_cases
         WHERE account_id = ? AND (
           survey_response_id IN (${inResponses})
           OR (created_at >= ? AND created_at < ?)
           OR (updated_at >= ? AND updated_at < ?)
         )
       )`,
      [accountId, accountId, ...day, FROM, TO, FROM, TO]
    );
    await db.runAsync(
      `DELETE FROM remediation_cases
       WHERE account_id = ? AND (
         survey_response_id IN (${inResponses})
         OR (created_at >= ? AND created_at < ?)
         OR (updated_at >= ? AND updated_at < ?)
       )`,
      [accountId, accountId, ...day, FROM, TO, FROM, TO]
    );
    await db.runAsync(
      `DELETE FROM attachments
       WHERE account_id = ? AND (
         entity_id IN (${inResponses})
         OR entity_id IN (
           SELECT id FROM survey_consents
           WHERE account_id = ? AND ((created_at >= ? AND created_at < ?) OR (updated_at >= ? AND updated_at < ?))
         )
         OR (
           added_at >= ? AND added_at < ?
           AND entity_type IN ('consent_signature', 'consent_photo')
         )
       )`,
      [accountId, accountId, ...day, accountId, ...day, FROM, TO]
    );
    await db.runAsync(
      `DELETE FROM sync_outbox
       WHERE account_id = ?
         AND entity_type IN (${SURVEY_ENTITY_TYPES.map(() => '?').join(', ')})
         AND ((created_at >= ? AND created_at < ?) OR (updated_at >= ? AND updated_at < ?))`,
      [accountId, ...SURVEY_ENTITY_TYPES, ...day]
    );
    await db.runAsync(
      `DELETE FROM sync_conflicts
       WHERE account_id = ?
         AND entity_type IN (${SURVEY_ENTITY_TYPES.map(() => '?').join(', ')})
         AND ((created_at >= ? AND created_at < ?) OR (updated_at >= ? AND updated_at < ?))`,
      [accountId, ...SURVEY_ENTITY_TYPES, ...day]
    );
    await db.runAsync(
      `DELETE FROM survey_consents
       WHERE account_id = ? AND ((created_at >= ? AND created_at < ?) OR (updated_at >= ? AND updated_at < ?))`,
      [accountId, ...day]
    );
    await db.runAsync(
      `DELETE FROM survey_responses
       WHERE account_id = ? AND ((created_at >= ? AND created_at < ?) OR (updated_at >= ? AND updated_at < ?))`,
      [accountId, ...day]
    );
  });

  await SecureStore.setItemAsync(MARKER, '1');
}
