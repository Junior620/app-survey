export type UserRole = 'AGENT_TERRAIN' | 'RESPONSABLE_DURABILITE' | 'ADMIN' | 'AUDITEUR';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'offline' | 'forbidden';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  cooperativeId?: string;
  region?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  profile: UserProfile;
  expiresAt: number; // timestamp in milliseconds
  savedAt: string; // ISO string timestamp
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  profile: UserProfile | null;
  userRole: UserRole | null;
  isOffline: boolean;
  lastSyncAt: string | null;
  onboardingCompleted: boolean;
  rememberMe: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  clearError: () => void;
}
