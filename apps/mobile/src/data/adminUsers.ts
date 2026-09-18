import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '@appsurvey/shared';
import { isRealSupabaseClient } from '@appsurvey/shared';
import { supabaseClient } from '../services/authService';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '../services/supabaseConfig';
import { DEFAULT_COOPERATIVE_ID } from './syncConstants';

export const ADMIN_MANAGED_ROLES: UserRole[] = [
  'AGENT_TERRAIN',
  'RESPONSABLE_DURABILITE',
  'AUDITEUR',
  'ADMIN',
];

export type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  region?: string | null;
};

export type UpdateUserInput = {
  fullName: string;
  role: UserRole;
  region?: string | null;
};

function mapProfileRow(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email || ''),
    fullName: String(row.full_name || row.email || 'Utilisateur'),
    role: String(row.role) as UserRole,
    cooperativeId: row.cooperative_id == null ? undefined : String(row.cooperative_id),
    region: row.region == null ? undefined : String(row.region),
    avatarUrl: row.avatar_url == null ? undefined : String(row.avatar_url),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function requireClient(): SupabaseClient {
  if (!isSupabaseConfigured() || !isRealSupabaseClient(supabaseClient)) {
    throw new Error(
      'Serveur non configuré. Impossible de gérer les utilisateurs hors ligne.'
    );
  }
  // Shared package + app may resolve distinct SupabaseClient type identities.
  return supabaseClient as unknown as SupabaseClient;
}

/** Ephemeral client so signUp does not replace the admin session. */
function createEphemeralAuthClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error('Serveur non configuré.');
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      },
    },
  });
}

export async function listUsers(): Promise<UserProfile[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Impossible de charger les utilisateurs.');
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapProfileRow);
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Impossible de charger cet utilisateur.');
  }
  if (!data) return null;
  return mapProfileRow(data as Record<string, unknown>);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserInput
): Promise<UserProfile> {
  const client = requireClient();
  if (!ADMIN_MANAGED_ROLES.includes(input.role)) {
    throw new Error('Rôle non autorisé.');
  }
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error('Indiquez un nom.');

  const { data, error } = await client
    .from('profiles')
    .update({
      full_name: fullName,
      role: input.role,
      region: input.region?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Enregistrement impossible.');
  }
  if (!data) {
    throw new Error('Utilisateur introuvable ou droits insuffisants. Appliquez la migration 004.');
  }
  return mapProfileRow(data as Record<string, unknown>);
}

/**
 * Creates an Auth user + profile without switching the admin session.
 * Requires email signup enabled on the Supabase project.
 */
export async function createUserAccount(input: CreateUserInput): Promise<UserProfile> {
  const client = requireClient();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.fullName.trim();

  if (!email || !email.includes('@')) throw new Error('E-mail invalide.');
  if (password.length < 8) throw new Error('Mot de passe : 8 caractères minimum.');
  if (!fullName) throw new Error('Indiquez un nom.');
  if (!ADMIN_MANAGED_ROLES.includes(input.role)) throw new Error('Rôle non autorisé.');

  const { data: authData } = await client.auth.getUser();
  let creatorCoop = DEFAULT_COOPERATIVE_ID;
  if (authData.user?.id) {
    const { data: me } = await client
      .from('profiles')
      .select('cooperative_id')
      .eq('id', authData.user.id)
      .maybeSingle();
    const raw = (me as { cooperative_id?: string } | null)?.cooperative_id;
    if (raw?.trim()) creatorCoop = raw.trim();
  }

  const ephemeral = createEphemeralAuthClient();
  const { data: signUpData, error: signUpError } = await ephemeral.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: input.role,
        cooperative_id: creatorCoop,
      },
    },
  });

  if (signUpError) {
    throw new Error(signUpError.message || 'Création du compte impossible.');
  }

  const newId = signUpData.user?.id;
  if (!newId) {
    throw new Error(
      'Compte non créé (vérifiez que les inscriptions e-mail sont activées sur Supabase).'
    );
  }

  const { data, error } = await client
    .from('profiles')
    .update({
      email,
      full_name: fullName,
      role: input.role,
      region: input.region?.trim() || null,
      cooperative_id: creatorCoop,
      updated_at: new Date().toISOString(),
    })
    .eq('id', newId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message ||
        'Compte Auth créé, mais le profil n’a pas pu être mis à jour. Vérifiez la migration 004.'
    );
  }

  if (data) {
    return mapProfileRow(data as Record<string, unknown>);
  }

  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 300));
    const profile = await getUserById(newId);
    if (profile) {
      return updateUserProfile(newId, {
        fullName,
        role: input.role,
        region: input.region,
      });
    }
  }

  throw new Error(
    'Compte Auth créé, profil encore absent. Réessayez dans quelques secondes.'
  );
}
