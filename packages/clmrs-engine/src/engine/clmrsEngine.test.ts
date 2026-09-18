import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateClmrs,
  extractFacts,
  hashFactsInput,
  loadEmbeddedCmPack,
  resolveHighestSeverity,
  SEVERITY_RANK,
  validateRulePack,
  type ChildFacts,
  type ExtractedFacts,
  type FactMapping,
} from '../index';

const pack = loadEmbeddedCmPack();

const mapping: FactMapping = {
  surveyTemplate: 'protection_enfant',
  surveyVersion: '1',
  factSchemaVersion: '1.0',
  fields: {
    'household.childrenCount': 'pe_nb_enfants',
    'children[].childId': 'pe_enfant_id',
    'children[].birthDate': 'pe_enfant_date_naissance',
    'children[].ageYears': 'pe_enfant_age',
    'children[].inSchool': 'pe_enfant_scolarise',
    'children[].activities': 'pe_enfant_activites',
    'children[].economicActivity': 'pe_enfant_activite_eco',
    'children[].agriculturalActivity': 'pe_enfant_activite_agri',
    'children[].hoursWorkedWeekly': 'pe_enfant_heures',
    'children[].pesticideExposure': 'pe_enfant_pesticide',
    'children[].workDuringSchool': 'pe_enfant_travail_ecole',
  },
};

function baseChild(over: Partial<ChildFacts> = {}): ChildFacts {
  return {
    childId: 'c1',
    birthDate: '2015-01-01',
    ageYears: 11,
    inSchool: true,
    absenceDays: null,
    schoolDaysInPeriod: null,
    economicActivity: false,
    agriculturalActivity: false,
    activities: [],
    hoursWorkedWeekly: null,
    workDuringSchool: null,
    absenceCausedByWork: null,
    pesticideExposure: false,
    threatOrCoercion: false,
    debtBondage: false,
    traffickingSuspected: false,
    injury: false,
    priorChildLabour: false,
    ...over,
  };
}

function factsWith(...children: ChildFacts[]): ExtractedFacts {
  return {
    household: {
      householdId: 'hh1',
      childrenCountDeclared: children.length,
      adultLabourShortage: false,
      peakHarvestPeriod: false,
    },
    visit: {
      visitId: null,
      siteId: null,
      gpsLat: 5.3,
      gpsLng: -4.0,
      plantationLat: 5.3,
      plantationLng: -4.0,
      gpsAccuracyM: 10,
      enumeratorNotes: null,
    },
    children,
  };
}

describe('validateRulePack', () => {
  it('accepts embedded CM pack', () => {
    assert.equal(validateRulePack(pack), true);
    assert.equal(pack.id, 'CM/2026.1');
    assert.equal(pack.status, 'PUBLISHED');
  });
});

describe('pesticide + missing age', () => {
  it('emits critical protection AND incomplete data quality', () => {
    const eval_ = evaluateClmrs(
      factsWith(
        baseChild({
          birthDate: null,
          ageYears: null,
          pesticideExposure: true,
        })
      ),
      pack
    );
    const child = eval_.children[0]!;
    assert.equal(child.primaryStatus, 'CRITICAL_PROTECTION_ALERT');
    assert.equal(child.severity, 'CRITICAL');
    assert.ok(
      child.triggeredRules.some((r) => r.ruleCode === 'R-PES-01'),
      'pesticide rule'
    );
    assert.ok(
      child.triggeredRules.some((r) => r.ruleCode === 'R-DQ-01'),
      'data quality rule'
    );
    assert.equal(child.dataQuality.status, 'INCOMPLETE');
    assert.equal(child.riskPrioritization.band, 'UNDETERMINED');
    assert.equal(child.riskPrioritization.priorityScore, null);
  });
});

describe('multi-children', () => {
  it('returns distinct per-child results', () => {
    const eval_ = evaluateClmrs(
      factsWith(
        baseChild({
          childId: 'safe',
          ageYears: 16,
          economicActivity: false,
          pesticideExposure: false,
        }),
        baseChild({
          childId: 'risk',
          ageYears: 10,
          economicActivity: true,
          pesticideExposure: false,
        })
      ),
      pack
    );
    assert.equal(eval_.children.length, 2);
    const safe = eval_.children.find((c) => c.childId === 'safe')!;
    const risk = eval_.children.find((c) => c.childId === 'risk')!;
    assert.equal(safe.primaryStatus, 'NO_CASE_DETECTED');
    assert.equal(risk.primaryStatus, 'CHILD_LABOUR_DETECTED');
    assert.ok(SEVERITY_RANK[eval_.maxSeverity] >= SEVERITY_RANK[risk.severity]);
  });
});

describe('age and hours boundaries', () => {
  it('age exactly 14 does not trigger below-minimum-age labour', () => {
    const eval_ = evaluateClmrs(
      factsWith(
        baseChild({
          ageYears: 14,
          birthDate: '2012-01-01',
          economicActivity: true,
        })
      ),
      pack
    );
    assert.ok(!eval_.children[0]!.triggeredRules.some((r) => r.ruleCode === 'R-AGE-01'));
  });

  it('age exactly 18 does not trigger hazardous-by-age', () => {
    const eval_ = evaluateClmrs(
      factsWith(
        baseChild({
          ageYears: 18,
          birthDate: '2008-01-01',
          activities: ['MACHETE_USE'],
          pesticideExposure: false,
        })
      ),
      pack
    );
    assert.ok(!eval_.children[0]!.triggeredRules.some((r) => r.ruleCode === 'R-HAZ-01'));
  });

  it('hours equal to threshold do not trigger school hours rule', () => {
    const eval_ = evaluateClmrs(
      factsWith(
        baseChild({
          ageYears: 14,
          birthDate: '2012-01-01',
          hoursWorkedWeekly: 20,
          workDuringSchool: false,
          absenceCausedByWork: false,
        })
      ),
      pack
    );
    assert.ok(!eval_.children[0]!.triggeredRules.some((r) => r.ruleCode === 'R-SCHOOL-03'));
  });

  it('unknown birth does not invent a score', () => {
    const eval_ = evaluateClmrs(
      factsWith(baseChild({ birthDate: null, ageYears: null })),
      pack
    );
    assert.equal(eval_.children[0]!.riskPrioritization.priorityScore, null);
    assert.equal(
      eval_.children[0]!.riskPrioritization.selectionStatus,
      'AT_RISK_DUE_TO_MISSING_DATA'
    );
  });
});

describe('hazardous activity outside pack list', () => {
  it('ignores unknown activity codes', () => {
    const eval_ = evaluateClmrs(
      factsWith(
        baseChild({
          ageYears: 12,
          activities: ['UNKNOWN_TASK'],
          pesticideExposure: false,
        })
      ),
      pack
    );
    assert.ok(!eval_.children[0]!.triggeredRules.some((r) => r.ruleCode === 'R-HAZ-01'));
  });
});

describe('idempotence hash', () => {
  it('same inputs produce same hash', () => {
    const a = hashFactsInput('sr1', 'c1', pack.id, { x: 1 });
    const b = hashFactsInput('sr1', 'c1', pack.id, { x: 1 });
    assert.equal(a, b);
  });

  it('different inputs differ', () => {
    const a = hashFactsInput('sr1', 'c1', pack.id, { x: 1 });
    const b = hashFactsInput('sr1', 'c1', pack.id, { x: 2 });
    assert.notEqual(a, b);
  });
});

describe('pack absent', () => {
  it('returns DETECTION_PENDING never NO_CASE as final eval', () => {
    const eval_ = evaluateClmrs(factsWith(baseChild()), null);
    assert.equal(eval_.children[0]!.evaluationStatus, 'DETECTION_PENDING');
    assert.notEqual(eval_.children[0]!.primaryStatus, 'NO_CASE_DETECTED');
  });

  it('draft pack is treated as pending', () => {
    const draft = { ...pack, status: 'DRAFT' as const };
    const eval_ = evaluateClmrs(factsWith(baseChild()), draft);
    assert.equal(eval_.children[0]!.evaluationStatus, 'DETECTION_PENDING');
  });
});

describe('monotonicity', () => {
  it('adding critical evidence never lowers severity', () => {
    const base = evaluateClmrs(
      factsWith(baseChild({ ageYears: 10, economicActivity: true })),
      pack
    );
    const withCrit = evaluateClmrs(
      factsWith(
        baseChild({
          ageYears: 10,
          economicActivity: true,
          pesticideExposure: true,
        })
      ),
      pack
    );
    assert.ok(
      SEVERITY_RANK[withCrit.children[0]!.severity] >=
        SEVERITY_RANK[base.children[0]!.severity]
    );
    assert.ok(
      SEVERITY_RANK[resolveHighestSeverity(withCrit.children[0]!.triggeredRules)] >=
        SEVERITY_RANK[resolveHighestSeverity(base.children[0]!.triggeredRules)]
    );
  });
});

describe('extractFacts mapping', () => {
  it('maps flat questionnaire answers', () => {
    const facts = extractFacts(
      {
        pe_nb_enfants: 1,
        pe_enfant_id: 'e1',
        pe_enfant_age: 9,
        pe_enfant_pesticide: true,
        pe_enfant_activites: ['PESTICIDE_APPLICATION'],
      },
      mapping,
      { householdId: 'hh-x' }
    );
    assert.equal(facts.children.length, 1);
    assert.equal(facts.children[0]!.ageYears, 9);
    assert.equal(facts.children[0]!.pesticideExposure, true);
  });
});

describe('GPS', () => {
  it('flags unavailable GPS', () => {
    const f = factsWith(baseChild());
    f.visit.gpsLat = null;
    f.visit.gpsLng = null;
    f.visit.gpsAccuracyM = null;
    const eval_ = evaluateClmrs(f, pack);
    assert.ok(
      eval_.householdFlags.some((x) => x.code === 'GPS_UNAVAILABLE') ||
        eval_.dataQuality.flags.some((x) => x.code === 'GPS_UNAVAILABLE')
    );
  });
});
