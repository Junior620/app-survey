import type {
  ChildFacts,
  DetectionResult,
  ExtractedFacts,
  HouseholdEvaluation,
  RulePack,
} from '../types';
import { ENGINE_VERSION } from '../types';
import {
  buildRecommendedActions,
  evaluateDataQualityRules,
  evaluateEconomicWorkRules,
  evaluateHazardousWorkRules,
  evaluateProtectionRules,
  evaluateSchoolRules,
  requiresHumanValidation,
} from './explainableRuleEngine';
import { childHasEssentialGaps, evaluateConsistency } from './consistencyEngine';
import { evaluatePriorityScore } from './priorityScoreEngine';
import { maxSeverity, resolveHighestSeverity, resolveHighestStatus } from './resolvePrimary';

export function evaluateChild(
  child: ChildFacts,
  facts: ExtractedFacts,
  pack: RulePack,
  householdFlags: ReturnType<typeof evaluateConsistency>['flags']
): DetectionResult {
  const signals = [
    ...evaluateDataQualityRules(child, pack),
    ...evaluateProtectionRules(child, pack),
    ...evaluateHazardousWorkRules(child, pack),
    ...evaluateEconomicWorkRules(child, pack),
    ...evaluateSchoolRules(child, pack),
  ];

  const childFlags = householdFlags.filter(
    (f) =>
      !f.parameters?.childId || f.parameters.childId === child.childId
  );
  const essentialMissing = childHasEssentialGaps(child);
  const contradictions = childFlags.some(
    (f) => f.code === 'REPONSE_CONTRADICTOIRE_MACHETE_SANS_AGRI'
  );

  const priority = evaluatePriorityScore(
    child,
    facts.household,
    pack,
    contradictions,
    essentialMissing
  );

  const dqFromFlags = evaluateConsistency(
    { ...facts, children: [child] },
    pack
  );

  const primaryStatus = resolveHighestStatus(signals);
  const severity = resolveHighestSeverity(signals);
  const protectionImmediate =
    severity === 'CRITICAL' || primaryStatus === 'CRITICAL_PROTECTION_ALERT';

  let dataQualityStatus = dqFromFlags.status;
  if (essentialMissing && dataQualityStatus === 'VALID') {
    dataQualityStatus = 'INCOMPLETE';
  }

  return {
    primaryStatus,
    severity,
    childLabourAssessment: {
      status: primaryStatus,
      requiresHumanValidation: requiresHumanValidation(primaryStatus, severity),
    },
    dataQuality: {
      status: dataQualityStatus,
      flags: dqFromFlags.flags,
    },
    riskPrioritization: priority,
    triggeredRules: signals,
    recommendedActions: buildRecommendedActions(primaryStatus, protectionImmediate),
    protectionImmediate,
    rulePackId: pack.id,
    factSchemaVersion: pack.factSchemaVersion,
    engineVersion: ENGINE_VERSION,
    evaluationStatus: 'OK',
    childId: child.childId,
  };
}

export function evaluateClmrs(
  facts: ExtractedFacts,
  pack: RulePack | null
): HouseholdEvaluation {
  if (!pack || pack.status !== 'PUBLISHED') {
    return {
      householdId: facts.household.householdId,
      maxSeverity: 'MODERATE',
      children: [
        {
          // Never claim NO_CASE_DETECTED when pack is missing — pending only.
          primaryStatus: 'CHILD_AT_RISK',
          severity: 'MODERATE',
          childLabourAssessment: {
            status: 'CHILD_AT_RISK',
            requiresHumanValidation: true,
          },
          dataQuality: { status: 'INCOMPLETE', flags: [] },
          riskPrioritization: {
            priorityScore: null,
            band: 'UNDETERMINED',
            selectionStatus: 'AT_RISK_DUE_TO_MISSING_DATA',
            requiresVisit: true,
            reasons: ['clmrs.priority.noValidPack'],
          },
          triggeredRules: [],
          recommendedActions: [
            {
              code: 'WAIT_FOR_PACK',
              messageKey: 'clmrs.actions.waitForPack',
            },
          ],
          protectionImmediate: false,
          rulePackId: pack?.id ?? 'NONE',
          factSchemaVersion: pack?.factSchemaVersion ?? '0',
          engineVersion: ENGINE_VERSION,
          evaluationStatus: 'DETECTION_PENDING',
          childId: null,
        },
      ],
      householdFlags: [],
      dataQuality: { status: 'INCOMPLETE', flags: [] },
    };
  }

  const consistency = evaluateConsistency(facts, pack);
  const children =
    facts.children.length > 0
      ? facts.children.map((c) => evaluateChild(c, facts, pack, consistency.flags))
      : [
          evaluateChild(
            {
              childId: 'unknown-child',
              birthDate: null,
              ageYears: null,
              inSchool: null,
              absenceDays: null,
              schoolDaysInPeriod: null,
              economicActivity: null,
              agriculturalActivity: null,
              activities: [],
              hoursWorkedWeekly: null,
              workDuringSchool: null,
              absenceCausedByWork: null,
              pesticideExposure: null,
              threatOrCoercion: null,
              debtBondage: null,
              traffickingSuspected: null,
              injury: null,
              priorChildLabour: null,
            },
            facts,
            pack,
            consistency.flags
          ),
        ];

  let maxSev = children[0]!.severity;
  for (const c of children) maxSev = maxSeverity(maxSev, c.severity);

  return {
    householdId: facts.household.householdId,
    maxSeverity: maxSev,
    children,
    householdFlags: consistency.flags,
    dataQuality: consistency,
  };
}
