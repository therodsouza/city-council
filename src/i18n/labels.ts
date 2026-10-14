import type { TFunction } from 'i18next';

/**
 * Shared translated-label helpers.
 *
 * These take the active `t` function as a parameter so they stay pure and
 * resolve at call time (never frozen at import time — see the i18n spec's
 * warning about module-level translated strings). The underlying stored /
 * submitted form values remain the canonical English strings, so the API
 * payload is unaffected by the active language.
 */

/** Stable category slugs — the value submitted to the API. */
export const CATEGORY_KEYS = [
  'pothole',
  'graffiti',
  'broken',
  'flooding',
  'lighting',
  'trees',
  'dumping',
  'other',
] as const;

export function categoryLabel(value: string, t: TFunction): string {
  return t(`categories.${value.toLowerCase()}`, { defaultValue: value });
}

/** A missing severity reads as "Not assessed". */
export function severityShortLabel(value: string | null | undefined, t: TFunction): string {
  return value ? t(`severityShort.${value}`, { defaultValue: value }) : t('severityShort.unassessed');
}

export function statusLabel(value: string, t: TFunction): string {
  return t(`status.${value}`, { defaultValue: value });
}

/**
 * Site types. `value` is the canonical string stored in the form and submitted
 * to the API; `key` selects the translated label for display only.
 */
export const SITE_TYPES: { value: string; key: string }[] = [
  { value: 'Road / Street', key: 'road' },
  { value: 'Footpath / Pathway', key: 'footpath' },
  { value: 'Park / Reserve', key: 'park' },
  { value: 'Public Building', key: 'building' },
  { value: 'Stormwater / Drain', key: 'stormwater' },
  { value: 'Street Lighting', key: 'streetLighting' },
  { value: 'Public Toilet', key: 'toilet' },
  { value: 'Other', key: 'other' },
];

const SITE_TYPE_KEYS: Record<string, string> = Object.fromEntries(
  SITE_TYPES.map((s) => [s.value, s.key]),
);

export function siteTypeLabel(value: string, t: TFunction): string {
  if (!value) return value;
  const key = SITE_TYPE_KEYS[value];
  return key ? t(`siteTypes.${key}`) : value;
}

/**
 * Gender options. `value` is the canonical string stored/submitted; `key`
 * selects the translated label for display only.
 */
export const GENDER_OPTIONS: { value: string; key: string }[] = [
  { value: 'Man', key: 'man' },
  { value: 'Woman', key: 'woman' },
  { value: 'Non-binary', key: 'non_binary' },
  { value: 'Prefer not to say', key: 'prefer_not' },
  { value: 'Other', key: 'other' },
];

const GENDER_KEYS: Record<string, string> = Object.fromEntries(
  GENDER_OPTIONS.map((g) => [g.value, g.key]),
);

export function genderLabel(value: string, t: TFunction): string {
  if (!value) return value;
  const key = GENDER_KEYS[value];
  return key ? t(`gender.${key}`) : value;
}

/** Maps the active i18n language to a BCP-47 tag for Intl date formatting. */
export function dateLocale(language: string): string {
  return language === 'pt-BR' ? 'pt-BR' : 'en-GB';
}
