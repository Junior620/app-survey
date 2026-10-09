export type WorkActivityKind =
  | 'survey'
  | 'planteur'
  | 'parcelle'
  | 'mission'
  | 'formation'
  | 'visite'
  | 'site';

/** Light provenance hint — not a parallel router stack. */
export type NavigationOrigin =
  | 'home'
  | 'terrain'
  | 'activities'
  | 'search'
  | 'mission'
  | 'formation'
  | 'map'
  | 'recent'
  | 'deep-link'
  | 'site'
  | 'sync';

export type WorkContextIds = {
  siteId?: string | null;
  planteurId?: string | null;
  parcelleId?: string | null;
  missionId?: string | null;
  formationId?: string | null;
  questionnaireId?: string | null;
  versionNumber?: string | null;
  responseId?: string | null;
};

export type WorkContext = {
  kind: WorkActivityKind;
  ids: WorkContextIds;
  title: string;
  subtitle?: string;
  /** Optional origin hint for deep-link / ambiguous entry (fallback only). */
  origin?: NavigationOrigin;
  /** Pathname (and optional query) when the screen was opened — fallback only. */
  previousRoute?: string;
  /**
   * @deprecated Prefer previousRoute / origin. Kept as fallback alias.
   */
  parentRoute?: string;
  updatedAt: string;
};

export type ResumeActivity = {
  kind: 'survey';
  responseId: string;
  questionnaireId: string;
  versionNumber: string;
  siteId: string | null;
  planteurId: string | null;
  title: string;
  subtitle?: string;
  currentStep: number;
  updatedAt: string;
};

export type OpenOpts = {
  origin?: NavigationOrigin;
};

export type OpenPlanteurFormParams = OpenOpts & {
  siteId?: string;
  planteurId?: string;
  mode?: 'edit' | 'create';
};

export type OpenParcelleParams = OpenOpts & {
  planteurId: string;
  parcelleId?: string;
  siteId?: string;
};

export type StartSurveyParams = OpenOpts & {
  questionnaireId: string;
  versionNumber: string;
  siteId?: string | null;
  planteurId?: string | null;
  responseId?: string | null;
};
