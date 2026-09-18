import type { SurveyAnswerMap } from '@appsurvey/shared';
import {
  evaluateClmrs,
  extractFacts,
  hashFactsInput,
  type ConsistencyFlag,
  type HouseholdEvaluation,
} from '@appsurvey/clmrs-engine';
import { getDatabase, newId, nowIso } from '../../data/db';
import { enqueueOutboxInTx } from '../../data/repositories/outboxRepository';
import { getSurveyResponse } from '../../data/repositories/surveyResponsesRepository';
import {
  ensureClmrsSeeds,
  getFactMapping,
  getPublishedRulePack,
} from '../persistence/rulePacksRepository';
import {
  saveDetectionRunInTx,
  saveSignalsInTx,
} from '../persistence/detectionRunsRepository';
import { createRemediationCaseInTx } from '../persistence/remediationCasesRepository';

export type ClmrsSubmitResult =
  | {
      ok: false;
      reason: 'BLOCKING_DATA_QUALITY';
      flags: ConsistencyFlag[];
      evaluation: HouseholdEvaluation;
    }
  | {
      ok: true;
      responseId: string;
      evaluation: HouseholdEvaluation;
      caseIds: string[];
      criticalAlert: boolean;
      detectionPending: boolean;
    };

/**
 * Pre-evaluate then (unless BLOCKING) submit survey + CLMRS artefacts in one SQLite transaction.
 */
export async function submitSurveyWithClmrs(input: {
  accountId: string;
  responseId?: string | null;
  siteId: string | null;
  templateKey: string;
  templateVersion: string;
  targetType?: string | null;
  targetId?: string | null;
  answers: SurveyAnswerMap;
  meta?: Record<string, unknown>;
  actorId?: string | null;
  actorRole?: string | null;
  /** Enumerator confirmed soft-block consistency review */
  consistencyConfirmed?: boolean;
  householdId?: string | null;
}): Promise<ClmrsSubmitResult> {
  await ensureClmrsSeeds();

  const pack = await getPublishedRulePack();
  const mapping = await getFactMapping('protection_enfant', '1');
  const householdId =
    input.householdId ||
    input.targetId ||
    input.responseId ||
    `hh-${input.templateKey}`;

  const facts = extractFacts(input.answers as Record<string, unknown>, mapping!, {
    householdId,
    siteId: input.siteId,
    visitId: input.responseId ?? null,
  });

  const evaluation = evaluateClmrs(facts, pack);

  if (
    evaluation.dataQuality.status === 'BLOCKING' &&
    !input.consistencyConfirmed
  ) {
    return {
      ok: false,
      reason: 'BLOCKING_DATA_QUALITY',
      flags: evaluation.dataQuality.flags,
      evaluation,
    };
  }

  const db = await getDatabase();
  const ts = nowIso();
  const responseId = input.responseId ?? newId();
  const payload = { ...input.answers, meta: input.meta };
  const caseIds: string[] = [];
  let criticalAlert = false;
  let detectionPending = false;

  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id: string; revision: number }>(
      `SELECT id, revision FROM survey_responses WHERE id = ? AND account_id = ?`,
      [responseId, input.accountId]
    );

    let revision = 1;
    if (existing) {
      revision = existing.revision + 1;
      await db.runAsync(
        `UPDATE survey_responses SET
          payload_json = ?, current_step = 1, business_status = 'submitted', updated_at = ?,
          revision = ?, transfer_status = 'pending',
          site_id = ?, target_type = ?, target_id = ?
         WHERE id = ? AND account_id = ?`,
        [
          JSON.stringify(payload),
          ts,
          revision,
          input.siteId,
          input.targetType ?? null,
          input.targetId ?? null,
          responseId,
          input.accountId,
        ]
      );
      await enqueueOutboxInTx(
        input.accountId,
        'survey_response',
        responseId,
        'update',
        payload,
        revision
      );
    } else {
      await db.runAsync(
        `INSERT INTO survey_responses (
          id, account_id, site_id, template_key, template_version, target_type, target_id,
          business_status, transfer_status, current_step, payload_json, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', 'pending', 1, ?, ?, ?, 1)`,
        [
          responseId,
          input.accountId,
          input.siteId,
          input.templateKey,
          input.templateVersion,
          input.targetType ?? null,
          input.targetId ?? null,
          JSON.stringify(payload),
          ts,
          ts,
        ]
      );
      await enqueueOutboxInTx(
        input.accountId,
        'survey_response',
        responseId,
        'create',
        payload,
        1
      );
    }

    const packId = pack?.id ?? 'NONE';

    for (const childResult of evaluation.children) {
      if (childResult.evaluationStatus === 'DETECTION_PENDING') {
        detectionPending = true;
      }

      const enfantId = childResult.childId ?? 'unknown-child';
      const childFacts = facts.children.find((c) => c.childId === enfantId) ?? null;
      const inputHash = hashFactsInput(responseId, enfantId, packId, {
        child: childFacts,
        household: facts.household,
        visit: facts.visit,
        engine: childResult.engineVersion,
      });

      const prior = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM detection_runs
         WHERE survey_response_id = ? AND enfant_id = ? AND rule_pack_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [responseId, enfantId, packId]
      );

      const { runId, inserted } = await saveDetectionRunInTx({
        accountId: input.accountId,
        surveyResponseId: responseId,
        enfantId,
        householdId,
        rulePackId: packId,
        engineVersion: childResult.engineVersion,
        inputHash,
        evaluationStatus: childResult.evaluationStatus,
        result: childResult,
        supersedesRunId: prior?.id ?? null,
      });

      if (inserted) {
        await saveSignalsInTx(input.accountId, runId, childResult.triggeredRules);
      }

      const needsCase =
        childResult.primaryStatus !== 'NO_CASE_DETECTED' ||
        childResult.protectionImmediate ||
        childResult.evaluationStatus === 'DETECTION_PENDING';

      if (needsCase) {
        const { caseId, created } = await createRemediationCaseInTx({
          accountId: input.accountId,
          surveyResponseId: responseId,
          enfantId,
          householdId,
          detectionRunId: runId,
          primaryStatus: childResult.primaryStatus,
          severity: childResult.severity,
          protectionImmediate: childResult.protectionImmediate,
          actorId: input.actorId,
          actorRole: input.actorRole,
        });
        caseIds.push(caseId);

        if (created || inserted) {
          await enqueueOutboxInTx(
            input.accountId,
            'detection_result',
            runId,
            'create',
            {
              surveyResponseId: responseId,
              enfantId,
              inputHash,
              result: childResult,
              caseId,
            },
            1,
            null,
            `detection-result:${responseId}:${enfantId}:${inputHash}`
          );
        }

        if (childResult.protectionImmediate || childResult.severity === 'CRITICAL') {
          criticalAlert = true;
          await enqueueOutboxInTx(
            input.accountId,
            'critical_case',
            caseId,
            'create',
            {
              event: 'critical_case_detected',
              caseId,
              surveyResponseId: responseId,
              enfantId,
              primaryStatus: childResult.primaryStatus,
              severity: childResult.severity,
              rulePackId: packId,
            },
            1,
            null,
            `critical_case_detected:${responseId}:${enfantId}:${inputHash}`
          );
        }
      }
    }
  });

  const saved = await getSurveyResponse(input.accountId, responseId);
  if (!saved) throw new Error('Soumission CLMRS échouée (réponse absente).');

  return {
    ok: true,
    responseId,
    evaluation,
    caseIds,
    criticalAlert,
    detectionPending,
  };
}
