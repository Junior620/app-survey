import { Routes } from './routes';
import { destinationForRole } from './roleHome';
import type { WorkContextIds } from './types';

function lastSegment(pathname: string): string {
  const clean = pathname.replace(/^\//, '').split('?')[0] ?? '';
  const parts = clean.split('/').filter(Boolean);
  return (parts[parts.length - 1] ?? '').toLowerCase();
}

/**
 * Métier fallback when Expo Router has no history (deep link / cold open).
 * Never preferred over router.back().
 */
export function resolveFallback(
  pathname: string | null | undefined,
  ids: WorkContextIds | undefined,
  role: string | null | undefined
): string {
  const seg = lastSegment(pathname ?? '');
  const planteurId = ids?.planteurId;
  const siteId = ids?.siteId;
  const missionId = ids?.missionId;

  switch (seg) {
    case 'planteur-detail':
    case 'planteur-form':
    case 'nouveau-planteur':
      return Routes.agentPlanteurs;

    case 'planteur-enquetes':
      return planteurId
        ? `${Routes.planteurDetail}?planteurId=${encodeURIComponent(planteurId)}`
        : Routes.agentPlanteurs;

    case 'planteur-categorie':
      return planteurId
        ? `${Routes.planteurEnquetes}?planteurId=${encodeURIComponent(planteurId)}`
        : Routes.agentPlanteurs;

    case 'parcelle-form':
      if (planteurId) {
        return `${Routes.planteurDetail}?planteurId=${encodeURIComponent(planteurId)}`;
      }
      return Routes.agentTerrain;

    case 'survey-consent':
    case 'survey-run':
      if (planteurId) {
        return `${Routes.planteurDetail}?planteurId=${encodeURIComponent(planteurId)}`;
      }
      if (siteId) {
        return `${Routes.enquetesDisponibles}?siteId=${encodeURIComponent(siteId)}`;
      }
      return Routes.agentActivites;

    case 'enquetes-disponibles':
      return siteId
        ? `${Routes.siteDashboard}?siteId=${encodeURIComponent(siteId)}`
        : Routes.agentActivites;

    case 'mission-detail':
    case 'mission-form':
      return Routes.agentMissions;

    case 'formation-detail':
    case 'seance-detail':
    case 'formations':
      return Routes.agentFormations;

    case 'mapping-info':
      return Routes.agentTerrain;

    case 'site-dashboard':
    case 'site-form':
      return Routes.agentHome;

    case 's50-file-sync':
    case 's51-resolution-conflits':
      return Routes.agentSync;

    case 'mission-detail-placeholder':
      return missionId
        ? `${Routes.missionDetail}?missionId=${encodeURIComponent(missionId)}`
        : Routes.agentMissions;

    default:
      if (seg.startsWith('s21') || seg.startsWith('s22') || seg.startsWith('s26')) {
        return Routes.agentActivites;
      }
      return destinationForRole(role);
  }
}

/** Map origin hint → a safe route when stack is empty. */
export function routeForOrigin(
  origin: string | undefined,
  ids?: WorkContextIds
): string | null {
  switch (origin) {
    case 'home':
      return Routes.agentHome;
    case 'terrain':
      return Routes.agentTerrain;
    case 'activities':
      return Routes.agentActivites;
    case 'mission':
      return ids?.missionId
        ? `${Routes.missionDetail}?missionId=${encodeURIComponent(ids.missionId)}`
        : Routes.agentMissions;
    case 'formation':
      return Routes.agentFormations;
    case 'map':
      return Routes.mappingInfo;
    case 'site':
      return ids?.siteId
        ? `${Routes.siteDashboard}?siteId=${encodeURIComponent(ids.siteId)}`
        : Routes.agentHome;
    case 'sync':
      return Routes.agentSync;
    case 'search':
    case 'recent':
    case 'deep-link':
    default:
      return null;
  }
}
