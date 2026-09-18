import type {
  ChildFacts,
  ExtractedFacts,
  FactMapping,
  HazardousActivityCode,
  HouseholdFacts,
  VisitFacts,
} from '../types';

type AnswerMap = Record<string, unknown>;

function getAnswer(answers: AnswerMap, stableKey: string | undefined): unknown {
  if (!stableKey) return undefined;
  return answers[stableKey];
}

function asBool(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  if (v === 'yes' || v === 'oui' || v === 'true' || v === 1) return true;
  if (v === 'no' || v === 'non' || v === 'false' || v === 0) return false;
  return null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string' && v) return [v];
  return [];
}

function ageFromBirthDate(iso: string | null, asOf = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  let age = asOf.getFullYear() - d.getFullYear();
  const m = asOf.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

/**
 * Extract household / visit / children facts using a questionnaire mapping.
 * Supports either a single-child flat mapping or JSON array answer for children.
 */
export function extractFacts(
  answers: AnswerMap,
  mapping: FactMapping,
  context: {
    householdId: string;
    visitId?: string | null;
    siteId?: string | null;
    gpsLat?: number | null;
    gpsLng?: number | null;
    plantationLat?: number | null;
    plantationLng?: number | null;
    gpsAccuracyM?: number | null;
  }
): ExtractedFacts {
  const f = mapping.fields;

  const household: HouseholdFacts = {
    householdId: context.householdId,
    childrenCountDeclared: asNumber(getAnswer(answers, f['household.childrenCount'])),
    adultLabourShortage: asBool(getAnswer(answers, f['household.adultLabourShortage'])),
    peakHarvestPeriod: asBool(getAnswer(answers, f['household.peakHarvest'])),
  };

  const visit: VisitFacts = {
    visitId: context.visitId ?? null,
    siteId: context.siteId ?? null,
    gpsLat: context.gpsLat ?? asNumber(getAnswer(answers, f['visit.gpsLat'])),
    gpsLng: context.gpsLng ?? asNumber(getAnswer(answers, f['visit.gpsLng'])),
    plantationLat: context.plantationLat ?? null,
    plantationLng: context.plantationLng ?? null,
    gpsAccuracyM: context.gpsAccuracyM ?? null,
    enumeratorNotes: asString(getAnswer(answers, f['visit.enumeratorNotes'])),
  };

  // Prefer explicit children JSON array if mapped
  const childrenRaw = getAnswer(answers, f['children']);
  let children: ChildFacts[] = [];

  if (Array.isArray(childrenRaw)) {
    children = childrenRaw.map((row, idx) => mapChildRow(row as AnswerMap, idx));
  } else {
    // Flat single-child mapping
    const birthDate = asString(getAnswer(answers, f['children[].birthDate']));
    const ageYears =
      asNumber(getAnswer(answers, f['children[].ageYears'])) ?? ageFromBirthDate(birthDate);
    const activities = asStringArray(
      getAnswer(answers, f['children[].activities'])
    ) as HazardousActivityCode[];

    const childId =
      asString(getAnswer(answers, f['children[].childId'])) ||
      `child-${context.householdId}-0`;

    // Only add a child slot if any child-related field was answered
    const anyChildField = [
      f['children[].birthDate'],
      f['children[].ageYears'],
      f['children[].inSchool'],
      f['children[].activities'],
      f['children[].economicActivity'],
    ].some((k) => k && getAnswer(answers, k) != null);

    if (anyChildField) {
      children = [
        {
          childId,
          birthDate,
          ageYears,
          inSchool: asBool(getAnswer(answers, f['children[].inSchool'])),
          absenceDays: asNumber(getAnswer(answers, f['children[].absenceDays'])),
          schoolDaysInPeriod: asNumber(
            getAnswer(answers, f['children[].schoolDaysInPeriod'])
          ),
          economicActivity: asBool(getAnswer(answers, f['children[].economicActivity'])),
          agriculturalActivity: asBool(
            getAnswer(answers, f['children[].agriculturalActivity'])
          ),
          activities,
          hoursWorkedWeekly: asNumber(
            getAnswer(answers, f['children[].hoursWorkedWeekly'])
          ),
          workDuringSchool: asBool(getAnswer(answers, f['children[].workDuringSchool'])),
          absenceCausedByWork: asBool(
            getAnswer(answers, f['children[].absenceCausedByWork'])
          ),
          pesticideExposure: asBool(
            getAnswer(answers, f['children[].pesticideExposure'])
          ),
          threatOrCoercion: asBool(getAnswer(answers, f['children[].threatOrCoercion'])),
          debtBondage: asBool(getAnswer(answers, f['children[].debtBondage'])),
          traffickingSuspected: asBool(
            getAnswer(answers, f['children[].traffickingSuspected'])
          ),
          injury: asBool(getAnswer(answers, f['children[].injury'])),
          priorChildLabour: asBool(getAnswer(answers, f['children[].priorChildLabour'])),
        },
      ];
    }
  }

  return { household, visit, children };
}

function mapChildRow(row: AnswerMap, idx: number): ChildFacts {
  const birthDate = asString(row.birthDate ?? row.birth_date);
  return {
    childId: asString(row.childId ?? row.id) || `child-${idx}`,
    birthDate,
    ageYears: asNumber(row.ageYears ?? row.age) ?? ageFromBirthDate(birthDate),
    inSchool: asBool(row.inSchool ?? row.in_school),
    absenceDays: asNumber(row.absenceDays),
    schoolDaysInPeriod: asNumber(row.schoolDaysInPeriod),
    economicActivity: asBool(row.economicActivity),
    agriculturalActivity: asBool(row.agriculturalActivity),
    activities: asStringArray(row.activities) as HazardousActivityCode[],
    hoursWorkedWeekly: asNumber(row.hoursWorkedWeekly),
    workDuringSchool: asBool(row.workDuringSchool),
    absenceCausedByWork: asBool(row.absenceCausedByWork),
    pesticideExposure: asBool(row.pesticideExposure),
    threatOrCoercion: asBool(row.threatOrCoercion),
    debtBondage: asBool(row.debtBondage),
    traffickingSuspected: asBool(row.traffickingSuspected),
    injury: asBool(row.injury),
    priorChildLabour: asBool(row.priorChildLabour),
  };
}

/** Simple stable hash for idempotency (not cryptographic). */
export function hashFactsInput(
  surveyResponseId: string,
  childId: string,
  packId: string,
  factsSlice: unknown
): string {
  const raw = JSON.stringify({ surveyResponseId, childId, packId, factsSlice });
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(h).toString(16)}`;
}
