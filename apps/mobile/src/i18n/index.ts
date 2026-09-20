import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { fr } from './locales/fr';
import { en } from './locales/en';
import { DEFAULT_LOCALE, type DisplayLocale } from './resolveLocale';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
};

let initialized = false;

export async function initI18n(locale: DisplayLocale = DEFAULT_LOCALE): Promise<typeof i18n> {
  if (!initialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      compatibilityJSON: 'v4',
      interpolation: { escapeValue: false },
      returnNull: false,
      parseMissingKeyHandler: (key) => {
        if (__DEV__) {
          console.warn(`[i18n] Missing key: ${key}`);
        }
        return undefined as unknown as string;
      },
      saveMissing: false,
    });
    initialized = true;
  } else if (i18n.language !== locale) {
    await i18n.changeLanguage(locale);
  }
  return i18n;
}

export function getI18n() {
  return i18n;
}

export { i18n };
export default i18n;
