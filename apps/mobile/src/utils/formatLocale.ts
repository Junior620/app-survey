/**
 * Locale-aware number formatting. Units (kg, ha, %) stay unchanged.
 */

import { intlTagForLocale, type DisplayLocale } from '../i18n/resolveLocale';
import { useLocaleStore } from '../stores/useLocaleStore';

const nbsp = '\u00a0';

function normalizeNumber(value: number | string): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatNumberLocale(
  value: number | string,
  locale: DisplayLocale,
  fractionDigits?: number
): string {
  const n = normalizeNumber(value);
  if (n == null) return String(value);
  return new Intl.NumberFormat(intlTagForLocale(locale), {
    maximumFractionDigits: fractionDigits ?? 2,
    minimumFractionDigits: fractionDigits ?? 0,
  }).format(n);
}

export function formatKgLocale(value: number | string, locale: DisplayLocale): string {
  return `${formatNumberLocale(value, locale, 0)}${nbsp}kg`;
}

export function formatHaLocale(value: number | string, locale: DisplayLocale): string {
  return `${formatNumberLocale(value, locale, 1)}${nbsp}ha`;
}

export function formatPercentLocale(value: number | string, locale: DisplayLocale): string {
  return `${formatNumberLocale(value, locale, 1)}${nbsp}%`;
}

export function formatDateLocale(
  isoOrDate: string | Date,
  locale: DisplayLocale,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return String(isoOrDate);
  return new Intl.DateTimeFormat(
    intlTagForLocale(locale),
    options ?? { day: '2-digit', month: 'short', year: 'numeric' }
  ).format(d);
}

/** Calendar date (YYYY-MM-DD) without timezone day-shift. */
export function formatCalendarDateLocale(ymd: string, locale: DisplayLocale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim());
  if (!m) return formatDateLocale(ymd, locale);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat(intlTagForLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Hook helpers using current display locale */
export function useFormatLocale() {
  const locale = useLocaleStore((s) => s.displayLocale);
  return {
    locale,
    formatNumber: (v: number | string, fd?: number) => formatNumberLocale(v, locale, fd),
    formatKg: (v: number | string) => formatKgLocale(v, locale),
    formatHa: (v: number | string) => formatHaLocale(v, locale),
    formatPercent: (v: number | string) => formatPercentLocale(v, locale),
    formatDate: (v: string | Date, opts?: Intl.DateTimeFormatOptions) =>
      formatDateLocale(v, locale, opts),
    formatCalendarDate: (ymd: string) => formatCalendarDateLocale(ymd, locale),
  };
}

/** @deprecated Prefer useFormatLocale — uses current display locale from store */
export function formatNumberFr(value: number | string, fractionDigits?: number): string {
  return formatNumberLocale(value, useLocaleStore.getState().displayLocale, fractionDigits);
}

export function formatKg(value: number | string): string {
  return formatKgLocale(value, useLocaleStore.getState().displayLocale);
}

export function formatHa(value: number | string): string {
  return formatHaLocale(value, useLocaleStore.getState().displayLocale);
}

export function formatPercent(value: number | string): string {
  return formatPercentLocale(value, useLocaleStore.getState().displayLocale);
}
