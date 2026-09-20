/**
 * Bilingual content helpers for questionnaires and CMS-like fields.
 * UI chrome uses i18next; questionnaire *content* uses LocalizedString.
 */

export type DisplayLocale = 'fr' | 'en';

/** Prefer structured form; plain string is legacy French. */
export type LocalizedString = string | { fr: string; en?: string };

export function coerceLocalized(value: LocalizedString | null | undefined): {
  fr: string;
  en?: string;
} {
  if (value == null) return { fr: '' };
  if (typeof value === 'string') return { fr: value };
  return { fr: value.fr ?? '', en: value.en };
}

/**
 * Resolve display text for a locale. Falls back to French.
 * Never invents English when missing.
 */
export function resolveLocalized(
  value: LocalizedString | null | undefined,
  locale: DisplayLocale
): string {
  const loc = coerceLocalized(value);
  if (locale === 'en' && loc.en && loc.en.trim()) return loc.en;
  return loc.fr;
}

export function hasEnglish(value: LocalizedString | null | undefined): boolean {
  const loc = coerceLocalized(value);
  return !!(loc.en && loc.en.trim());
}

/** Persist LocalizedString in a TEXT column (plain FR or JSON `{fr,en}`). */
export function serializeLocalized(value: LocalizedString | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (!value.en?.trim()) return value.fr ?? '';
  return JSON.stringify({ fr: value.fr ?? '', en: value.en });
}

/** Read TEXT column that may be plain FR or JSON. */
export function deserializeLocalized(raw: string | null | undefined): LocalizedString {
  if (raw == null || raw === '') return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const o = JSON.parse(trimmed) as { fr?: string; en?: string };
      if (o && typeof o.fr === 'string') {
        return { fr: o.fr, en: typeof o.en === 'string' ? o.en : undefined };
      }
    } catch {
      /* fall through */
    }
  }
  return raw;
}

export type TranslationCompleteness = {
  total: number;
  withEn: number;
  frComplete: boolean;
  enRatio: number;
};

/** Count required content fields that have EN translations. */
export function measureQuestionnaireTranslationCompleteness(fields: LocalizedString[]): TranslationCompleteness {
  const coerced = fields.map(coerceLocalized).filter((f) => f.fr.trim().length > 0);
  const total = coerced.length;
  const withEn = coerced.filter((f) => !!(f.en && f.en.trim())).length;
  return {
    total,
    withEn,
    frComplete: total > 0 && coerced.every((f) => f.fr.trim().length > 0),
    enRatio: total === 0 ? 0 : withEn / total,
  };
}
