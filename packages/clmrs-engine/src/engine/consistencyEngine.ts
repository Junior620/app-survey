import type {
  ChildFacts,
  ConsistencyFlag,
  DataQualityStatus,
  ExtractedFacts,
  RulePack,
  VisitFacts,
} from '../types';

function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function evaluateConsistency(
  facts: ExtractedFacts,
  _pack: RulePack
): { status: DataQualityStatus; flags: ConsistencyFlag[] } {
  const flags: ConsistencyFlag[] = [];

  if (
    (facts.household.childrenCountDeclared === 0 ||
      facts.household.childrenCountDeclared === null) &&
    facts.children.length > 0
  ) {
    flags.push({
      code: 'INCOHERENCE_ZERO_CHILDREN_WITH_CHILD_FORM',
      messageKey: 'clmrs.consistency.zeroChildrenWithForm',
    });
  }

  for (const child of facts.children) {
    if (
      child.inSchool === true &&
      child.absenceDays != null &&
      child.schoolDaysInPeriod != null &&
      child.absenceDays > child.schoolDaysInPeriod
    ) {
      flags.push({
        code: 'INCOHERENCE_ABSENCE_GT_SCHOOL_DAYS',
        messageKey: 'clmrs.consistency.absenceGtSchoolDays',
        parameters: { childId: child.childId, absenceDays: child.absenceDays },
      });
    }

    if (
      child.agriculturalActivity === false &&
      child.activities.includes('MACHETE_USE')
    ) {
      flags.push({
        code: 'REPONSE_CONTRADICTOIRE_MACHETE_SANS_AGRI',
        messageKey: 'clmrs.consistency.macheteWithoutAgri',
        parameters: { childId: child.childId },
      });
    }

    const essentialMissing =
      child.ageYears == null &&
      child.birthDate == null &&
      (child.economicActivity == null || child.activities.length === 0);
    if (essentialMissing) {
      flags.push({
        code: 'ESSENTIAL_DATA_MISSING',
        messageKey: 'clmrs.consistency.essentialDataMissing',
        parameters: { childId: child.childId },
      });
    }
  }

  const seen = new Map<string, string>();
  for (const child of facts.children) {
    const key = `${child.birthDate ?? 'null'}|${child.childId}`;
    // Soft duplicate: same birthDate appearing twice with different ids in same household
    if (child.birthDate) {
      const prev = seen.get(child.birthDate);
      if (prev && prev !== child.childId) {
        flags.push({
          code: 'DOUBLON_POTENTIEL_ENFANT',
          messageKey: 'clmrs.consistency.potentialDuplicate',
          parameters: { childId: child.childId, otherId: prev },
        });
      }
      seen.set(child.birthDate, child.childId);
    }
  }

  const geo = checkGeo(facts.visit);
  flags.push(...geo);

  const blocking = flags.some(
    (f) =>
      f.code === 'INCOHERENCE_ZERO_CHILDREN_WITH_CHILD_FORM' ||
      f.code === 'INCOHERENCE_ABSENCE_GT_SCHOOL_DAYS' ||
      f.code === 'DOUBLON_POTENTIEL_ENFANT'
  );
  const incomplete = flags.some((f) => f.code === 'ESSENTIAL_DATA_MISSING');
  const warning = flags.length > 0 && !blocking && !incomplete;

  let status: DataQualityStatus = 'VALID';
  if (blocking) status = 'BLOCKING';
  else if (incomplete) status = 'INCOMPLETE';
  else if (warning) status = 'WARNING';

  return { status, flags };
}

function checkGeo(visit: VisitFacts): ConsistencyFlag[] {
  const flags: ConsistencyFlag[] = [];
  if (visit.gpsLat == null || visit.gpsLng == null) {
    if (visit.gpsAccuracyM == null) {
      flags.push({
        code: 'GPS_UNAVAILABLE',
        messageKey: 'clmrs.consistency.gpsUnavailable',
      });
    }
    return flags;
  }
  if (
    visit.plantationLat != null &&
    visit.plantationLng != null &&
    distanceMeters(visit.gpsLat, visit.gpsLng, visit.plantationLat, visit.plantationLng) >
      2000
  ) {
    flags.push({
      code: 'ANOMALIE_GEOLOCALISATION',
      messageKey: 'clmrs.consistency.geoAnomaly',
    });
  }
  return flags;
}

export function childHasEssentialGaps(child: ChildFacts): boolean {
  return child.ageYears == null && child.birthDate == null;
}
