import type {
  ChildFacts,
  DetectionStatus,
  RecommendedAction,
  RulePack,
  Severity,
  TriggeredRule,
} from '../types';
import { childHasEssentialGaps } from './consistencyEngine';

export function evaluateDataQualityRules(
  child: ChildFacts,
  _pack: RulePack
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  if (childHasEssentialGaps(child)) {
    rules.push({
      ruleCode: 'R-DQ-01',
      messageKey: 'clmrs.rules.essentialDataMissing',
      parameters: { childId: child.childId },
      severity: 'MODERATE',
      detectionStatus: 'CHILD_AT_RISK',
    });
  }
  return rules;
}

export function evaluateProtectionRules(
  child: ChildFacts,
  _pack: RulePack
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  if (
    child.threatOrCoercion === true ||
    child.debtBondage === true ||
    child.traffickingSuspected === true
  ) {
    rules.push({
      ruleCode: 'R-PROT-01',
      messageKey: 'clmrs.rules.threatOrCoercion',
      parameters: { childId: child.childId },
      severity: 'CRITICAL',
      detectionStatus: 'CRITICAL_PROTECTION_ALERT',
    });
  }
  if (child.injury === true) {
    rules.push({
      ruleCode: 'R-PROT-02',
      messageKey: 'clmrs.rules.injuryObserved',
      parameters: { childId: child.childId },
      severity: 'HIGH',
      detectionStatus: 'CHILD_AT_RISK',
    });
  }
  return rules;
}

export function evaluateHazardousWorkRules(
  child: ChildFacts,
  pack: RulePack
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const hazList = new Set(pack.parameters.hazardousActivities);
  const hazFound = child.activities.filter((a) => hazList.has(a));
  const pesticide =
    child.pesticideExposure === true || hazFound.includes('PESTICIDE_APPLICATION');

  if (pesticide) {
    rules.push({
      ruleCode: 'R-PES-01',
      messageKey: 'clmrs.rules.pesticideExposure',
      parameters: { childId: child.childId, childAge: child.ageYears },
      severity: 'CRITICAL',
      detectionStatus: 'CRITICAL_PROTECTION_ALERT',
    });
  }

  const underHazardAge =
    child.ageYears != null &&
    child.ageYears < pack.parameters.hazardousWorkMinimumAge;

  if (hazFound.length > 0 && (underHazardAge || child.ageYears == null)) {
    // Age unknown + hazardous activity still raises hazardous signal (plus DQ elsewhere)
    rules.push({
      ruleCode: 'R-HAZ-01',
      messageKey: 'clmrs.rules.hazardousActivity',
      parameters: {
        childId: child.childId,
        childAge: child.ageYears,
        activities: hazFound,
      },
      severity: pesticide ? 'CRITICAL' : 'HIGH',
      detectionStatus: 'HAZARDOUS_CHILD_LABOUR',
    });
  }

  return rules;
}

export function evaluateEconomicWorkRules(
  child: ChildFacts,
  pack: RulePack
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  if (
    child.ageYears != null &&
    child.ageYears < pack.parameters.minimumWorkingAge &&
    child.economicActivity === true
  ) {
    rules.push({
      ruleCode: 'R-AGE-01',
      messageKey: 'clmrs.rules.belowMinimumWorkingAge',
      parameters: {
        childId: child.childId,
        childAge: child.ageYears,
        minimumWorkingAge: pack.parameters.minimumWorkingAge,
      },
      severity: 'HIGH',
      detectionStatus: 'CHILD_LABOUR_DETECTED',
    });
  }
  return rules;
}

export function evaluateSchoolRules(
  child: ChildFacts,
  pack: RulePack
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const maxHours =
    child.ageYears != null
      ? pack.parameters.maxWeeklyHoursByAge?.[String(child.ageYears)]
      : undefined;

  if (
    child.workDuringSchool === true ||
    child.absenceCausedByWork === true ||
    (maxHours != null &&
      child.hoursWorkedWeekly != null &&
      child.hoursWorkedWeekly > maxHours)
  ) {
    rules.push({
      ruleCode: 'R-SCHOOL-03',
      messageKey: 'clmrs.rules.schoolInterference',
      parameters: {
        childId: child.childId,
        hoursWorkedWeekly: child.hoursWorkedWeekly,
        maxHours,
      },
      severity: 'MODERATE',
      detectionStatus: 'SUSPECTED_CHILD_LABOUR',
    });
  }

  if (child.inSchool === false && child.ageYears != null && child.ageYears < 18) {
    rules.push({
      ruleCode: 'R-SCHOOL-01',
      messageKey: 'clmrs.rules.outOfSchool',
      parameters: { childId: child.childId, childAge: child.ageYears },
      severity: 'MODERATE',
      detectionStatus: 'CHILD_AT_RISK',
    });
  }

  return rules;
}

export function buildRecommendedActions(
  status: DetectionStatus,
  protectionImmediate: boolean
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  if (protectionImmediate || status === 'CRITICAL_PROTECTION_ALERT') {
    actions.push({
      code: 'IMMEDIATE_PROTECTION',
      messageKey: 'clmrs.actions.immediateProtection',
    });
    actions.push({
      code: 'SUPERVISOR_VALIDATION',
      messageKey: 'clmrs.actions.supervisorValidation',
    });
  } else if (status === 'HAZARDOUS_CHILD_LABOUR') {
    actions.push({
      code: 'REMOVE_HAZARDOUS_TASK',
      messageKey: 'clmrs.actions.removeHazardousTask',
    });
    actions.push({
      code: 'PRIORITY_VISIT',
      messageKey: 'clmrs.actions.priorityVisit',
    });
  } else if (status === 'CHILD_LABOUR_DETECTED' || status === 'SUSPECTED_CHILD_LABOUR') {
    actions.push({
      code: 'COUNTER_INVESTIGATION',
      messageKey: 'clmrs.actions.counterInvestigation',
    });
  } else if (status === 'CHILD_AT_RISK') {
    actions.push({
      code: 'SCHEDULE_FOLLOW_UP',
      messageKey: 'clmrs.actions.scheduleFollowUp',
    });
  }
  return actions;
}

export function requiresHumanValidation(status: DetectionStatus, severity: Severity): boolean {
  return (
    severity === 'CRITICAL' ||
    severity === 'HIGH' ||
    status === 'SUSPECTED_CHILD_LABOUR' ||
    status === 'CHILD_LABOUR_DETECTED' ||
    status === 'HAZARDOUS_CHILD_LABOUR' ||
    status === 'CRITICAL_PROTECTION_ALERT'
  );
}
