export type RespondentPhoneStatus = 'provided' | 'no_phone' | 'refused';
export type OtherHouseholdPhoneStatus = 'provided' | 'no_other_phone' | 'refused';

/** Paper-form codes. Never stored as the respondent's real number. */
export const LEGACY_NO_PHONE = '00 00 00 00 00';
export const LEGACY_REFUSED_PHONE = '99 99 99 99 99';

/**
 * Cameroon mobile: national 6 + 8 digits, optional +237 / 00237 prefix.
 * Spaces, dots and dashes are ignored.
 */
export function normalizeCameroonMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00237')) digits = digits.slice(5);
  else if (digits.startsWith('237') && digits.length > 9) digits = digits.slice(3);
  if (!/^6\d{8}$/.test(digits)) return null;
  return `+237${digits}`;
}

export function isValidCameroonMobile(input: string | null | undefined): boolean {
  return normalizeCameroonMobile(input) !== null;
}

export function phoneStatusToLegacyValue(
  status: RespondentPhoneStatus | OtherHouseholdPhoneStatus,
  phone?: string | null
): string {
  if (status === 'no_phone' || status === 'no_other_phone') return LEGACY_NO_PHONE;
  if (status === 'refused') return LEGACY_REFUSED_PHONE;
  return normalizeCameroonMobile(phone) ?? '';
}
