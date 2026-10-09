import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useWorkContextStore } from '../stores/useWorkContextStore';
import { useAuthStore } from '../stores/useAuthStore';
import { destinationForRole } from './roleHome';
import { resolveFallback, routeForOrigin } from './navigationFallbacks';

export type SmartBackOptions = {
  enabled?: boolean;
  /** Return true if a modal/sheet was closed (stop further back). */
  onBeforeBack?: () => boolean | void;
  /**
   * Return true if the exit was handled (e.g. dirty-form dialog shown).
   * Return false/void to continue with normal back.
   */
  onDirtyExit?: () => boolean | void | Promise<boolean | void>;
};

function parseHref(href: string): { pathname: string; params?: Record<string, string> } {
  const [pathOnly, query] = href.split('?');
  if (!query) return { pathname: pathOnly! };
  const params: Record<string, string> = {};
  for (const part of query.split('&')) {
    const [k, v] = part.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return { pathname: pathOnly!, params };
}

/**
 * Provenance-first back: stack → origin/previousRoute → métier fallback → role home.
 */
export function useSmartBack(opts?: SmartBackOptions) {
  const enabled = opts?.enabled !== false;
  const router = useRouter();
  const pathname = usePathname();
  const active = useWorkContextStore((s) => s.active);
  const onBeforeBackRef = useRef(opts?.onBeforeBack);
  const onDirtyExitRef = useRef(opts?.onDirtyExit);
  onBeforeBackRef.current = opts?.onBeforeBack;
  onDirtyExitRef.current = opts?.onDirtyExit;

  const goBack = useCallback(async () => {
    if (onBeforeBackRef.current?.()) {
      return true;
    }

    const dirtyHandled = await onDirtyExitRef.current?.();
    if (dirtyHandled) {
      return true;
    }

    // 1) Real Expo Router history — never replace here
    if (router.canGoBack()) {
      router.back();
      return true;
    }

    // 2) Light provenance (origin / previousRoute / legacy parentRoute)
    const previous =
      active?.previousRoute || active?.parentRoute || routeForOrigin(active?.origin, active?.ids);
    if (previous) {
      const { pathname: p, params } = parseHref(previous);
      if (params && Object.keys(params).length > 0) {
        router.replace({ pathname: p, params } as never);
      } else {
        router.replace(p as never);
      }
      return true;
    }

    // 3) Métier fallback by screen type
    const role = useAuthStore.getState().userRole || useAuthStore.getState().profile?.role;
    const fallback = resolveFallback(pathname, active?.ids, role);
    const { pathname: fp, params: fparams } = parseHref(fallback);
    if (fparams && Object.keys(fparams).length > 0) {
      router.replace({ pathname: fp, params: fparams } as never);
    } else {
      router.replace(fp as never);
    }
    return true;
  }, [active, pathname, router]);

  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      void goBack();
      return true;
    });
    return () => sub.remove();
  }, [enabled, goBack]);

  return { goBack };
}
