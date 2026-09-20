import { create } from 'zustand';
import { AppState, type AppStateStatus } from 'react-native';
import { getSecureItem, setSecureItem } from '../services/secureStore';
import { i18n, initI18n } from '../i18n';
import {
  DEFAULT_LOCALE,
  resolveDisplayLocale,
  type DisplayLocale,
  type LanguagePreference,
} from '../i18n/resolveLocale';

const PREF_KEY = 'scpb_language_preference_v1';

type LocaleState = {
  preference: LanguagePreference;
  displayLocale: DisplayLocale;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: LanguagePreference) => Promise<void>;
  reevaluateIfSystem: () => Promise<void>;
};

let appStateSub: { remove: () => void } | null = null;

async function applyLocale(preference: LanguagePreference): Promise<DisplayLocale> {
  const display = resolveDisplayLocale(preference);
  await initI18n(display);
  if (i18n.language !== display) {
    await i18n.changeLanguage(display);
  }
  return display;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  preference: 'system',
  displayLocale: DEFAULT_LOCALE,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await getSecureItem(PREF_KEY);
      let preference: LanguagePreference = 'system';
      if (raw === 'fr' || raw === 'en' || raw === 'system') {
        preference = raw;
      }
      const displayLocale = await applyLocale(preference);
      set({ preference, displayLocale, hydrated: true });
    } catch (e) {
      console.warn('[useLocaleStore] hydrate failed', e);
      await applyLocale('system').catch(() => undefined);
      set({ preference: 'system', displayLocale: DEFAULT_LOCALE, hydrated: true });
    }

    if (!appStateSub) {
      appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
        if (next === 'active') {
          void get().reevaluateIfSystem();
        }
      });
    }
  },

  setPreference: async (preference) => {
    await setSecureItem(PREF_KEY, preference);
    const displayLocale = await applyLocale(preference);
    set({ preference, displayLocale });
  },

  reevaluateIfSystem: async () => {
    const { preference } = get();
    if (preference !== 'system') return;
    const displayLocale = await applyLocale('system');
    if (displayLocale !== get().displayLocale) {
      set({ displayLocale });
    }
  },
}));

export type { LanguagePreference, DisplayLocale };
