import { create } from 'zustand';
import { AuthState, LoginCredentials, UserRole } from '@appsurvey/shared';
import { AuthService, checkConnectivity } from '../services/authService';
import {
  getOnboardingStatus,
  getStoredSession,
  setOnboardingStatus,
  clearStoredSession,
} from '../services/secureStore';
import { isSupabaseConfigured } from '../services/supabaseConfig';

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unauthenticated',
  user: null,
  profile: null,
  userRole: null,
  isOffline: false,
  lastSyncAt: null,
  onboardingCompleted: false,
  rememberMe: true,
  error: null,

  initialize: async () => {
    try {
      set({ error: null });

      const initTask = (async () => {
        const onboardingDone = await getOnboardingStatus().catch(() => false);
        const isOnline = await checkConnectivity(1500).catch(() => false);
        const isOffline = !isOnline;

        if (isSupabaseConfigured() && isOnline) {
          try {
            const remote = await AuthService.restoreFromRemote();
            if (remote) {
              const userRole =
                remote.profile?.role || (remote.user?.role as UserRole) || 'AGENT_TERRAIN';
              set({
                status: 'authenticated',
                user: remote.user,
                profile: remote.profile,
                userRole,
                isOffline: false,
                lastSyncAt: remote.savedAt,
                onboardingCompleted: onboardingDone,
              });
              return;
            }
          } catch (e) {
            console.warn('[AuthStore] Remote restore failed:', e);
          }
        }

        const savedSession = await getStoredSession().catch(() => null);

        if (savedSession) {
          const isExpired = savedSession.expiresAt < Date.now();

          if (!isExpired) {
            const userRole =
              savedSession.profile?.role ||
              (savedSession.user?.role as UserRole) ||
              'AGENT_TERRAIN';
            set({
              status: isOffline ? 'offline' : 'authenticated',
              user: savedSession.user,
              profile: savedSession.profile,
              userRole,
              isOffline,
              lastSyncAt: savedSession.savedAt || new Date().toISOString(),
              onboardingCompleted: onboardingDone,
            });
            return;
          }

          if (isOffline && !isSupabaseConfigured()) {
            const userRole =
              savedSession.profile?.role ||
              (savedSession.user?.role as UserRole) ||
              'AGENT_TERRAIN';
            set({
              status: 'offline',
              user: savedSession.user,
              profile: savedSession.profile,
              userRole,
              isOffline: true,
              lastSyncAt: savedSession.savedAt || new Date().toISOString(),
              onboardingCompleted: onboardingDone,
            });
            return;
          }

          await clearStoredSession().catch(() => {});
        }

        set({
          status: isOffline ? 'offline' : 'unauthenticated',
          user: null,
          profile: null,
          userRole: null,
          isOffline,
          onboardingCompleted: onboardingDone,
        });
      })();

      const timeoutTask = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 2000);
      });

      await Promise.race([initTask, timeoutTask]);
    } catch (err: unknown) {
      console.error('Error initializing AuthStore:', err);
      set({
        status: 'unauthenticated',
        user: null,
        profile: null,
        userRole: null,
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors de l'initialisation de la session.",
      });
    }
  },

  login: async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      set({ error: null });

      // Re-probe juste avant login (l'état init peut être un faux négatif émulateur).
      const isOnline = await checkConnectivity(4000).catch(() => false);
      set({ isOffline: !isOnline });

      const { user, profile, session } = await AuthService.login(credentials, !isOnline);

      const userRole = profile.role || (user.role as UserRole) || 'AGENT_TERRAIN';

      set({
        status: 'authenticated',
        user,
        profile,
        userRole,
        isOffline: false,
        rememberMe: credentials.rememberMe ?? true,
        lastSyncAt: session.savedAt,
        error: null,
      });

      return true;
    } catch (err: unknown) {
      console.error('Login error in AuthStore:', err);
      set({
        error:
          err instanceof Error ? err.message : 'Identifiants ou mot de passe incorrects.',
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await AuthService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      set({
        status: 'unauthenticated',
        user: null,
        profile: null,
        userRole: null,
        isOffline: false,
        error: null,
      });
    }
  },

  restoreSession: async (): Promise<boolean> => {
    try {
      if (isSupabaseConfigured()) {
        const remote = await AuthService.restoreFromRemote();
        if (remote) {
          const userRole = remote.profile?.role || 'AGENT_TERRAIN';
          set({
            status: 'authenticated',
            user: remote.user,
            profile: remote.profile,
            userRole,
            lastSyncAt: remote.savedAt,
            isOffline: false,
          });
          return true;
        }
      }

      const savedSession = await getStoredSession();
      if (!savedSession) return false;

      const isExpired = savedSession.expiresAt < Date.now();
      const state = get();

      if (!isExpired || state.isOffline) {
        const userRole = savedSession.profile?.role || 'AGENT_TERRAIN';
        set({
          status: state.isOffline ? 'offline' : 'authenticated',
          user: savedSession.user,
          profile: savedSession.profile,
          userRole,
          lastSyncAt: savedSession.savedAt,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  setOnboardingCompleted: async (completed: boolean) => {
    await setOnboardingStatus(completed);
    set({ onboardingCompleted: completed });
  },

  clearError: () => set({ error: null }),
}));
