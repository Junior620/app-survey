/**
 * Survey campaigns: admin-defined periods (inclusive dates, YYYY-MM-DD).
 * Household, education and annual surveys restart for every campaign.
 * Pure helpers, shared by repositories, screens and tests.
 */

export type CampaignStatus = 'active' | 'closed';

export type Campaign = {
  id: string;
  cooperativeId: string | null;
  name: string;
  startsOn: string;
  endsOn: string;
  status: CampaignStatus;
};

/** Questionnaire categories answered once per campaign. */
export const PER_CAMPAIGN_CATEGORIES: readonly string[] = ['menage', 'enquete_annuelle', 'protection_enfant'];

export function isPerCampaignCategory(category: string): boolean {
  return PER_CAMPAIGN_CATEGORIES.includes(category);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar day (YYYY-MM-DD) of an ISO timestamp or Date. */
export function dayOf(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function campaignCovers(campaign: Campaign, day: string): boolean {
  return day >= campaign.startsOn && day <= campaign.endsOn;
}

/** The active campaign covering `at`; when several overlap, the one that started last. */
export function pickActiveCampaign(campaigns: Campaign[], at: string | Date = new Date()): Campaign | null {
  const day = dayOf(at);
  let best: Campaign | null = null;
  for (const campaign of campaigns) {
    if (campaign.status !== 'active' || !campaignCovers(campaign, day)) continue;
    if (!best || campaign.startsOn > best.startsOn) best = campaign;
  }
  return best;
}

/**
 * A response belongs to a campaign when it was saved for it, or, for responses saved
 * before campaigns existed (no campaign id), when it was created inside its dates.
 */
export function responseInCampaign(
  response: { campaignId: string | null; createdAt: string },
  campaign: Campaign
): boolean {
  if (response.campaignId) return response.campaignId === campaign.id;
  return campaignCovers(campaign, dayOf(response.createdAt));
}

/** Validation for the admin form; returns an error message or null. */
export function campaignInputError(input: { name: string; startsOn: string; endsOn: string }): string | null {
  if (!input.name.trim()) return 'Indiquez le nom de la campagne.';
  if (!DATE.test(input.startsOn) || !DATE.test(input.endsOn)) return 'Dates au format AAAA-MM-JJ.';
  if (Number.isNaN(new Date(input.startsOn).getTime()) || Number.isNaN(new Date(input.endsOn).getTime())) {
    return 'Date invalide.';
  }
  if (input.endsOn < input.startsOn) return 'La date de fin doit suivre la date de début.';
  return null;
}

type CampaignResponse = { templateKey: string; campaignId: string | null; createdAt: string };

/**
 * Response shown for a questionnaire on the planter page. Responses are newest first.
 * Per-campaign questionnaires only count a response of the active campaign; without an
 * active campaign (or for other questionnaires) the latest response counts, as before.
 */
export function pickCampaignResponse<T extends CampaignResponse>(
  responses: T[],
  questionnaireId: string,
  category: string,
  campaign: Campaign | null
): T | undefined {
  const own = responses.filter((response) => response.templateKey === questionnaireId);
  if (!campaign || !isPerCampaignCategory(category)) return own[0];
  return own.find((response) => responseInCampaign(response, campaign));
}

/** Responses of earlier campaigns, kept for consultation (newest first). */
export function previousCampaignResponses<T extends CampaignResponse>(
  responses: T[],
  questionnaireId: string,
  category: string,
  campaign: Campaign | null
): T[] {
  if (!campaign || !isPerCampaignCategory(category)) return [];
  return responses.filter(
    (response) => response.templateKey === questionnaireId && !responseInCampaign(response, campaign)
  );
}
