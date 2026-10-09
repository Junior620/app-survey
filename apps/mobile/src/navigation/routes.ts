/** Typed route path constants for SCPB Survey (Expo Router). */

export const Routes = {
  login: '/(public)/s02-login',
  onboarding: '/(public)/s01-onboarding',
  sessionCheck: '/(protected)/s05-session-check',
  offlineAccess: '/(protected)/s06-offline-access',
  accessDenied: '/(protected)/s07-access-denied',
  settings: '/(protected)/settings',

  agentHome: '/(protected)/(agent)',
  agentTerrain: '/(protected)/(agent)/terrain',
  agentActivites: '/(protected)/(agent)/activites',
  agentSync: '/(protected)/(agent)/sync',
  agentPlus: '/(protected)/(agent)/plus',
  agentPlanteurs: '/(protected)/(agent)/planteurs',
  agentVisites: '/(protected)/(agent)/visites',
  agentMissions: '/(protected)/(agent)/missions',
  agentFormations: '/(protected)/(agent)/formations',
  agentLots: '/(protected)/(agent)/lots',

  adminHome: '/(protected)/(admin)',
  durabiliteHome: '/(protected)/(durabilite)',
  auditeurHome: '/(protected)/(auditeur)',

  siteDashboard: '/(protected)/site-dashboard',
  siteForm: '/(protected)/site-form',
  secteurs: '/(protected)/secteurs',
  planteurDetail: '/(protected)/planteur-detail',
  planteurEnquetes: '/(protected)/planteur-enquetes',
  planteurCategorie: '/(protected)/planteur-categorie',
  planteurForm: '/(protected)/planteur-form',
  nouveauPlanteur: '/(protected)/nouveau-planteur',
  parcelleForm: '/(protected)/parcelle-form',
  formations: '/(protected)/formations',
  formationDetail: '/(protected)/formation-detail',
  seanceDetail: '/(protected)/seance-detail',
  missionForm: '/(protected)/mission-form',
  missionDetail: '/(protected)/mission-detail',
  mappingInfo: '/(protected)/mapping-info',
  enquetesDisponibles: '/(protected)/enquetes-disponibles',
  surveyRun: '/(protected)/survey-run',
  surveyConsent: '/(protected)/survey-consent',
  fileSync: '/(protected)/s50-file-sync',
  conflicts: '/(protected)/s51-resolution-conflits',
} as const;

export type AppRoutePath = (typeof Routes)[keyof typeof Routes];
