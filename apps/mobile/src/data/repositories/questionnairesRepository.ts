import type {
  AppRole,
  AssignmentFrequency,
  QuestionConfig,
  QuestionDefinition,
  QuestionOptionDef,
  QuestionType,
  QuestionValidation,
  QuestionnaireCategory,
  QuestionnaireDefinitionSnapshot,
  QuestionnaireListItem,
  QuestionnaireStatus,
  QuestionnaireSubjectType,
  QuestionnaireUsage,
  QuestionnaireVersionState,
  SectionDefinition,
  VisibilityRules,
} from '@appsurvey/shared';
import { getDatabase, newId, nowIso } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';
import { assertQuestionnaireAdmin } from '../../survey/assertQuestionnaireAdmin';
import { validateDefinitionForPublish } from '../../survey/surveyEngine';

type QRow = {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  usage: string;
  category: string;
  subject_type: string;
  instructions: string | null;
  confidentiality: string;
  status: string;
  published_version: number | null;
  draft_version_id: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
};

export type QuestionnaireRecord = {
  id: string;
  accountId: string;
  title: string;
  description: string | null;
  usage: QuestionnaireUsage;
  category: QuestionnaireCategory;
  subjectType: QuestionnaireSubjectType;
  instructions: string | null;
  confidentiality: string;
  status: QuestionnaireStatus;
  publishedVersion: number | null;
  draftVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

function mapQ(r: QRow): QuestionnaireRecord {
  return {
    id: r.id,
    accountId: r.account_id,
    title: r.title,
    description: r.description,
    usage: r.usage as QuestionnaireUsage,
    category: r.category as QuestionnaireCategory,
    subjectType: r.subject_type as QuestionnaireSubjectType,
    instructions: r.instructions,
    confidentiality: r.confidentiality,
    status: r.status as QuestionnaireStatus,
    publishedVersion: r.published_version,
    draftVersionId: r.draft_version_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    revision: r.revision,
  };
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeAudit(
  questionnaireId: string,
  actorId: string | null,
  action: string,
  detail?: unknown
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO questionnaire_audit (id, questionnaire_id, actor_id, action, detail_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [newId(), questionnaireId, actorId, action, detail ? JSON.stringify(detail) : null, nowIso()]
  );
}

export async function listQuestionnaires(
  accountId: string,
  filters?: {
    status?: QuestionnaireStatus | 'all';
    category?: QuestionnaireCategory | 'all';
    query?: string;
    siteId?: string;
  }
): Promise<QuestionnaireListItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<
    QRow & { question_count: number; site_scope: string | null }
  >(
    `SELECT q.*,
      (SELECT COUNT(*) FROM questionnaire_questions qq
        WHERE qq.version_id = COALESCE(q.draft_version_id,
          (SELECT id FROM questionnaire_versions WHERE questionnaire_id = q.id AND state = 'published' ORDER BY version_number DESC LIMIT 1)
        )
      ) AS question_count,
      (SELECT GROUP_CONCAT(DISTINCT s.name)
        FROM questionnaire_assignments a
        LEFT JOIN sites s ON s.id = a.site_id
        WHERE a.questionnaire_id = q.id AND a.status = 'active'
      ) AS site_scope
     FROM questionnaires q
     WHERE q.account_id = ?
     ORDER BY q.updated_at DESC`,
    [accountId]
  );

  let items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category as QuestionnaireCategory,
    usage: r.usage as QuestionnaireUsage,
    status: r.status as QuestionnaireStatus,
    publishedVersion: r.published_version,
    hasDraft: !!r.draft_version_id,
    questionCount: r.question_count ?? 0,
    siteScopeLabel: r.site_scope || 'Non diffusé',
    updatedAt: r.updated_at,
  }));

  if (filters?.status && filters.status !== 'all') {
    items = items.filter((i) => i.status === filters.status);
  }
  if (filters?.category && filters.category !== 'all') {
    items = items.filter((i) => i.category === filters.category);
  }
  if (filters?.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    items = items.filter((i) => i.title.toLowerCase().includes(q));
  }
  if (filters?.siteId) {
    const assigned = await db.getAllAsync<{ questionnaire_id: string }>(
      `SELECT DISTINCT questionnaire_id FROM questionnaire_assignments
       WHERE account_id = ? AND site_id = ?`,
      [accountId, filters.siteId]
    );
    const set = new Set(assigned.map((a) => a.questionnaire_id));
    items = items.filter((i) => set.has(i.id) || i.status === 'draft');
  }

  return items;
}

export async function getQuestionnaire(
  accountId: string,
  questionnaireId: string
): Promise<QuestionnaireRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<QRow>(
    `SELECT * FROM questionnaires WHERE id = ? AND account_id = ?`,
    [questionnaireId, accountId]
  );
  return row ? mapQ(row) : null;
}

export async function createQuestionnaireDraft(
  accountId: string,
  actorId: string | null,
  role: AppRole | null | undefined,
  input: {
    title: string;
    description?: string;
    usage: QuestionnaireUsage;
    category: QuestionnaireCategory;
    subjectType: QuestionnaireSubjectType;
    instructions?: string;
    confidentiality?: string;
  }
): Promise<{ questionnaire: QuestionnaireRecord; versionId: string }> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const id = newId();
  const versionId = newId();
  const sectionId = newId();
  const ts = nowIso();
  const title = input.title.trim() || 'Nouveau questionnaire';

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO questionnaires (
        id, account_id, title, description, usage, category, subject_type, instructions,
        confidentiality, status, published_version, draft_version_id, created_at, updated_at, revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NULL, ?, ?, ?, 1)`,
      [
        id,
        accountId,
        title,
        input.description?.trim() || null,
        input.usage,
        input.category,
        input.subjectType,
        input.instructions?.trim() || null,
        input.confidentiality || 'standard',
        versionId,
        ts,
        ts,
      ]
    );
    await db.runAsync(
      `INSERT INTO questionnaire_versions (
        id, questionnaire_id, account_id, version_number, state, definition_json, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, 1, 'draft', NULL, ?, ?, ?)`,
      [versionId, id, accountId, actorId, ts, ts]
    );
    await db.runAsync(
      `INSERT INTO questionnaire_sections (id, version_id, title, sort_order, visibility_rules_json)
       VALUES (?, ?, 'Section 1', 0, NULL)`,
      [sectionId, versionId]
    );
    await enqueueOutboxInTx(
      accountId,
      'questionnaire',
      id,
      'create',
      { id, title, status: 'draft' },
      1
    );
    await writeAudit(id, actorId, 'create_draft', { title });
  });

  const questionnaire = await getQuestionnaire(accountId, id);
  if (!questionnaire) throw new Error('Création échouée.');
  return { questionnaire, versionId };
}

export async function updateQuestionnaireInfo(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  actorId: string | null,
  input: {
    title: string;
    description?: string | null;
    usage: QuestionnaireUsage;
    category: QuestionnaireCategory;
    subjectType: QuestionnaireSubjectType;
    instructions?: string | null;
    confidentiality?: string;
  }
): Promise<QuestionnaireRecord> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const existing = await getQuestionnaire(accountId, questionnaireId);
  if (!existing) throw new Error('Questionnaire introuvable.');
  if (existing.status === 'archived') throw new Error('Questionnaire archivé.');

  const ts = nowIso();
  const revision = existing.revision + 1;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE questionnaires SET title = ?, description = ?, usage = ?, category = ?, subject_type = ?,
        instructions = ?, confidentiality = ?, updated_at = ?, revision = ?
       WHERE id = ? AND account_id = ?`,
      [
        input.title.trim(),
        input.description?.trim() || null,
        input.usage,
        input.category,
        input.subjectType,
        input.instructions?.trim() || null,
        input.confidentiality || existing.confidentiality,
        ts,
        revision,
        questionnaireId,
        accountId,
      ]
    );
    await enqueueOutboxInTx(
      accountId,
      'questionnaire',
      questionnaireId,
      'update',
      { ...input, revision },
      revision
    );
    await writeAudit(questionnaireId, actorId, 'update_info');
  });

  const updated = await getQuestionnaire(accountId, questionnaireId);
  if (!updated) throw new Error('Mise à jour échouée.');
  return updated;
}

async function loadOptions(questionId: string): Promise<QuestionOptionDef[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    stable_key: string;
    label: string;
    sort_order: number;
    is_other: number;
    is_exclusive: number;
  }>(
    `SELECT stable_key, label, sort_order, is_other, is_exclusive
     FROM questionnaire_options WHERE question_id = ? ORDER BY sort_order ASC`,
    [questionId]
  );
  return rows.map((r) => ({
    stableKey: r.stable_key,
    label: r.label,
    sortOrder: r.sort_order,
    isOther: !!r.is_other,
    isExclusive: !!r.is_exclusive,
  }));
}

export async function loadDefinitionFromVersion(
  accountId: string,
  versionId: string
): Promise<QuestionnaireDefinitionSnapshot | null> {
  const db = await getDatabase();
  const version = await db.getFirstAsync<{
    id: string;
    questionnaire_id: string;
    version_number: number;
    state: string;
    definition_json: string | null;
  }>(
    `SELECT * FROM questionnaire_versions WHERE id = ? AND account_id = ?`,
    [versionId, accountId]
  );
  if (!version) return null;

  if (version.state !== 'draft' && version.definition_json) {
    return parseJson<QuestionnaireDefinitionSnapshot | null>(version.definition_json, null);
  }

  const q = await getQuestionnaire(accountId, version.questionnaire_id);
  if (!q) return null;

  const sections = await db.getAllAsync<{
    id: string;
    title: string;
    sort_order: number;
    visibility_rules_json: string | null;
  }>(
    `SELECT * FROM questionnaire_sections WHERE version_id = ? ORDER BY sort_order ASC`,
    [versionId]
  );

  const sectionDefs: SectionDefinition[] = [];
  for (const s of sections) {
    const questions = await db.getAllAsync<{
      id: string;
      section_id: string;
      stable_key: string;
      type: string;
      label: string;
      help_text: string | null;
      required: number;
      config_json: string | null;
      validation_json: string | null;
      visibility_rules_json: string | null;
      sort_order: number;
    }>(
      `SELECT * FROM questionnaire_questions WHERE version_id = ? AND section_id = ? ORDER BY sort_order ASC`,
      [versionId, s.id]
    );

    const qDefs: QuestionDefinition[] = [];
    for (const qq of questions) {
      qDefs.push({
        id: qq.id,
        stableKey: qq.stable_key,
        sectionId: qq.section_id,
        type: qq.type as QuestionType,
        label: qq.label,
        help: qq.help_text,
        required: !!qq.required,
        config: parseJson<QuestionConfig>(qq.config_json, {}),
        validation: parseJson<QuestionValidation>(qq.validation_json, {}),
        visibility: parseJson<VisibilityRules | null>(qq.visibility_rules_json, null),
        options: await loadOptions(qq.id),
        sortOrder: qq.sort_order,
      });
    }

    sectionDefs.push({
      id: s.id,
      title: s.title,
      sortOrder: s.sort_order,
      visibility: parseJson<VisibilityRules | null>(s.visibility_rules_json, null),
      questions: qDefs,
    });
  }

  return {
    questionnaireId: q.id,
    versionNumber: version.version_number,
    title: q.title,
    description: q.description,
    usage: q.usage,
    category: q.category,
    subjectType: q.subjectType,
    instructions: q.instructions,
    confidentiality: q.confidentiality,
    sections: sectionDefs,
  };
}

export async function getDraftDefinition(
  accountId: string,
  questionnaireId: string
): Promise<QuestionnaireDefinitionSnapshot | null> {
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q?.draftVersionId) {
    // fall back to latest published snapshot for read
    if (q?.publishedVersion != null) {
      return getPublishedDefinition(accountId, questionnaireId, q.publishedVersion);
    }
    return null;
  }
  return loadDefinitionFromVersion(accountId, q.draftVersionId);
}

export async function getPublishedDefinition(
  accountId: string,
  questionnaireId: string,
  versionNumber: number
): Promise<QuestionnaireDefinitionSnapshot | null> {
  const db = await getDatabase();
  const version = await db.getFirstAsync<{ id: string; definition_json: string | null }>(
    `SELECT id, definition_json FROM questionnaire_versions
     WHERE questionnaire_id = ? AND account_id = ? AND version_number = ? AND state IN ('published','superseded')`,
    [questionnaireId, accountId, versionNumber]
  );
  if (!version?.definition_json) return null;
  return parseJson(version.definition_json, null);
}

export async function ensureDraftVersion(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  actorId: string | null
): Promise<string> {
  assertQuestionnaireAdmin(role);
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q) throw new Error('Questionnaire introuvable.');
  if (q.draftVersionId) return q.draftVersionId;
  if (q.publishedVersion == null) throw new Error('Aucune version à éditer.');

  return createDraftFromPublished(accountId, role, questionnaireId, actorId);
}

export async function createDraftFromPublished(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  actorId: string | null
): Promise<string> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q) throw new Error('Questionnaire introuvable.');
  if (q.draftVersionId) return q.draftVersionId;
  if (q.publishedVersion == null) throw new Error('Aucune version publiée.');

  const published = await getPublishedDefinition(accountId, questionnaireId, q.publishedVersion);
  if (!published) throw new Error('Définition publiée introuvable.');

  const newVersionNumber = q.publishedVersion + 1;
  const versionId = newId();
  const ts = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO questionnaire_versions (
        id, questionnaire_id, account_id, version_number, state, definition_json, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'draft', NULL, ?, ?, ?)`,
      [versionId, questionnaireId, accountId, newVersionNumber, actorId, ts, ts]
    );

    for (const section of published.sections) {
      const sectionId = newId();
      await db.runAsync(
        `INSERT INTO questionnaire_sections (id, version_id, title, sort_order, visibility_rules_json)
         VALUES (?, ?, ?, ?, ?)`,
        [
          sectionId,
          versionId,
          section.title,
          section.sortOrder,
          section.visibility ? JSON.stringify(section.visibility) : null,
        ]
      );
      for (const question of section.questions) {
        const questionId = newId();
        await db.runAsync(
          `INSERT INTO questionnaire_questions (
            id, version_id, section_id, stable_key, type, label, help_text, required,
            config_json, validation_json, visibility_rules_json, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            questionId,
            versionId,
            sectionId,
            question.stableKey,
            question.type,
            question.label,
            question.help ?? null,
            question.required ? 1 : 0,
            JSON.stringify(question.config ?? {}),
            JSON.stringify(question.validation ?? {}),
            question.visibility ? JSON.stringify(question.visibility) : null,
            question.sortOrder,
          ]
        );
        for (const opt of question.options) {
          await db.runAsync(
            `INSERT INTO questionnaire_options (id, question_id, stable_key, label, sort_order, is_other, is_exclusive)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              newId(),
              questionId,
              opt.stableKey,
              opt.label,
              opt.sortOrder,
              opt.isOther ? 1 : 0,
              opt.isExclusive ? 1 : 0,
            ]
          );
        }
      }
    }

    const revision = q.revision + 1;
    await db.runAsync(
      `UPDATE questionnaires SET draft_version_id = ?, updated_at = ?, revision = ?
       WHERE id = ? AND account_id = ?`,
      [versionId, ts, revision, questionnaireId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'questionnaire_version',
      versionId,
      'create',
      { questionnaireId, versionNumber: newVersionNumber },
      1
    );
    await writeAudit(questionnaireId, actorId, 'create_draft_from_published', {
      versionNumber: newVersionNumber,
    });
  });

  return versionId;
}

export async function addSection(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  title = 'Nouvelle section'
): Promise<string> {
  assertQuestionnaireAdmin(role);
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q?.draftVersionId) throw new Error('Aucun brouillon à éditer.');
  const db = await getDatabase();
  const max = await db.getFirstAsync<{ m: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) as m FROM questionnaire_sections WHERE version_id = ?`,
    [q.draftVersionId]
  );
  const id = newId();
  await db.runAsync(
    `INSERT INTO questionnaire_sections (id, version_id, title, sort_order, visibility_rules_json)
     VALUES (?, ?, ?, ?, NULL)`,
    [id, q.draftVersionId, title, (max?.m ?? -1) + 1]
  );
  await touchQuestionnaire(accountId, questionnaireId);
  return id;
}

export async function renameSection(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  sectionId: string,
  title: string
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  await db.runAsync(`UPDATE questionnaire_sections SET title = ? WHERE id = ?`, [
    title.trim() || 'Section',
    sectionId,
  ]);
  await touchQuestionnaire(accountId, questionnaireId);
}

export async function deleteSection(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  sectionId: string
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q?.draftVersionId) throw new Error('Aucun brouillon.');
  const db = await getDatabase();
  const count = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM questionnaire_sections WHERE version_id = ?`,
    [q.draftVersionId]
  );
  if ((count?.c ?? 0) <= 1) throw new Error('Conservez au moins une section.');

  await db.withTransactionAsync(async () => {
    const questions = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM questionnaire_questions WHERE section_id = ?`,
      [sectionId]
    );
    for (const qq of questions) {
      await db.runAsync(`DELETE FROM questionnaire_options WHERE question_id = ?`, [qq.id]);
    }
    await db.runAsync(`DELETE FROM questionnaire_questions WHERE section_id = ?`, [sectionId]);
    await db.runAsync(`DELETE FROM questionnaire_sections WHERE id = ?`, [sectionId]);
  });
  await touchQuestionnaire(accountId, questionnaireId);
}

export async function moveSection(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  sectionId: string,
  direction: 'up' | 'down'
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q?.draftVersionId) throw new Error('Aucun brouillon.');
  const db = await getDatabase();
  const sections = await db.getAllAsync<{ id: string; sort_order: number }>(
    `SELECT id, sort_order FROM questionnaire_sections WHERE version_id = ? ORDER BY sort_order ASC`,
    [q.draftVersionId]
  );
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx < 0) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sections.length) return;
  const a = sections[idx];
  const b = sections[swapIdx];
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE questionnaire_sections SET sort_order = ? WHERE id = ?`, [
      b.sort_order,
      a.id,
    ]);
    await db.runAsync(`UPDATE questionnaire_sections SET sort_order = ? WHERE id = ?`, [
      a.sort_order,
      b.id,
    ]);
  });
  await touchQuestionnaire(accountId, questionnaireId);
}

function defaultOptionsForType(type: QuestionType): QuestionOptionDef[] {
  if (type === 'yes_no') {
    return [
      { stableKey: 'yes', label: 'Oui', sortOrder: 0 },
      { stableKey: 'no', label: 'Non', sortOrder: 1 },
    ];
  }
  if (type === 'single_choice' || type === 'multi_choice') {
    return [
      { stableKey: 'opt_a', label: 'Option A', sortOrder: 0 },
      { stableKey: 'opt_b', label: 'Option B', sortOrder: 1 },
    ];
  }
  return [];
}

export async function addQuestion(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  sectionId: string,
  type: QuestionType,
  label = 'Nouvelle question'
): Promise<string> {
  assertQuestionnaireAdmin(role);
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q?.draftVersionId) throw new Error('Aucun brouillon.');
  const db = await getDatabase();
  const max = await db.getFirstAsync<{ m: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) as m FROM questionnaire_questions WHERE section_id = ?`,
    [sectionId]
  );
  const id = newId();
  const stableKey = `q_${id.replace(/-/g, '').slice(0, 10)}`;
  const config: QuestionConfig =
    type === 'rating_scale' ? { scaleMin: 1, scaleMax: 5 } : {};

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO questionnaire_questions (
        id, version_id, section_id, stable_key, type, label, help_text, required,
        config_json, validation_json, visibility_rules_json, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?, '{}', NULL, ?)`,
      [id, q.draftVersionId, sectionId, stableKey, type, label, JSON.stringify(config), (max?.m ?? -1) + 1]
    );
    for (const opt of defaultOptionsForType(type)) {
      await db.runAsync(
        `INSERT INTO questionnaire_options (id, question_id, stable_key, label, sort_order, is_other, is_exclusive)
         VALUES (?, ?, ?, ?, ?, 0, 0)`,
        [newId(), id, opt.stableKey, opt.label, opt.sortOrder]
      );
    }
  });
  await touchQuestionnaire(accountId, questionnaireId);
  return id;
}

export async function getQuestion(
  accountId: string,
  questionId: string
): Promise<(QuestionDefinition & { questionnaireId: string }) | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    version_id: string;
    section_id: string;
    stable_key: string;
    type: string;
    label: string;
    help_text: string | null;
    required: number;
    config_json: string | null;
    validation_json: string | null;
    visibility_rules_json: string | null;
    sort_order: number;
    questionnaire_id: string;
  }>(
    `SELECT qq.*, v.questionnaire_id
     FROM questionnaire_questions qq
     JOIN questionnaire_versions v ON v.id = qq.version_id
     WHERE qq.id = ? AND v.account_id = ?`,
    [questionId, accountId]
  );
  if (!row) return null;
  return {
    id: row.id,
    stableKey: row.stable_key,
    sectionId: row.section_id,
    type: row.type as QuestionType,
    label: row.label,
    help: row.help_text,
    required: !!row.required,
    config: parseJson(row.config_json, {}),
    validation: parseJson(row.validation_json, {}),
    visibility: parseJson(row.visibility_rules_json, null),
    options: await loadOptions(row.id),
    sortOrder: row.sort_order,
    questionnaireId: row.questionnaire_id,
  };
}

export async function updateQuestion(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  questionId: string,
  input: {
    label: string;
    help?: string | null;
    required: boolean;
    type?: QuestionType;
    config?: QuestionConfig;
    validation?: QuestionValidation;
    visibility?: VisibilityRules | null;
    options?: QuestionOptionDef[];
    stableKey?: string;
  }
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const existingQ = await db.getFirstAsync<{ stable_key: string; type: string }>(
    `SELECT stable_key, type FROM questionnaire_questions WHERE id = ?`,
    [questionId]
  );
  if (existingQ) {
    const { assertStableKeyMutable } = await import('../../clmrs/mappingGuard');
    const typeChanging = !!input.type && input.type !== existingQ.type;
    const keyChanging =
      !!input.stableKey?.trim() && input.stableKey.trim() !== existingQ.stable_key;
    if (typeChanging || keyChanging) {
      await assertStableKeyMutable({
        stableKey: existingQ.stable_key,
        changingType: typeChanging || keyChanging,
      });
    }
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE questionnaire_questions SET
        label = ?, help_text = ?, required = ?,
        config_json = ?, validation_json = ?, visibility_rules_json = ?,
        type = COALESCE(?, type),
        stable_key = COALESCE(?, stable_key)
       WHERE id = ?`,
      [
        input.label.trim(),
        input.help?.trim() || null,
        input.required ? 1 : 0,
        JSON.stringify(input.config ?? {}),
        JSON.stringify(input.validation ?? {}),
        input.visibility ? JSON.stringify(input.visibility) : null,
        input.type ?? null,
        input.stableKey?.trim() || null,
        questionId,
      ]
    );
    if (input.options) {
      await db.runAsync(`DELETE FROM questionnaire_options WHERE question_id = ?`, [questionId]);
      for (const [i, opt] of input.options.entries()) {
        await db.runAsync(
          `INSERT INTO questionnaire_options (id, question_id, stable_key, label, sort_order, is_other, is_exclusive)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newId(),
            questionId,
            opt.stableKey || `opt_${i}`,
            opt.label,
            opt.sortOrder ?? i,
            opt.isOther ? 1 : 0,
            opt.isExclusive ? 1 : 0,
          ]
        );
      }
    }
  });
  await touchQuestionnaire(accountId, questionnaireId);
}

export async function deleteQuestion(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  questionId: string
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ stable_key: string }>(
    `SELECT stable_key FROM questionnaire_questions WHERE id = ?`,
    [questionId]
  );
  if (existing) {
    const { assertStableKeyMutable } = await import('../../clmrs/mappingGuard');
    await assertStableKeyMutable({ stableKey: existing.stable_key, deleting: true });
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM questionnaire_options WHERE question_id = ?`, [questionId]);
    await db.runAsync(`DELETE FROM questionnaire_questions WHERE id = ?`, [questionId]);
  });
  await touchQuestionnaire(accountId, questionnaireId);
}

export async function moveQuestion(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  questionId: string,
  direction: 'up' | 'down'
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ section_id: string; sort_order: number }>(
    `SELECT section_id, sort_order FROM questionnaire_questions WHERE id = ?`,
    [questionId]
  );
  if (!row) return;
  const siblings = await db.getAllAsync<{ id: string; sort_order: number }>(
    `SELECT id, sort_order FROM questionnaire_questions WHERE section_id = ? ORDER BY sort_order ASC`,
    [row.section_id]
  );
  const idx = siblings.findIndex((s) => s.id === questionId);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;
  const a = siblings[idx];
  const b = siblings[swapIdx];
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE questionnaire_questions SET sort_order = ? WHERE id = ?`, [
      b.sort_order,
      a.id,
    ]);
    await db.runAsync(`UPDATE questionnaire_questions SET sort_order = ? WHERE id = ?`, [
      a.sort_order,
      b.id,
    ]);
  });
  await touchQuestionnaire(accountId, questionnaireId);
}

export async function moveQuestionToSection(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  questionId: string,
  targetSectionId: string
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const max = await db.getFirstAsync<{ m: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) as m FROM questionnaire_questions WHERE section_id = ?`,
    [targetSectionId]
  );
  await db.runAsync(
    `UPDATE questionnaire_questions SET section_id = ?, sort_order = ? WHERE id = ?`,
    [targetSectionId, (max?.m ?? -1) + 1, questionId]
  );
  await touchQuestionnaire(accountId, questionnaireId);
}

async function touchQuestionnaire(accountId: string, questionnaireId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE questionnaires SET updated_at = ?, revision = revision + 1 WHERE id = ? AND account_id = ?`,
    [nowIso(), questionnaireId, accountId]
  );
}

export async function publishQuestionnaire(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  actorId: string | null
): Promise<{ versionNumber: number }> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q?.draftVersionId) throw new Error('Aucun brouillon à publier.');

  const definition = await loadDefinitionFromVersion(accountId, q.draftVersionId);
  if (!definition) throw new Error('Définition introuvable.');

  const issues = validateDefinitionForPublish(definition);
  if (issues.length) {
    throw new Error(issues.map((i) => i.message).join('\n'));
  }

  const assignments = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM questionnaire_assignments
     WHERE questionnaire_id = ? AND account_id = ? AND status = 'active'`,
    [questionnaireId, accountId]
  );
  if ((assignments?.c ?? 0) === 0) {
    throw new Error('Diffusez le questionnaire vers au moins un site avant publication.');
  }

  const versionRow = await db.getFirstAsync<{ version_number: number }>(
    `SELECT version_number FROM questionnaire_versions WHERE id = ?`,
    [q.draftVersionId]
  );
  const versionNumber = versionRow?.version_number ?? 1;
  const snapshot: QuestionnaireDefinitionSnapshot = {
    ...definition,
    versionNumber,
  };
  const ts = nowIso();

  await db.withTransactionAsync(async () => {
    if (q.publishedVersion != null) {
      await db.runAsync(
        `UPDATE questionnaire_versions SET state = 'superseded', updated_at = ?
         WHERE questionnaire_id = ? AND version_number = ? AND state = 'published'`,
        [ts, questionnaireId, q.publishedVersion]
      );
    }
    await db.runAsync(
      `UPDATE questionnaire_versions SET state = 'published', definition_json = ?, updated_at = ?
       WHERE id = ?`,
      [JSON.stringify(snapshot), ts, q.draftVersionId]
    );
    await db.runAsync(
      `UPDATE questionnaire_assignments SET version_number = ?, updated_at = ?
       WHERE questionnaire_id = ? AND account_id = ? AND status = 'active'`,
      [versionNumber, ts, questionnaireId, accountId]
    );
    const revision = q.revision + 1;
    await db.runAsync(
      `UPDATE questionnaires SET status = 'published', published_version = ?, draft_version_id = NULL,
        updated_at = ?, revision = ?
       WHERE id = ? AND account_id = ?`,
      [versionNumber, ts, revision, questionnaireId, accountId]
    );
    await enqueueOutboxInTx(
      accountId,
      'questionnaire',
      questionnaireId,
      'update',
      { status: 'published', publishedVersion: versionNumber },
      revision
    );
    await writeAudit(questionnaireId, actorId, 'publish', { versionNumber });
  });

  return { versionNumber };
}

export async function setQuestionnaireStatus(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  actorId: string | null,
  status: Extract<QuestionnaireStatus, 'suspended' | 'published' | 'archived'>
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q) throw new Error('Questionnaire introuvable.');
  const ts = nowIso();
  const revision = q.revision + 1;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE questionnaires SET status = ?, updated_at = ?, revision = ? WHERE id = ? AND account_id = ?`,
      [status, ts, revision, questionnaireId, accountId]
    );
    if (status === 'suspended' || status === 'archived') {
      await db.runAsync(
        `UPDATE questionnaire_assignments SET status = ?, updated_at = ?
         WHERE questionnaire_id = ? AND account_id = ? AND status = 'active'`,
        [status === 'archived' ? 'archived' : 'suspended', ts, questionnaireId, accountId]
      );
    }
    if (status === 'published') {
      await db.runAsync(
        `UPDATE questionnaire_assignments SET status = 'active', updated_at = ?
         WHERE questionnaire_id = ? AND account_id = ? AND status = 'suspended'`,
        [ts, questionnaireId, accountId]
      );
    }
    await enqueueOutboxInTx(
      accountId,
      'questionnaire',
      questionnaireId,
      'update',
      { status },
      revision
    );
    await writeAudit(questionnaireId, actorId, `status_${status}`);
  });
}

export async function duplicateQuestionnaire(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  actorId: string | null
): Promise<string> {
  assertQuestionnaireAdmin(role);
  const source = await getQuestionnaire(accountId, questionnaireId);
  if (!source) throw new Error('Questionnaire introuvable.');

  let definition: QuestionnaireDefinitionSnapshot | null = null;
  if (source.draftVersionId) {
    definition = await loadDefinitionFromVersion(accountId, source.draftVersionId);
  } else if (source.publishedVersion != null) {
    definition = await getPublishedDefinition(accountId, questionnaireId, source.publishedVersion);
  }
  if (!definition) throw new Error('Rien à dupliquer.');

  const created = await createQuestionnaireDraft(accountId, actorId, role, {
    title: `${source.title} (copie)`,
    description: source.description ?? undefined,
    usage: source.usage,
    category: source.category,
    subjectType: source.subjectType,
    instructions: source.instructions ?? undefined,
    confidentiality: source.confidentiality,
  });

  const db = await getDatabase();
  // Replace default section with copied content
  await db.withTransactionAsync(async () => {
    const oldSections = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM questionnaire_sections WHERE version_id = ?`,
      [created.versionId]
    );
    for (const s of oldSections) {
      await db.runAsync(`DELETE FROM questionnaire_questions WHERE section_id = ?`, [s.id]);
      await db.runAsync(`DELETE FROM questionnaire_sections WHERE id = ?`, [s.id]);
    }
    for (const section of definition!.sections) {
      const sectionId = newId();
      await db.runAsync(
        `INSERT INTO questionnaire_sections (id, version_id, title, sort_order, visibility_rules_json)
         VALUES (?, ?, ?, ?, ?)`,
        [
          sectionId,
          created.versionId,
          section.title,
          section.sortOrder,
          section.visibility ? JSON.stringify(section.visibility) : null,
        ]
      );
      for (const question of section.questions) {
        const questionId = newId();
        await db.runAsync(
          `INSERT INTO questionnaire_questions (
            id, version_id, section_id, stable_key, type, label, help_text, required,
            config_json, validation_json, visibility_rules_json, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            questionId,
            created.versionId,
            sectionId,
            question.stableKey,
            question.type,
            question.label,
            question.help ?? null,
            question.required ? 1 : 0,
            JSON.stringify(question.config ?? {}),
            JSON.stringify(question.validation ?? {}),
            question.visibility ? JSON.stringify(question.visibility) : null,
            question.sortOrder,
          ]
        );
        for (const opt of question.options) {
          await db.runAsync(
            `INSERT INTO questionnaire_options (id, question_id, stable_key, label, sort_order, is_other, is_exclusive)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              newId(),
              questionId,
              opt.stableKey,
              opt.label,
              opt.sortOrder,
              opt.isOther ? 1 : 0,
              opt.isExclusive ? 1 : 0,
            ]
          );
        }
      }
    }
    await writeAudit(created.questionnaire.id, actorId, 'duplicate', { from: questionnaireId });
  });

  return created.questionnaire.id;
}

export async function deleteDraftQuestionnaire(
  accountId: string,
  role: AppRole | null | undefined,
  questionnaireId: string,
  actorId: string | null
): Promise<void> {
  assertQuestionnaireAdmin(role);
  const db = await getDatabase();
  const q = await getQuestionnaire(accountId, questionnaireId);
  if (!q) throw new Error('Questionnaire introuvable.');
  if (q.status !== 'draft' || q.publishedVersion != null) {
    throw new Error('Seuls les brouillons jamais publiés peuvent être supprimés.');
  }
  const responses = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM survey_responses WHERE account_id = ? AND template_key = ? AND business_status != 'preview'`,
    [accountId, questionnaireId]
  );
  if ((responses?.c ?? 0) > 0) {
    throw new Error('Des réponses existent déjà — suppression impossible.');
  }

  await db.withTransactionAsync(async () => {
    const versions = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM questionnaire_versions WHERE questionnaire_id = ?`,
      [questionnaireId]
    );
    for (const v of versions) {
      const questions = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM questionnaire_questions WHERE version_id = ?`,
        [v.id]
      );
      for (const qq of questions) {
        await db.runAsync(`DELETE FROM questionnaire_options WHERE question_id = ?`, [qq.id]);
      }
      await db.runAsync(`DELETE FROM questionnaire_questions WHERE version_id = ?`, [v.id]);
      await db.runAsync(`DELETE FROM questionnaire_sections WHERE version_id = ?`, [v.id]);
      await db.runAsync(`DELETE FROM questionnaire_versions WHERE id = ?`, [v.id]);
    }
    await db.runAsync(`DELETE FROM questionnaire_assignments WHERE questionnaire_id = ?`, [
      questionnaireId,
    ]);
    await db.runAsync(`DELETE FROM questionnaires WHERE id = ? AND account_id = ?`, [
      questionnaireId,
      accountId,
    ]);
    await writeAudit(questionnaireId, actorId, 'delete_draft');
  });
}

export type { QuestionnaireVersionState, AssignmentFrequency };
