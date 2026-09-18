import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { StoredSession } from '@appsurvey/shared';

const SESSION_KEY = 'afrexia_auth_session_v1';
const ONBOARDING_KEY = 'afrexia_onboarding_completed_v1';

// In-memory fallback for platforms where SecureStore might not be available or fails
const memoryStorage = new Map<string, string>();

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[SecureStore] Operation timed out after ${ms}ms, using memory fallback`);
      resolve(fallback);
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        console.warn('[SecureStore] Operation failed:', err);
        resolve(fallback);
      });
  });
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return memoryStorage.get(key) || null;
  }
  const memValue = memoryStorage.get(key) || null;
  return withTimeout(SecureStore.getItemAsync(key), 1500, memValue);
};

export const setSecureItem = async (key: string, value: string): Promise<void> => {
  memoryStorage.set(key, value);
  if (Platform.OS !== 'web') {
    await withTimeout(SecureStore.setItemAsync(key, value), 1500, undefined);
  }
};

export const removeSecureItem = async (key: string): Promise<void> => {
  memoryStorage.delete(key);
  if (Platform.OS !== 'web') {
    await withTimeout(SecureStore.deleteItemAsync(key), 1500, undefined);
  }
};

export const secureStorageAdapter = {
  getItem: getSecureItem,
  setItem: setSecureItem,
  removeItem: removeSecureItem,
};

export const saveStoredSession = async (session: StoredSession): Promise<void> => {
  await setSecureItem(SESSION_KEY, JSON.stringify(session));
};

export const getStoredSession = async (): Promise<StoredSession | null> => {
  const json = await getSecureItem(SESSION_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json) as StoredSession;
  } catch (e) {
    console.error('Failed to parse stored session:', e);
    return null;
  }
};

export const clearStoredSession = async (): Promise<void> => {
  await removeSecureItem(SESSION_KEY);
};

export const setOnboardingStatus = async (completed: boolean): Promise<void> => {
  await setSecureItem(ONBOARDING_KEY, completed ? 'true' : 'false');
};

export const getOnboardingStatus = async (): Promise<boolean> => {
  const val = await getSecureItem(ONBOARDING_KEY);
  return val === 'true';
};
