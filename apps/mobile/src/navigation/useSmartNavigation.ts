import { useRouter, usePathname } from 'expo-router';
import { useWorkContextStore } from '../stores/useWorkContextStore';
import { useSiteContext } from '../stores/useSiteContext';
import { Routes } from './routes';
import type {
  NavigationOrigin,
  OpenOpts,
  OpenParcelleParams,
  OpenPlanteurFormParams,
  ResumeActivity,
  StartSurveyParams,
  WorkContext,
} from './types';
import { destinationForRole } from './roleHome';
import { useAuthStore } from '../stores/useAuthStore';
import { hasValidAcceptedConsent } from '../data/repositories/surveyConsentsRepository';
import { CONSENT_POLICY } from '../survey/consentPolicy';

function nowIso() {
  return new Date().toISOString();
}

function pathMatches(
  pathname: string | null | undefined,
  targetSegment: string,
  idKey?: string,
  idValue?: string | null
): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/^\//, '').toLowerCase();
  const hit =
    normalized === targetSegment ||
    normalized.endsWith(`/${targetSegment}`) ||
    normalized.includes(`/${targetSegment}/`);
  if (!hit) return false;
  if (!idKey || !idValue) return hit;
  // Params are not always in pathname; caller may still push — soft check only
  return hit;
}

export function useSmartNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const setActive = useWorkContextStore((s) => s.setActive);
  const clear = useWorkContextStore((s) => s.clear);
  const setCurrentSiteId = useSiteContext((s) => s.setCurrentSiteId);

  const setCtx = async (ctx: Omit<WorkContext, 'updatedAt'> & { updatedAt?: string }) => {
    await setActive({
      ...ctx,
      previousRoute: ctx.previousRoute ?? pathname ?? undefined,
      updatedAt: ctx.updatedAt ?? nowIso(),
    });
  };

  /** Tab / hub destinations — never push (avoids stacking hidden tabs). */
  const navigateTab = (route: string) => {
    router.navigate(route as never);
  };

  /**
   * Leave a detail toward a list: prefer stack back, else navigate to list tab.
   */
  const returnToList = (listRoute: string) => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    navigateTab(listRoute);
  };

  const startSurvey = async (params: StartSurveyParams) => {
    if (
      pathMatches(pathname, 'survey-run') &&
      params.responseId &&
      useWorkContextStore.getState().active?.ids.responseId === params.responseId
    ) {
      return;
    }
    await setCtx({
      kind: 'survey',
      ids: {
        questionnaireId: params.questionnaireId,
        versionNumber: params.versionNumber,
        siteId: params.siteId,
        planteurId: params.planteurId,
        responseId: params.responseId,
      },
      title: 'Enquête',
      origin: params.origin,
      previousRoute: pathname ?? undefined,
    });

    let target: string = Routes.surveyRun;
    if (params.planteurId && CONSENT_POLICY.requiresConsent) {
      const accountId =
        useAuthStore.getState().user?.id || useAuthStore.getState().profile?.id || 'local-account';
      const accepted = await hasValidAcceptedConsent(
        accountId,
        params.planteurId,
        params.questionnaireId
      );
      if (!accepted) target = Routes.surveyConsent;
    }

    if (pathMatches(pathname, 'survey-consent') && target === Routes.surveyConsent) {
      return;
    }

    router.push({
      pathname: target,
      params: {
        questionnaireId: params.questionnaireId,
        versionNumber: params.versionNumber,
        ...(params.siteId ? { siteId: params.siteId } : {}),
        ...(params.planteurId ? { planteurId: params.planteurId } : {}),
        ...(params.responseId ? { responseId: params.responseId } : {}),
      },
    } as never);
  };

  return {
    goHome() {
      const role = useAuthStore.getState().userRole || useAuthStore.getState().profile?.role;
      router.replace(destinationForRole(role) as never);
    },

    returnToList,

    async openSiteDashboard(siteId: string, opts?: OpenOpts) {
      await setCurrentSiteId(siteId);
      if (pathMatches(pathname, 'site-dashboard')) {
        router.replace({ pathname: Routes.siteDashboard, params: { siteId } } as never);
        return;
      }
      await setCtx({
        kind: 'site',
        ids: { siteId },
        title: 'Site',
        origin: opts?.origin ?? 'home',
        previousRoute: pathname ?? Routes.agentHome,
      });
      router.push({ pathname: Routes.siteDashboard, params: { siteId } } as never);
    },

    async openPlanteur(planteurId: string, opts?: OpenOpts & { siteId?: string }) {
      if (pathMatches(pathname, 'planteur-detail')) {
        const cur = useWorkContextStore.getState().active?.ids.planteurId;
        if (cur === planteurId) return;
      }
      const siteId = opts?.siteId ?? useSiteContext.getState().currentSiteId;
      await setCtx({
        kind: 'planteur',
        ids: { planteurId, siteId },
        title: 'Planteur',
        origin: opts?.origin,
        previousRoute: pathname ?? undefined,
      });
      router.push({
        pathname: Routes.planteurDetail,
        params: { planteurId },
      } as never);
    },

    async openPlanteurForm(params: OpenPlanteurFormParams) {
      const siteId = params.siteId ?? useSiteContext.getState().currentSiteId ?? undefined;
      await setCtx({
        kind: 'planteur',
        ids: { planteurId: params.planteurId, siteId },
        title: params.planteurId ? 'Modifier planteur' : 'Nouveau planteur',
        origin: params.origin,
        previousRoute: pathname ?? undefined,
      });
      if (params.planteurId) {
        router.push({
          pathname: Routes.planteurForm,
          params: {
            planteurId: params.planteurId,
            mode: 'edit',
            ...(siteId ? { siteId } : {}),
          },
        } as never);
      } else {
        router.push({
          pathname: Routes.planteurForm,
          params: siteId ? { siteId } : {},
        } as never);
      }
    },

    async openParcelle(params: OpenParcelleParams) {
      await setCtx({
        kind: 'parcelle',
        ids: {
          planteurId: params.planteurId,
          parcelleId: params.parcelleId,
          siteId: params.siteId,
        },
        title: 'Parcelle',
        origin: params.origin,
        previousRoute: pathname ?? undefined,
      });
      router.push({
        pathname: Routes.parcelleForm,
        params: {
          planteurId: params.planteurId,
          ...(params.parcelleId
            ? { parcelleId: params.parcelleId, mode: 'edit' }
            : {}),
          ...(params.siteId ? { siteId: params.siteId } : {}),
        },
      } as never);
    },

    async openMission(missionId: string, opts?: OpenOpts) {
      if (
        pathMatches(pathname, 'mission-detail') &&
        useWorkContextStore.getState().active?.ids.missionId === missionId
      ) {
        return;
      }
      await setCtx({
        kind: 'mission',
        ids: { missionId },
        title: 'Mission',
        origin: opts?.origin ?? 'activities',
        previousRoute: pathname ?? undefined,
      });
      router.push({
        pathname: Routes.missionDetail,
        params: { missionId },
      } as never);
    },

    async openMissionForm(opts?: OpenOpts & { missionId?: string; siteId?: string }) {
      const siteId = opts?.siteId ?? useSiteContext.getState().currentSiteId ?? undefined;
      await setCtx({
        kind: 'mission',
        ids: { missionId: opts?.missionId, siteId },
        title: opts?.missionId ? 'Modifier mission' : 'Nouvelle mission',
        origin: opts?.origin ?? 'activities',
        previousRoute: pathname ?? undefined,
      });
      router.push({
        pathname: Routes.missionForm,
        params: {
          ...(opts?.missionId ? { missionId: opts.missionId, mode: 'edit' } : {}),
          ...(siteId ? { siteId } : {}),
        },
      } as never);
    },

    openMissions() {
      navigateTab(Routes.agentMissions);
    },

    async openFormations(siteId?: string | null, opts?: OpenOpts) {
      const sid = siteId ?? useSiteContext.getState().currentSiteId;
      if (sid) await setCurrentSiteId(sid);
      void opts;
      navigateTab(Routes.agentFormations);
    },

    openPlanteurs(_opts?: OpenOpts) {
      navigateTab(Routes.agentPlanteurs);
    },

    openVisites() {
      navigateTab(Routes.agentVisites);
    },

    async openMapping(siteId?: string | null, opts?: OpenOpts) {
      const sid = siteId ?? useSiteContext.getState().currentSiteId;
      await setCtx({
        kind: 'site',
        ids: { siteId: sid },
        title: 'Mapping',
        origin: opts?.origin ?? 'terrain',
        previousRoute: pathname ?? undefined,
      });
      router.push({
        pathname: Routes.mappingInfo,
        params: sid ? { siteId: sid } : {},
      } as never);
    },

    async openProducerSurveys(planteurId: string, siteId: string, opts?: OpenOpts) {
      await setCtx({
        kind: 'survey',
        ids: { planteurId, siteId },
        title: 'Enquêtes',
        origin: opts?.origin ?? 'terrain',
        previousRoute: pathname ?? undefined,
      });
      router.push({
        pathname: Routes.planteurEnquetes,
        params: { planteurId, siteId },
      } as never);
    },

    async openSurveyCategory(params: {
      planteurId: string;
      siteId: string;
      hub: string;
      producerName?: string;
    }) {
      await setCtx({
        kind: 'survey',
        ids: { planteurId: params.planteurId, siteId: params.siteId },
        title: params.hub,
        origin: 'terrain',
        previousRoute: pathname ?? undefined,
      });
      router.push({
        pathname: Routes.planteurCategorie,
        params: {
          planteurId: params.planteurId,
          siteId: params.siteId,
          hub: params.hub,
          ...(params.producerName ? { producerName: params.producerName } : {}),
        },
      } as never);
    },

    async openEnquetes(siteId?: string | null, opts?: OpenOpts) {
      const sid = siteId ?? useSiteContext.getState().currentSiteId;
      void opts;
      router.push({
        pathname: Routes.enquetesDisponibles,
        params: sid ? { siteId: sid } : {},
      } as never);
    },

    startSurvey,

    async resume(activity: ResumeActivity, opts?: OpenOpts) {
      if (activity.kind === 'survey') {
        await startSurvey({
          questionnaireId: activity.questionnaireId,
          versionNumber: activity.versionNumber,
          siteId: activity.siteId,
          planteurId: activity.planteurId,
          responseId: activity.responseId,
          origin: opts?.origin ?? 'home',
        });
      }
    },

    openSync() {
      navigateTab(Routes.agentSync);
    },

    openSettings() {
      router.push(Routes.settings as never);
    },

    async clearWorkContext() {
      await clear();
    },
  };
}

export type SmartNavigation = ReturnType<typeof useSmartNavigation>;

export type { NavigationOrigin };
