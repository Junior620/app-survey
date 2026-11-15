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
import { listCampaigns } from '../data/repositories/campaignsRepository';
import {
  isPerCampaignCategory,
  pickActiveCampaign,
  pickCampaignResponse,
  previousCampaignResponses,
} from './campaigns';

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
  /** Responses of earlier campaigns, for consultation. */
  previous: Array<{ responseId: string; versionNumber: string; campaignName: string | null; updatedAt: string }>;
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
  const [assignments, responses, campaigns] = await Promise.all([
    listActiveAssignmentsForSite(accountId, siteId),
    listResponsesForTarget(accountId, planteurId),
    listCampaigns(),
  ]);
  const campaign = pickActiveCampaign(campaigns);
  const campaignName = (id: string | null) => campaigns.find((item) => item.id === id)?.name ?? null;

  return assignments.map((a) => {
    // Household, education and annual surveys restart with every campaign.
    const response: SurveyResponseRecord | undefined = pickCampaignResponse(
      responses,
      a.questionnaireId,
      a.category,
      campaign
    );
    const previous = previousCampaignResponses(responses, a.questionnaireId, a.category, campaign)
      .filter((row) => row.businessStatus === 'submitted')
      .map((row) => ({
        responseId: row.id,
        versionNumber: row.templateVersion,
        campaignName: campaignName(row.campaignId),
        updatedAt: row.updatedAt,
      }));
    return {
      assignmentId: a.id,
      questionnaireId: a.questionnaireId,
      versionNumber: String(a.versionNumber),
      title: a.title,
      category: a.category,
      hub: hubForCategory(a.category),
      campaign: isPerCampaignCategory(a.category) && campaign ? campaign.name : a.campaign,
      status: statusOf(response),
      currentStep: response?.currentStep ?? 0,
      responseId: response?.id ?? null,
      updatedAt: response?.updatedAt ?? null,
      pendingSync: response?.transferStatus === 'pending',
      previous,
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
      previous: [],
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
