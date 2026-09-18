import { getDatabase, newId, nowIso } from '../../data/db';
import type { RulePack, FactMapping } from '@appsurvey/clmrs-engine';
import { loadEmbeddedCmPack, validateRulePack } from '@appsurvey/clmrs-engine';
import protectionEnfantV1 from '../mappings/protection_enfant_v1.json';

/** Seed immutable published CM pack + protection_enfant mapping (idempotent). */
export async function ensureClmrsSeeds(): Promise<void> {
  const db = await getDatabase();
  const pack = loadEmbeddedCmPack();
  if (!validateRulePack(pack)) {
    throw new Error('Pack CM/2026.1 invalide');
  }
  const ts = nowIso();

  const existingPack = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM rule_packs WHERE id = ?`,
    [pack.id]
  );
  if (!existingPack) {
    await db.runAsync(
      `INSERT INTO rule_packs (
        id, country, rule_version, fact_schema_version, schema_version, status,
        effective_from, effective_to, content_hash, source_references_json,
        parameters_json, approved_by, approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pack.id,
        pack.country,
        pack.ruleVersion,
        pack.factSchemaVersion,
        pack.schemaVersion,
        pack.status,
        pack.effectiveFrom,
        pack.effectiveTo,
        pack.contentHash,
        JSON.stringify(pack.sourceReferences),
        JSON.stringify(pack.parameters),
        'system',
        ts,
        ts,
      ]
    );
  }

  const mapping = protectionEnfantV1 as FactMapping;
  const mapId = `mapping:${mapping.surveyTemplate}:${mapping.surveyVersion}`;
  const existingMap = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM fact_mappings WHERE id = ?`,
    [mapId]
  );
  if (!existingMap) {
    await db.runAsync(
      `INSERT INTO fact_mappings (
        id, survey_template, survey_version, fact_schema_version, fields_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'PUBLISHED', ?)`,
      [
        mapId,
        mapping.surveyTemplate,
        mapping.surveyVersion,
        mapping.factSchemaVersion,
        JSON.stringify(mapping.fields),
        ts,
      ]
    );
  }
}

export async function getPublishedRulePack(packId?: string): Promise<RulePack | null> {
  const db = await getDatabase();
  const row = packId
    ? await db.getFirstAsync<Record<string, unknown>>(
        `SELECT * FROM rule_packs WHERE id = ? AND status = 'PUBLISHED'`,
        [packId]
      )
    : await db.getFirstAsync<Record<string, unknown>>(
        `SELECT * FROM rule_packs WHERE status = 'PUBLISHED'
         ORDER BY effective_from DESC LIMIT 1`
      );
  if (!row) {
    // Fallback embedded pack (offline first-boot before seed)
    const embedded = loadEmbeddedCmPack();
    return embedded.status === 'PUBLISHED' ? embedded : null;
  }
  return rowToPack(row);
}

export async function listPublishedRulePacks(): Promise<RulePack[]> {
  await ensureClmrsSeeds();
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM rule_packs WHERE status = 'PUBLISHED' ORDER BY effective_from DESC`
  );
  if (!rows.length) return [loadEmbeddedCmPack()];
  return rows.map(rowToPack);
}

export async function getFactMapping(
  surveyTemplate: string,
  surveyVersion: string
): Promise<FactMapping | null> {
  await ensureClmrsSeeds();
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    survey_template: string;
    survey_version: string;
    fact_schema_version: string;
    fields_json: string;
  }>(
    `SELECT survey_template, survey_version, fact_schema_version, fields_json
     FROM fact_mappings
     WHERE survey_template = ? AND survey_version = ? AND status = 'PUBLISHED'`,
    [surveyTemplate, surveyVersion]
  );
  if (!row) {
    // Default mapping for protection_enfant
    if (surveyTemplate.includes('protection') || surveyTemplate === 'protection_enfant') {
      return protectionEnfantV1 as FactMapping;
    }
    return protectionEnfantV1 as FactMapping;
  }
  return {
    surveyTemplate: row.survey_template,
    surveyVersion: row.survey_version,
    factSchemaVersion: row.fact_schema_version,
    fields: JSON.parse(row.fields_json) as Record<string, string>,
  };
}

function rowToPack(row: Record<string, unknown>): RulePack {
  return {
    id: String(row.id),
    country: String(row.country),
    ruleVersion: String(row.rule_version),
    factSchemaVersion: String(row.fact_schema_version),
    schemaVersion: String(row.schema_version),
    status: row.status as RulePack['status'],
    effectiveFrom: String(row.effective_from),
    effectiveTo: row.effective_to == null ? null : String(row.effective_to),
    contentHash: String(row.content_hash),
    sourceReferences: JSON.parse(String(row.source_references_json)) as string[],
    parameters: JSON.parse(String(row.parameters_json)) as RulePack['parameters'],
  };
}

/** Published packs are immutable — reject updates. */
export async function assertPackImmutable(packId: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ status: string }>(
    `SELECT status FROM rule_packs WHERE id = ?`,
    [packId]
  );
  if (row?.status === 'PUBLISHED') {
    throw new Error(`Pack publié immuable: ${packId}. Créez une nouvelle version.`);
  }
}

export { newId };
