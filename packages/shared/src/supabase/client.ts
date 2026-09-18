import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SecureStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export type SupabaseClientOptions = {
  url?: string | null;
  anonKey?: string | null;
};

/**
 * Client Mock Supabase local — utilisé when URL/anon key are absent.
 */
export class MockSupabaseClient {
  private storageAdapter?: SecureStorageAdapter;

  constructor(storageAdapter?: SecureStorageAdapter) {
    this.storageAdapter = storageAdapter;
  }

  auth = {
    signInWithPassword: async (credentials: { email?: string; password?: string }) => {
      const email = credentials.email || 'agent@scpb.ci';
      return {
        data: {
          user: {
            id: `usr-mock-${Date.now()}`,
            email: email,
            role: 'authenticated',
          },
          session: {
            access_token: `mock_access_token_${Date.now()}`,
            refresh_token: `mock_refresh_token_${Date.now()}`,
            expires_at: Math.floor(Date.now() / 1000) + 86400,
          },
        },
        error: null,
      };
    },

    resetPasswordForEmail: async (_email: string) => {
      return { data: {}, error: null };
    },

    signOut: async () => {
      if (this.storageAdapter) {
        try {
          await this.storageAdapter.removeItem('supabase_session');
        } catch {
          // ignore
        }
      }
      return { error: null };
    },

    getSession: async () => {
      return { data: { session: null }, error: null };
    },

    onAuthStateChange: (_callback: (event: string, session: unknown) => void) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
  };

  from(_table: string) {
    const chainable: Record<string, unknown> = {
      select: (_fields?: string) => chainable,
      insert: async (_values: unknown) => ({ data: [], error: null }),
      update: async (_values: unknown) => ({ data: [], error: null }),
      upsert: async (_values: unknown) => ({ data: [], error: null }),
      delete: async () => ({ data: [], error: null }),
      eq: (_column: string, _value: unknown) => chainable,
      neq: (_column: string, _value: unknown) => chainable,
      in: (_column: string, _values: unknown) => chainable,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      order: (_column: string, _opts?: unknown) => chainable,
      limit: (_count: number) => chainable,
    };
    return chainable;
  }
}

export type AppSupabaseClient = SupabaseClient | MockSupabaseClient;

export function isRealSupabaseClient(client: AppSupabaseClient): client is SupabaseClient {
  return !(client instanceof MockSupabaseClient);
}

/**
 * Create a real Supabase JS client when url+anonKey are set; otherwise the offline mock.
 */
export const createSupabaseClient = (
  storageAdapter?: SecureStorageAdapter,
  options?: SupabaseClientOptions
): AppSupabaseClient => {
  const url = options?.url?.trim();
  const anonKey = options?.anonKey?.trim();

  if (url && anonKey) {
    return createClient(url, anonKey, {
      auth: {
        storage: storageAdapter
          ? {
              getItem: (key) => storageAdapter.getItem(key),
              setItem: (key, value) => storageAdapter.setItem(key, value),
              removeItem: (key) => storageAdapter.removeItem(key),
            }
          : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return new MockSupabaseClient(storageAdapter);
};

/** Default mock instance for non-mobile consumers */
export const supabase = createSupabaseClient();
