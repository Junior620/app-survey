import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';
import {
  canStartSurvey,
  CONSENT_POLICY,
  EMPTY_CONSENT,
  resolveConsentStep,
  type ConsentSnapshot,
  type ConsentStep,
} from '../../survey/consentPolicy';
import {
  normalizeCameroonMobile,
  type OtherHouseholdPhoneStatus,
  type RespondentPhoneStatus,
} from '../../survey/phoneConsent';

export type SurveyConsentStatus = 'in_progress' | 'accepted' | 'declined';

export type SurveyConsentRecord = {
  id: string;
  accountId: string;
  planteurId: string;
  questionnaireId: string;
  versionNumber: string;
  definitionId: string;
  consentVersion: string;
  language: string;
  status: SurveyConsentStatus;
  presentedConfirmed: boolean;
  agentId: string;
  agentNameSnapshot: string;
  respondentName: string | null;
  respondentPhoneStatus: RespondentPhoneStatus | null;
  respondentPhone: string | null;
  otherHouseholdPhoneStatus: OtherHouseholdPhoneStatus | null;
  otherHouseholdPhone: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  transferStatus: string;
  revision: number;
};

export type ConsentListRow = {
  questionnaireId: string;
  status: SurveyConsentStatus;
  snapshot: ConsentSnapshot;
  ready: boolean;
};

type ConsentRow = {
  id: string;
  account_id: string;
  planteur_id: string;
  questionnaire_id: string;
  version_number: string;
  definition_id: string;
  consent_version: string;
  language: string;
  status: string;
  presented_confirmed: number;
  agent_id: string;
  agent_name_snapshot: string;
  respondent_name: string | null;
  respondent_phone_status: string | null;
  respondent_phone: string | null;
  other_household_phone_status: string | null;
  other_household_phone: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  transfer_status: string;
  revision: number;
};

function asRespondentStatus(value: string | null): RespondentPhoneStatus | null {
  if (value === 'provided' || value === 'no_phone' || value === 'refused') return value;
  return null;
}

function asOtherStatus(value: string | null): OtherHouseholdPhoneStatus | null {
  if (value === 'provided' || value === 'no_other_phone' || value === 'refused') return value;
  return null;
}

function mapRow(row: ConsentRow): SurveyConsentRecord {
  const status: SurveyConsentStatus =
    row.status === 'accepted' || row.status === 'declined' ? row.status : 'in_progress';
  return {
    id: row.id,
    accountId: row.account_id,
    planteurId: row.planteur_id,
    questionnaireId: row.questionnaire_id,
    versionNumber: row.version_number,
    definitionId: row.definition_id,
    consentVersion: row.consent_version,
    language: row.language,
    status,
    presentedConfirmed: row.presented_confirmed === 1,
    agentId: row.agent_id,
    agentNameSnapshot: row.agent_name_snapshot,
    respondentName: row.respondent_name,
    respondentPhoneStatus: asRespondentStatus(row.respondent_phone_status),
    respondentPhone: row.respondent_phone,
    otherHouseholdPhoneStatus: asOtherStatus(row.other_household_phone_status),
    otherHouseholdPhone: row.other_household_phone,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    transferStatus: row.transfer_status,
    revision: row.revision,
  };
}

const SELECT_COLS = `id, account_id, planteur_id, questionnaire_id, version_number, definition_id,
  consent_version, language, status, presented_confirmed, agent_id, agent_name_snapshot,
  respondent_name, respondent_phone_status, respondent_phone,
  other_household_phone_status, other_household_phone,
  decided_at, created_at, updated_at, transfer_status, revision`;

export function snapshotOf(
  record: SurveyConsentRecord | null,
  artifacts: { hasSignature: boolean; hasPhoto: boolean }
): ConsentSnapshot {
  if (!record) return { ...EMPTY_CONSENT, ...artifacts };
  return {
    presentedConfirmed: record.presentedConfirmed,
    respondentName: record.respondentName,
    status: record.status,
    respondentPhoneStatus: record.respondentPhoneStatus,
    respondentPhone: record.respondentPhone,
    otherHouseholdPhoneStatus: record.otherHouseholdPhoneStatus,
    otherHouseholdPhone: record.otherHouseholdPhone,
    hasSignature: artifacts.hasSignature,
    hasPhoto: artifacts.hasPhoto,
  };
}

export async function getConsentForQuestionnaire(
  accountId: string,
  planteurId: string,
  questionnaireId: string,
  consentVersion = CONSENT_POLICY.version
): Promise<SurveyConsentRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ConsentRow>(
    `SELECT ${SELECT_COLS} FROM survey_consents
     WHERE account_id = ? AND planteur_id = ? AND questionnaire_id = ? AND consent_version = ?`,
    [accountId, planteurId, questionnaireId, consentVersion]
  );
  return row ? mapRow(row) : null;
}

export async function listDeclinedQuestionnaireIds(
  accountId: string,
  planteurId: string,
  consentVersion = CONSENT_POLICY.version
): Promise<string[]> {
  const rows = await listConsentRows(accountId, planteurId, consentVersion);
  return rows.filter((r) => r.status === 'declined').map((r) => r.questionnaireId);
}

export async function listConsentRows(
  accountId: string,
  planteurId: string,
  consentVersion = CONSENT_POLICY.version
): Promise<ConsentListRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ConsentRow>(
    `SELECT ${SELECT_COLS} FROM survey_consents
     WHERE account_id = ? AND planteur_id = ? AND consent_version = ?`,
    [accountId, planteurId, consentVersion]
  );
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(', ');
  const attachments = await db.getAllAsync<{ entity_id: string; entity_type: string }>(
    `SELECT entity_id, entity_type FROM attachments
     WHERE account_id = ? AND entity_type IN ('consent_signature', 'consent_photo')
       AND entity_id IN (${placeholders})`,
    [accountId, ...ids]
  );
  const byId = new Map<string, { hasSignature: boolean; hasPhoto: boolean }>();
  for (const row of rows) byId.set(row.id, { hasSignature: false, hasPhoto: false });
  for (const att of attachments) {
    const flags = byId.get(att.entity_id);
    if (!flags) continue;
    if (att.entity_type === 'consent_signature') flags.hasSignature = true;
    if (att.entity_type === 'consent_photo') flags.hasPhoto = true;
  }
  return rows.map((row) => {
    const record = mapRow(row);
    const snapshot = snapshotOf(record, byId.get(row.id) ?? { hasSignature: false, hasPhoto: false });
    return {
      questionnaireId: record.questionnaireId,
      status: record.status,
      snapshot,
      ready: canStartSurvey(snapshot),
    };
  });
}

export async function consentArtifactFlags(
  accountId: string,
  consentId: string
): Promise<{ hasSignature: boolean; hasPhoto: boolean }> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ entity_type: string }>(
    `SELECT entity_type FROM attachments
     WHERE account_id = ? AND entity_id = ? AND entity_type IN ('consent_signature', 'consent_photo')`,
    [accountId, consentId]
  );
  const types = new Set(rows.map((r) => r.entity_type));
  return {
    hasSignature: types.has('consent_signature'),
    hasPhoto: types.has('consent_photo'),
  };
}

export async function consentResumeStep(
  accountId: string,
  planteurId: string,
  questionnaireId: string
): Promise<{ step: ConsentStep; record: SurveyConsentRecord | null; snapshot: ConsentSnapshot }> {
  const record = await getConsentForQuestionnaire(accountId, planteurId, questionnaireId);
  if (!record) {
    return { step: resolveConsentStep(EMPTY_CONSENT), record: null, snapshot: EMPTY_CONSENT };
  }
  const artifacts = await consentArtifactFlags(accountId, record.id);
  const snapshot = snapshotOf(record, artifacts);
  return { step: resolveConsentStep(snapshot), record, snapshot };
}

export async function hasValidAcceptedConsent(
  accountId: string,
  planteurId: string,
  questionnaireId: string
): Promise<boolean> {
  const { snapshot } = await consentResumeStep(accountId, planteurId, questionnaireId);
  return canStartSurvey(snapshot);
}

export type ConsentIdentity = {
  accountId: string;
  planteurId: string;
  questionnaireId: string;
  versionNumber: string;
  language: string;
  agentId: string;
  agentNameSnapshot: string;
};

export type ConsentPatch = {
  presentedConfirmed?: boolean;
  respondentName?: string | null;
  status?: SurveyConsentStatus;
  respondentPhoneStatus?: RespondentPhoneStatus | null;
  respondentPhone?: string | null;
  otherHouseholdPhoneStatus?: OtherHouseholdPhoneStatus | null;
  otherHouseholdPhone?: string | null;
  /** Required to turn an accepted consent into a refusal. */
  confirmDecline?: boolean;
};

function cleanedPhone(
  status: RespondentPhoneStatus | OtherHouseholdPhoneStatus | null | undefined,
  phone: string | null | undefined
): string | null {
  if (status !== 'provided') return null;
  const normalized = normalizeCameroonMobile(phone);
  if (!normalized) throw new Error('Numéro de téléphone invalide.');
  return normalized;
}

/** Insert or update the unique consent row. A declined row is never rewritten. */
export async function patchConsent(identity: ConsentIdentity, patch: ConsentPatch): Promise<SurveyConsentRecord> {
  const existing = await getConsentForQuestionnaire(
    identity.accountId,
    identity.planteurId,
    identity.questionnaireId
  );
  if (existing?.status === 'declined') return existing;
  if (
    patch.status === 'declined' &&
    existing?.status === 'accepted' &&
    !patch.confirmDecline
  ) {
    return existing;
  }

  const respondentPhone =
    patch.respondentPhoneStatus !== undefined
      ? cleanedPhone(patch.respondentPhoneStatus, patch.respondentPhone)
      : existing?.respondentPhone ?? null;
  const otherPhone =
    patch.otherHouseholdPhoneStatus !== undefined
      ? cleanedPhone(patch.otherHouseholdPhoneStatus, patch.otherHouseholdPhone)
      : existing?.otherHouseholdPhone ?? null;

  const db = await getDatabase();
  const ts = nowIso();
  const status = patch.status ?? existing?.status ?? 'in_progress';
  const decidedAt =
    status === 'accepted' || status === 'declined'
      ? existing?.status === status
        ? existing.decidedAt
        : ts
      : existing?.decidedAt ?? null;

  const nextBase = {
    versionNumber: identity.versionNumber || existing?.versionNumber || '1',
    language: identity.language,
    status,
    presentedConfirmed: patch.presentedConfirmed ?? existing?.presentedConfirmed ?? false,
    agentId: identity.agentId,
    agentNameSnapshot: identity.agentNameSnapshot,
    respondentName:
      patch.respondentName !== undefined ? patch.respondentName?.trim() || null : existing?.respondentName ?? null,
    respondentPhoneStatus:
      patch.respondentPhoneStatus !== undefined
        ? patch.respondentPhoneStatus
        : existing?.respondentPhoneStatus ?? null,
    respondentPhone,
    otherHouseholdPhoneStatus:
      patch.otherHouseholdPhoneStatus !== undefined
        ? patch.otherHouseholdPhoneStatus
        : existing?.otherHouseholdPhoneStatus ?? null,
    otherHouseholdPhone: otherPhone,
    decidedAt,
  };

  if (!existing) {
    const id = newId();
    const record: SurveyConsentRecord = {
      id,
      accountId: identity.accountId,
      planteurId: identity.planteurId,
      questionnaireId: identity.questionnaireId,
      definitionId: CONSENT_POLICY.consentDefinitionId,
      consentVersion: CONSENT_POLICY.version,
      createdAt: ts,
      updatedAt: ts,
      transferStatus: 'pending',
      revision: 1,
      ...nextBase,
    };
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO survey_consents (
          id, account_id, planteur_id, questionnaire_id, version_number, definition_id,
          consent_version, language, status, presented_confirmed, agent_id, agent_name_snapshot,
          respondent_name, respondent_phone_status, respondent_phone,
          other_household_phone_status, other_household_phone,
          decided_at, created_at, updated_at, transfer_status, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)`,
        [
          record.id,
          record.accountId,
          record.planteurId,
          record.questionnaireId,
          record.versionNumber,
          record.definitionId,
          record.consentVersion,
          record.language,
          record.status,
          record.presentedConfirmed ? 1 : 0,
          record.agentId,
          record.agentNameSnapshot,
          record.respondentName,
          record.respondentPhoneStatus,
          record.respondentPhone,
          record.otherHouseholdPhoneStatus,
          record.otherHouseholdPhone,
          record.decidedAt,
          record.createdAt,
          record.updatedAt,
        ]
      );
      await enqueueOutboxInTx(identity.accountId, 'survey_consent', id, 'create', record, 1);
    });
    return record;
  }

  const revision = existing.revision + 1;
  const next: SurveyConsentRecord = {
    ...existing,
    ...nextBase,
    updatedAt: ts,
    transferStatus: 'pending',
    revision,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE survey_consents SET
        version_number = ?, language = ?, status = ?, presented_confirmed = ?,
        agent_id = ?, agent_name_snapshot = ?,
        respondent_name = ?, respondent_phone_status = ?, respondent_phone = ?,
        other_household_phone_status = ?, other_household_phone = ?,
        decided_at = ?, updated_at = ?, transfer_status = 'pending', revision = ?
       WHERE id = ? AND account_id = ?`,
      [
        next.versionNumber,
        next.language,
        next.status,
        next.presentedConfirmed ? 1 : 0,
        next.agentId,
        next.agentNameSnapshot,
        next.respondentName,
        next.respondentPhoneStatus,
        next.respondentPhone,
        next.otherHouseholdPhoneStatus,
        next.otherHouseholdPhone,
        next.decidedAt,
        next.updatedAt,
        next.revision,
        next.id,
        identity.accountId,
      ]
    );
    await enqueueOutboxInTx(identity.accountId, 'survey_consent', next.id, 'update', next, revision);
  });
  return next;
}
