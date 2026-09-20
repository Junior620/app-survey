/**
 * Runtime helpers to display questionnaire content in the active UI locale.
 */
import {
  resolveLocalized,
  collectSnapshotLocalizedFields,
  measureQuestionnaireTranslationCompleteness,
  type DisplayLocale,
  type LocalizedString,
  type QuestionnaireDefinitionSnapshot,
  type QuestionDefinition,
} from '@appsurvey/shared';
import { useLocaleStore } from '../stores/useLocaleStore';

export function useContentLocale(): DisplayLocale {
  return useLocaleStore((s) => s.displayLocale);
}

export function L(value: LocalizedString | null | undefined, locale: DisplayLocale): string {
  return resolveLocalized(value, locale);
}

export function questionLabel(q: QuestionDefinition, locale: DisplayLocale): string {
  return resolveLocalized(q.label, locale);
}

export function questionHelp(q: QuestionDefinition, locale: DisplayLocale): string | null {
  if (!q.help) return null;
  const text = resolveLocalized(q.help, locale);
  return text.trim() ? text : null;
}

export function snapshotTranslationStats(snapshot: QuestionnaireDefinitionSnapshot) {
  return measureQuestionnaireTranslationCompleteness(collectSnapshotLocalizedFields(snapshot));
}
