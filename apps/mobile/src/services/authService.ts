import type {
  AuthUser,
  LoginCredentials,
  StoredSession,
  UserProfile,
  UserRole,
} from '@appsurvey/shared';
import { createSupabaseClient, isRealSupabaseClient, type AppSupabaseClient } from '@appsurvey/shared';
import {
  clearStoredSession,
  saveStoredSession,
  secureStorageAdapter,
} from './secureStore';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from './supabaseConfig';

export const supabaseClient: AppSupabaseClient = createSupabaseClient(secureStorageAdapter, {
  url: getSupabaseUrl(),
  anonKey: getSupabaseAnonKey(),
});

const VALID_ROLES: UserRole[] = [
  'AGENT_TERRAIN',
  'RESPONSABLE_DURABILITE',
  'ADMIN',
  'AUDITEUR',
];

function mapProfileRow(row: Record<string, unknown>): UserProfile {
  const role = String(row.role || '') as UserRole;
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Rôle profil inconnu : ${row.role}. Contactez un administrateur.`);
  }
  return {
    id: String(row.id),
    email: String(row.email || ''),
    fullName: String(row.full_name || row.email || 'Utilisateur'),
    role,
    cooperativeId: row.cooperative_id == null ? undefined : String(row.cooperative_id),
    region: row.region == null ? undefined : String(row.region),
    avatarUrl: row.avatar_url == null ? undefined : String(row.avatar_url),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

/** Demo profiles — only used when Supabase is not configured */
const DEMO_PROFILES: Record<string, { profile: UserProfile; passwordHash: string }> = {
  'agent@scpb.ci': {
    passwordHash: 'SCPB2026!',
    profile: {
      id: 'usr-agent-01',
      email: 'agent@scpb.ci',
      fullName: 'Kouassi Traoré',
      role: 'AGENT_TERRAIN',
      cooperativeId: 'COOP-SOUBRE-01',
      region: 'Soubré',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-09-09T05:00:00Z',
    },
  },
  'durabilite@scpb.ci': {
    passwordHash: 'SCPB2026!',
    profile: {
      id: 'usr-dur-01',
      email: 'durabilite@scpb.ci',
      fullName: 'Dr. Aminata Diallo',
      role: 'RESPONSABLE_DURABILITE',
      cooperativeId: 'COOP-HQ-NATIONAL',
      region: 'Abidjan / National',
      createdAt: '2026-01-05T08:00:00Z',
      updatedAt: '2026-09-09T05:00:00Z',
    },
  },
  'admin@scpb.ci': {
    passwordHash: 'SCPB2026!',
    profile: {
      id: 'usr-admin-01',
      email: 'admin@scpb.ci',
      fullName: 'Jean-Marc Yao',
      role: 'ADMIN',
      region: 'Siège Social Abidjan',
      createdAt: '2026-01-01T08:00:00Z',
      updatedAt: '2026-09-09T05:00:00Z',
    },
  },
  'auditeur@scpb.ci': {
    passwordHash: 'SCPB2026!',
    profile: {
      id: 'usr-audit-01',
      email: 'auditeur@scpb.ci',
      fullName: 'Isabelle Morel',
      role: 'AUDITEUR',
      region: 'International / EUDR Audit',
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-09-09T05:00:00Z',
    },
  },
};

export const checkConnectivity = async (timeoutMs: number = 3000): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return true;
  }
  try {
    const url = getSupabaseUrl();
    if (!url) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // /auth/v1/health is unreliable on some projects; settings is a light public probe.
    const res = await fetch(`${url}/auth/v1/settings`, {
      method: 'GET',
      signal: controller.signal,
      headers: { apikey: getSupabaseAnonKey() || '' },
    });
    clearTimeout(timer);
    return res.ok || res.status === 401 || res.status === 403 || res.status === 404;
  } catch {
    return false;
  }
};

function isLikelyNetworkError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('failed to connect') ||
    msg.includes('internet') ||
    msg.includes('offline')
  );
}

async function fetchRemoteProfile(userId: string, email: string): Promise<UserProfile> {
  if (!isRealSupabaseClient(supabaseClient)) {
    throw new Error('Client Supabase non configuré.');
  }
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Impossible de charger le profil.');
  }
  if (!data) {
    throw new Error(
      'Aucun profil associé à ce compte. Demandez à un administrateur de finaliser votre accès.'
    );
  }
  const profile = mapProfileRow(data as Record<string, unknown>);
  if (!profile.email && email) {
    profile.email = email;
  }
  return profile;
}

export class AuthService {
  static async login(
    credentials: LoginCredentials,
    isOffline: boolean = false
  ): Promise<{
    user: AuthUser;
    profile: UserProfile;
    session: StoredSession;
  }> {
    if (isSupabaseConfigured()) {
      // Ne pas bloquer sur un probe stale : tenter l'auth réelle.
      // Le flag isOffline ne sert qu'à clarifier le message en cas d'échec réseau.
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: credentials.email.trim(),
          password: credentials.password,
        });

        if (error || !data.user || !data.session) {
          if (isOffline || isLikelyNetworkError(error)) {
            throw new Error(
              'Connexion impossible hors ligne. Reconnectez-vous au réseau pour authentifier ce compte.'
            );
          }
          throw new Error(error?.message || 'Identifiants ou mot de passe incorrects.');
        }

        const profile = await fetchRemoteProfile(
          data.user.id,
          data.user.email || credentials.email
        );
        const user: AuthUser = {
          id: data.user.id,
          email: data.user.email || profile.email,
          role: profile.role,
        };

        const session: StoredSession = {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          user,
          profile,
          expiresAt: (data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
          savedAt: new Date().toISOString(),
        };

        if (credentials.rememberMe !== false) {
          await saveStoredSession(session);
        } else {
          await clearStoredSession();
        }

        return { user, profile, session };
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith('Connexion impossible hors ligne')
        ) {
          throw err;
        }
        if (isOffline || isLikelyNetworkError(err)) {
          throw new Error(
            'Connexion impossible hors ligne. Reconnectez-vous au réseau pour authentifier ce compte.'
          );
        }
        throw err;
      }
    }

    // —— Mock local fallback ——
    return AuthService.loginMock(credentials);
  }

  private static async loginMock(credentials: LoginCredentials): Promise<{
    user: AuthUser;
    profile: UserProfile;
    session: StoredSession;
  }> {
    const rawInput = credentials.email ? credentials.email.trim() : '';
    const emailLower = rawInput.toLowerCase();
    const demoAccount = DEMO_PROFILES[emailLower];
    let profile: UserProfile;

    if (demoAccount) {
      if (credentials.password !== demoAccount.passwordHash) {
        throw new Error('Identifiants ou mot de passe incorrects.');
      }
      profile = demoAccount.profile;
    } else {
      let role: UserRole = 'AGENT_TERRAIN';
      let fullName = `Utilisateur (${rawInput || 'Démo'})`;
      let region = 'Soubré / Haut-Sassandra';
      let cooperativeId: string | undefined = 'COOP-SOUBRE-01';

      if (emailLower.includes('admin') || emailLower === 'christian.momo@ste-scpb.com') {
        role = 'ADMIN';
        fullName = 'Christian Momo';
        region = 'Siège Social';
        cooperativeId = undefined;
      } else if (emailLower.includes('durab') || emailLower.includes('resp')) {
        role = 'RESPONSABLE_DURABILITE';
        fullName = 'Responsable Durabilité Démo';
        region = 'Abidjan / National';
        cooperativeId = 'COOP-HQ-NATIONAL';
      } else if (emailLower.includes('audit')) {
        role = 'AUDITEUR';
        fullName = 'Auditeur Externe EUDR';
        region = 'International / EUDR Audit';
        cooperativeId = undefined;
      }

      const fullEmail = rawInput.includes('@') ? rawInput : `${rawInput || 'user'}@scpb.ci`;
      profile = {
        id: `usr-demo-${Date.now()}`,
        email: fullEmail,
        fullName,
        role,
        cooperativeId,
        region,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const user: AuthUser = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
    };

    const session: StoredSession = {
      accessToken: `mock_access_token_${Date.now()}`,
      refreshToken: `mock_refresh_token_${Date.now()}`,
      user,
      profile,
      expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
      savedAt: new Date().toISOString(),
    };

    await saveStoredSession(session);
    return { user, profile, session };
  }

  static async restoreFromRemote(): Promise<StoredSession | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session?.user) return null;

    const profile = await fetchRemoteProfile(
      data.session.user.id,
      data.session.user.email || ''
    );
    const user: AuthUser = {
      id: data.session.user.id,
      email: data.session.user.email || profile.email,
      role: profile.role,
    };
    const session: StoredSession = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user,
      profile,
      expiresAt: (data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
      savedAt: new Date().toISOString(),
    };
    await saveStoredSession(session);
    return session;
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim());
    if (error) {
      throw new Error(error.message);
    }
  }

  static async logout(): Promise<void> {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.warn('signOut error:', e);
    } finally {
      await clearStoredSession();
    }
  }
}
