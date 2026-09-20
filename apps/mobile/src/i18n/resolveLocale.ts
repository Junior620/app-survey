/**
 * Resolve display locale from preference + device locales.
 * Never infers from country / SIM / IP / GPS.
 */

import * as Localization from 'expo-localization';

export type LanguagePreference = 'system' | 'fr' | 'en';
export type DisplayLocale = 'fr' | 'en';

export const SUPPORTED_LOCALES: DisplayLocale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: DisplayLocale = 'fr';

export function languageTagToSupported(tag: string): DisplayLocale | null {
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
  if (primary === 'fr') return 'fr';
  if (primary === 'en') return 'en';
  return null;
}

/** Walk device preferred languages in order; first supported wins; else FR. */
export function resolveFromSystemLocales(
  locales: ReadonlyArray<{ languageTag?: string | null; languageCode?: string | null }> = Localization.getLocales()
): DisplayLocale {
  for (const loc of locales) {
    const tag = loc.languageTag || loc.languageCode || '';
    const hit = languageTagToSupported(tag);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}

export function resolveDisplayLocale(preference: LanguagePreference): DisplayLocale {
  if (preference === 'fr' || preference === 'en') return preference;
  return resolveFromSystemLocales();
}

/** BCP-47 tag for Intl formatters (display only; units unchanged). */
export function intlTagForLocale(locale: DisplayLocale): string {
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}
