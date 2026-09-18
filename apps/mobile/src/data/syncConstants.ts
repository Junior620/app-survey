export const DEFAULT_COOPERATIVE_ID = 'scpb-default';
export const ATTACHMENTS_BUCKET = 'attachments';

/** Maps outbox entity_type → remote mirror table name. */
export const MIRROR_TABLE_BY_ENTITY: Record<string, string> = {
  site: 'sites',
  secteur: 'secteurs',
  village: 'villages',
  planteur: 'planteurs',
  parcelle: 'parcelles',
  formation: 'formations',
  seance: 'seances',
  participation: 'participations',
  mission: 'missions',
  survey_response: 'survey_responses_remote',
  questionnaire: 'questionnaires_remote',
  questionnaire_version: 'questionnaire_versions_remote',
  questionnaire_assignment: 'questionnaire_assignments_remote',
  attachment: 'attachments_meta',
  geometry_version: 'geometry_versions_remote',
};

export const PULL_MIRROR_TABLES = [
  'sites',
  'planteurs',
  'survey_responses_remote',
  'secteurs',
  'villages',
  'parcelles',
  'formations',
  'seances',
  'participations',
  'missions',
  'questionnaires_remote',
  'questionnaire_versions_remote',
  'questionnaire_assignments_remote',
  'attachments_meta',
  'geometry_versions_remote',
] as const;

export type PullMirrorTable = (typeof PULL_MIRROR_TABLES)[number];
