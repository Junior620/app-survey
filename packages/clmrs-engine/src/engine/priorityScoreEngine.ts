import type {
  ChildFacts,
  HouseholdFacts,
  PriorityBand,
  RulePack,
  TriggeredRule,
} from '../types';

export type PriorityResult = {
  priorityScore: number | null;
  band: PriorityBand;
  selectionStatus?: 'AT_RISK_DUE_TO_MISSING_DATA';
  requiresVisit: boolean;
  reasons: string[];
};

export function evaluatePriorityScore(
  child: ChildFacts,
  household: HouseholdFacts,
  pack: RulePack,
  consistencyContradictions: boolean,
  essentialMissing: boolean
): PriorityResult {
  if (essentialMissing) {
    return {
      priorityScore: null,
      band: 'UNDETERMINED',
      selectionStatus: 'AT_RISK_DUE_TO_MISSING_DATA',
      requiresVisit: true,
      reasons: ['clmrs.priority.missingData'],
    };
  }

  const w = pack.parameters.priorityWeights;
  let score = 0;
  const reasons: string[] = [];

  if (child.inSchool === false) {
    score += w.outOfSchool;
    reasons.push('clmrs.priority.outOfSchool');
  }
  if (
    child.absenceDays != null &&
    child.schoolDaysInPeriod != null &&
    child.absenceDays >= Math.max(3, Math.floor((child.schoolDaysInPeriod || 0) * 0.2))
  ) {
    score += w.repeatedAbsence;
    reasons.push('clmrs.priority.repeatedAbsence');
  }
  if (child.priorChildLabour === true) {
    score += w.priorChildLabour;
    reasons.push('clmrs.priority.priorChildLabour');
  }
  if (child.agriculturalActivity === true || child.activities.length > 0) {
    score += w.agriculturalActivity;
    reasons.push('clmrs.priority.agriculturalActivity');
  }
  if (household.adultLabourShortage === true) {
    score += w.adultLabourShortage;
    reasons.push('clmrs.priority.adultLabourShortage');
  }
  if (household.peakHarvestPeriod === true) {
    score += w.peakHarvest;
    reasons.push('clmrs.priority.peakHarvest');
  }
  if (consistencyContradictions) {
    score += w.contradictoryInfo;
    reasons.push('clmrs.priority.contradictoryInfo');
  }

  const { high, moderate } = pack.parameters.priorityThresholds;
  let band: PriorityBand = 'LOW';
  if (score >= high) band = 'HIGH';
  else if (score >= moderate) band = 'MODERATE';

  return {
    priorityScore: score,
    band,
    requiresVisit: band !== 'LOW',
    reasons,
  };
}

/** Exported for tests — unused signals don't affect score calculation directly. */
export function _scoreIgnoresRuleSeverity(_rules: TriggeredRule[]): boolean {
  return true;
}
