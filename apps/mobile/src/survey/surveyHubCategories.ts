import type { QuestionnaireCategory } from '@appsurvey/shared';
import type { SemanticIconName } from '../components/common/icons';

export type SurveyHubId = 'menage' | 'annuelle' | 'enfant' | 'autre';

export type SurveyHubDef = {
  id: SurveyHubId;
  categories: QuestionnaireCategory[];
  icon: SemanticIconName;
  titleKey: string;
  descriptionKey: string;
};

/** Single mapping from published questionnaire categories to the 3 field hubs. */
export const SURVEY_HUBS: SurveyHubDef[] = [
  {
    id: 'menage',
    categories: ['menage'],
    icon: 'home',
    titleKey: 'producerHub.household',
    descriptionKey: 'producerHub.householdDesc',
  },
  {
    id: 'enfant',
    categories: ['protection_enfant'],
    icon: 'shield',
    titleKey: 'producerHub.childLabour',
    descriptionKey: 'producerHub.childLabourDesc',
  },
  {
    id: 'annuelle',
    categories: ['enquete_annuelle'],
    icon: 'calendar',
    titleKey: 'producerHub.annual',
    descriptionKey: 'producerHub.annualDesc',
  },
];

const OTHER_HUB: SurveyHubDef = {
  id: 'autre',
  categories: [],
  icon: 'clipboard',
  titleKey: 'producerHub.other',
  descriptionKey: 'producerHub.otherDesc',
};

export function hubForCategory(category: string): SurveyHubId {
  const hit = SURVEY_HUBS.find((h) =>
    (h.categories as string[]).includes(category)
  );
  return hit?.id ?? 'autre';
}

export function hubDef(id: string): SurveyHubDef {
  return SURVEY_HUBS.find((h) => h.id === id) ?? OTHER_HUB;
}

export function isSurveyHubId(value: string): value is SurveyHubId {
  return value === 'menage' || value === 'annuelle' || value === 'enfant' || value === 'autre';
}
