/** French UI labels for CLMRS technical enums — never the sole source of truth. */

import type { DetectionStatus, Severity, DataQualityStatus, PriorityBand } from '@appsurvey/clmrs-engine';

export const DETECTION_STATUS_LABELS: Record<DetectionStatus, string> = {
  NO_CASE_DETECTED: 'Aucun cas détecté',
  CHILD_AT_RISK: 'Enfant à risque',
  SUSPECTED_CHILD_LABOUR: 'Travail des enfants suspecté',
  CHILD_LABOUR_DETECTED: 'Travail des enfants détecté',
  HAZARDOUS_CHILD_LABOUR: 'Travail dangereux détecté',
  CRITICAL_PROTECTION_ALERT: 'Alerte protection critique',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  INFO: 'Info',
  LOW: 'Faible',
  MODERATE: 'Modérée',
  HIGH: 'Élevée',
  CRITICAL: 'Critique',
};

export const DATA_QUALITY_LABELS: Record<DataQualityStatus, string> = {
  VALID: 'Valide',
  WARNING: 'Avertissement',
  INCOMPLETE: 'Incomplet',
  BLOCKING: 'Bloquant',
};

export const PRIORITY_BAND_LABELS: Record<PriorityBand, string> = {
  LOW: 'Faible',
  MODERATE: 'Modérée',
  HIGH: 'Élevée',
  UNDETERMINED: 'Indéterminée',
};

export const RULE_MESSAGE_LABELS: Record<string, string> = {
  'clmrs.rules.essentialDataMissing': 'Données essentielles manquantes (âge / date de naissance)',
  'clmrs.rules.threatOrCoercion': 'Menace, contrainte, dette ou traite suspectée',
  'clmrs.rules.injuryObserved': 'Blessure observée',
  'clmrs.rules.pesticideExposure': 'Exposition aux pesticides',
  'clmrs.rules.hazardousActivity': 'Activité dangereuse déclarée',
  'clmrs.rules.belowMinimumWorkingAge': 'Activité économique sous l’âge minimum',
  'clmrs.rules.schoolInterference': 'Interférence avec la scolarité / heures excessives',
  'clmrs.rules.outOfSchool': 'Enfant non scolarisé',
  'clmrs.consistency.zeroChildrenWithForm': 'Incohérence : formulaire enfant avec 0 enfant déclaré',
  'clmrs.consistency.absenceGtSchoolDays': 'Absences > jours scolaires de la période',
  'clmrs.consistency.macheteWithoutAgri': 'Machette déclarée sans activité agricole',
  'clmrs.consistency.potentialDuplicate': 'Doublon potentiel d’enfant',
  'clmrs.consistency.essentialDataMissing': 'Données essentielles manquantes',
  'clmrs.consistency.gpsUnavailable': 'GPS indisponible',
  'clmrs.consistency.geoAnomaly': 'Anomalie de géolocalisation',
  'clmrs.actions.immediateProtection': 'Protection immédiate',
  'clmrs.actions.supervisorValidation': 'Validation superviseur requise',
  'clmrs.actions.removeHazardousTask': 'Retirer la tâche dangereuse',
  'clmrs.actions.priorityVisit': 'Visite prioritaire',
  'clmrs.actions.counterInvestigation': 'Contre-enquête',
  'clmrs.actions.scheduleFollowUp': 'Planifier un suivi',
  'clmrs.actions.waitForPack': 'Attendre un pack de règles valide',
  'clmrs.priority.missingData': 'Données manquantes — visite requise',
  'clmrs.priority.noValidPack': 'Aucun pack de règles valide',
};

export function labelRule(messageKey: string): string {
  return RULE_MESSAGE_LABELS[messageKey] ?? messageKey;
}
