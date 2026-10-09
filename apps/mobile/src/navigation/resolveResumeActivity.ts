import { listResumableSurveyResponses } from '../data/repositories/surveyResponsesRepository';
import type { ResumeActivity } from './types';

/**
 * Resolve the best real in-progress activity for the Accueil "Continuer" card.
 * No mock data — empty when nothing to resume.
 */
export async function resolveResumeActivity(
  accountId: string
): Promise<ResumeActivity | null> {
  const rows = await listResumableSurveyResponses(accountId, 1);
  const row = rows[0];
  if (!row) return null;

  const meta = row.payload?.meta as Record<string, unknown> | undefined;
  const title =
    (typeof meta?.questionnaireTitle === 'string' && meta.questionnaireTitle) ||
    row.templateKey;

  return {
    kind: 'survey',
    responseId: row.id,
    questionnaireId: row.templateKey,
    versionNumber: row.templateVersion,
    siteId: row.siteId,
    planteurId: row.targetType === 'planteur' ? row.targetId : null,
    title,
    subtitle: row.siteId ? undefined : undefined,
    currentStep: row.currentStep ?? 0,
    updatedAt: row.updatedAt,
  };
}
