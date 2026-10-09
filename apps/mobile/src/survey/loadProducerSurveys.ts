import { resolveLocalized, type DisplayLocale } from '@appsurvey/shared';
import { listActiveAssignmentsForSite } from '../data/repositories/questionnaireAssignmentsRepository';
import {
  findInProgressResponse,
  listResponsesForTarget,
  type SurveyResponseRecord,
} from '../data/repositories/surveyResponsesRepository';
import { ensureAnnualExploitationPublished } from './annual/ensureAnnualExploitation';
import { ensureHouseholdSurveysPublished } from './household/ensureHouseholdSurveys';
import { hubForCategory, type SurveyHubId } from './surveyHubCategories';

export type ProducerSurveyStatus = 'todo' | 'in_progress' | 'done';

export type ProducerSurveyItem = {
  assignmentId: string;
  questionnaireId: string;
  versionNumber: string;
  title: string;
  category: string;
  hub: SurveyHubId;
  campaign: string | null;
  status: ProducerSurveyStatus;
  currentStep: number;
  responseId: string | null;
  updatedAt: string | null;
  pendingSync: boolean;
};

function statusOf(row: SurveyResponseRecord | undefined): ProducerSurveyStatus {
  if (!row) return 'todo';
  if (row.businessStatus === 'submitted') return 'done';
  if (row.businessStatus === 'draft' || row.businessStatus === 'in_progress') return 'in_progress';
  return 'todo';
}

/**
 * Published site assignments joined with this planter's latest local response.
 * No invented questionnaires.
 */
export async function loadProducerSurveys(
  accountId: string,
  siteId: string,
  planteurId: string
): Promise<ProducerSurveyItem[]> {
  await ensureAnnualExploitationPublished(accountId, siteId);
  await ensureHouseholdSurveysPublished(accountId, siteId);
  const [assignments, responses] = await Promise.all([
    listActiveAssignmentsForSite(accountId, siteId),
    listResponsesForTarget(accountId, planteurId),
  ]);

  const latest = new Map<string, SurveyResponseRecord>();
  for (const row of responses) {
    if (!latest.has(row.templateKey)) latest.set(row.templateKey, row);
  }

  return assignments.map((a) => {
    const response = latest.get(a.questionnaireId);
    return {
      assignmentId: a.id,
      questionnaireId: a.questionnaireId,
      versionNumber: String(a.versionNumber),
      title: a.title,
      category: a.category,
      hub: hubForCategory(a.category),
      campaign: a.campaign,
      status: statusOf(response),
      currentStep: response?.currentStep ?? 0,
      responseId: response?.id ?? null,
      updatedAt: response?.updatedAt ?? null,
      pendingSync: response?.transferStatus === 'pending',
    };
  });
}

/** Published questionnaires assigned to the site, grouped later by the 3 hubs. */
export async function loadSiteSurveyCatalog(
  accountId: string,
  siteId: string
): Promise<ProducerSurveyItem[]> {
  await ensureAnnualExploitationPublished(accountId, siteId);
  await ensureHouseholdSurveysPublished(accountId, siteId);
  const assignments = await listActiveAssignmentsForSite(accountId, siteId);
  const items: ProducerSurveyItem[] = [];
  for (const a of assignments) {
    const draft = await findInProgressResponse(
      accountId,
      a.questionnaireId,
      String(a.versionNumber),
      siteId
    );
    items.push({
      assignmentId: a.id,
      questionnaireId: a.questionnaireId,
      versionNumber: String(a.versionNumber),
      title: a.title,
      category: a.category,
      hub: hubForCategory(a.category),
      campaign: a.campaign,
      status: draft ? 'in_progress' : 'todo',
      currentStep: draft?.currentStep ?? 0,
      responseId: draft?.id ?? null,
      updatedAt: draft?.updatedAt ?? null,
      pendingSync: draft?.transferStatus === 'pending',
    });
  }
  return items;
}

export function displayQuestionnaireTitle(raw: string, locale: DisplayLocale): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      return resolveLocalized(JSON.parse(trimmed), locale);
    } catch {
      return raw;
    }
  }
  return raw;
}

export function summarizeHub(items: ProducerSurveyItem[]) {
  const done = items.filter((i) => i.status === 'done').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const todo = items.filter((i) => i.status === 'todo').length;
  let status: ProducerSurveyStatus = 'todo';
  if (items.length > 0 && done === items.length) status = 'done';
  else if (inProgress > 0 || done > 0) status = 'in_progress';
  return { total: items.length, done, inProgress, todo, status };
}
