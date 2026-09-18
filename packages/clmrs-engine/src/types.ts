/** CLMRS / SSRTE detection types — stable technical enums (UI labels live separately). */

export const ENGINE_VERSION = '1.0.0';

export type DetectionStatus =
  | 'NO_CASE_DETECTED'
  | 'CHILD_AT_RISK'
  | 'SUSPECTED_CHILD_LABOUR'
  | 'CHILD_LABOUR_DETECTED'
  | 'HAZARDOUS_CHILD_LABOUR'
  | 'CRITICAL_PROTECTION_ALERT';

export type Severity = 'INFO' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type DataQualityStatus = 'VALID' | 'WARNING' | 'INCOMPLETE' | 'BLOCKING';

export type PriorityBand = 'LOW' | 'MODERATE' | 'HIGH' | 'UNDETERMINED';

export type ConsistencyFlagCode =
  | 'INCOHERENCE_ZERO_CHILDREN_WITH_CHILD_FORM'
  | 'INCOHERENCE_ABSENCE_GT_SCHOOL_DAYS'
  | 'REPONSE_CONTRADICTOIRE_MACHETE_SANS_AGRI'
  | 'DOUBLON_POTENTIEL_ENFANT'
  | 'ANOMALIE_GEOLOCALISATION'
  | 'ESSENTIAL_DATA_MISSING'
  | 'GPS_UNAVAILABLE';

export type ConsistencyFlag = {
  code: ConsistencyFlagCode;
  messageKey: string;
  questionStableKeys?: string[];
  parameters?: Record<string, unknown>;
};

export type TriggeredRule = {
  ruleCode: string;
  messageKey: string;
  parameters: Record<string, unknown>;
  severity: Severity;
  detectionStatus?: DetectionStatus;
};

export type RecommendedAction = {
  code: string;
  messageKey: string;
  parameters?: Record<string, unknown>;
};

export type DetectionResult = {
  primaryStatus: DetectionStatus;
  severity: Severity;
  childLabourAssessment: {
    status: DetectionStatus;
    requiresHumanValidation: boolean;
  };
  dataQuality: {
    status: DataQualityStatus;
    flags: ConsistencyFlag[];
  };
  riskPrioritization: {
    priorityScore: number | null;
    band: PriorityBand;
    selectionStatus?: 'AT_RISK_DUE_TO_MISSING_DATA';
    requiresVisit: boolean;
    reasons: string[];
  };
  triggeredRules: TriggeredRule[];
  recommendedActions: RecommendedAction[];
  protectionImmediate: boolean;
  rulePackId: string;
  factSchemaVersion: string;
  engineVersion: string;
  evaluationStatus: 'OK' | 'DETECTION_PENDING';
  childId: string | null;
};

export type HouseholdEvaluation = {
  householdId: string;
  maxSeverity: Severity;
  children: DetectionResult[];
  householdFlags: ConsistencyFlag[];
  dataQuality: {
    status: DataQualityStatus;
    flags: ConsistencyFlag[];
  };
};

export type HazardousActivityCode =
  | 'PESTICIDE_APPLICATION'
  | 'MACHETE_USE'
  | 'HEAVY_LOAD'
  | 'TREE_CLIMBING'
  | 'NIGHT_WORK'
  | 'MOTORIZED_MACHINE'
  | string;

export type RulePackParameters = {
  minimumWorkingAge: number;
  hazardousWorkMinimumAge: number;
  hazardousActivities: HazardousActivityCode[];
  maxWeeklyHoursByAge?: Record<string, number>;
  schoolDayHours?: { start: string; end: string };
  priorityWeights: {
    outOfSchool: number;
    repeatedAbsence: number;
    priorChildLabour: number;
    agriculturalActivity: number;
    adultLabourShortage: number;
    peakHarvest: number;
    contradictoryInfo: number;
  };
  priorityThresholds: {
    high: number;
    moderate: number;
  };
};

export type RulePack = {
  id: string;
  country: string;
  ruleVersion: string;
  factSchemaVersion: string;
  schemaVersion: string;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  effectiveFrom: string;
  effectiveTo: string | null;
  contentHash: string;
  sourceReferences: string[];
  parameters: RulePackParameters;
};

export type FactMapping = {
  surveyTemplate: string;
  surveyVersion: string;
  factSchemaVersion: string;
  fields: Record<string, string>;
};

export type ChildFacts = {
  childId: string;
  birthDate: string | null;
  ageYears: number | null;
  inSchool: boolean | null;
  absenceDays: number | null;
  schoolDaysInPeriod: number | null;
  economicActivity: boolean | null;
  agriculturalActivity: boolean | null;
  activities: HazardousActivityCode[];
  hoursWorkedWeekly: number | null;
  workDuringSchool: boolean | null;
  absenceCausedByWork: boolean | null;
  pesticideExposure: boolean | null;
  threatOrCoercion: boolean | null;
  debtBondage: boolean | null;
  traffickingSuspected: boolean | null;
  injury: boolean | null;
  priorChildLabour: boolean | null;
};

export type HouseholdFacts = {
  householdId: string;
  childrenCountDeclared: number | null;
  adultLabourShortage: boolean | null;
  peakHarvestPeriod: boolean | null;
};

export type VisitFacts = {
  visitId: string | null;
  siteId: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  plantationLat: number | null;
  plantationLng: number | null;
  gpsAccuracyM: number | null;
  enumeratorNotes: string | null;
};

export type ExtractedFacts = {
  household: HouseholdFacts;
  visit: VisitFacts;
  children: ChildFacts[];
};

export const SEVERITY_RANK: Record<Severity, number> = {
  INFO: 0,
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const STATUS_RANK: Record<DetectionStatus, number> = {
  NO_CASE_DETECTED: 0,
  CHILD_AT_RISK: 1,
  SUSPECTED_CHILD_LABOUR: 2,
  CHILD_LABOUR_DETECTED: 3,
  HAZARDOUS_CHILD_LABOUR: 4,
  CRITICAL_PROTECTION_ALERT: 5,
};
