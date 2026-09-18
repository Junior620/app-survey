import { getFactMapping } from './persistence/rulePacksRepository';

/**
 * Stable keys referenced by a published fact mapping must not be deleted
 * or have their question type changed.
 */
export async function getProtectedStableKeys(
  surveyTemplate = 'protection_enfant',
  surveyVersion = '1'
): Promise<Set<string>> {
  const mapping = await getFactMapping(surveyTemplate, surveyVersion);
  if (!mapping) return new Set();
  return new Set(Object.values(mapping.fields).filter(Boolean));
}

export async function assertStableKeyMutable(input: {
  stableKey: string;
  changingType?: boolean;
  deleting?: boolean;
}): Promise<void> {
  const protectedKeys = await getProtectedStableKeys();
  if (!protectedKeys.has(input.stableKey)) return;
  if (input.deleting) {
    throw new Error(
      `stableKey « ${input.stableKey} » est référencé par un mapping CLMRS publié — suppression interdite.`
    );
  }
  if (input.changingType) {
    throw new Error(
      `stableKey « ${input.stableKey} » est référencé par un mapping CLMRS publié — changement de type interdit.`
    );
  }
}
