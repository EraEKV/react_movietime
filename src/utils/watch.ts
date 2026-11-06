import { currentLocale } from '../shared/i18n'
import { regionNameWith } from '../shared/i18n/intl'
import type { Language } from '../shared/types/preferences'
import type { Option } from '../shared/types/common'
import type { WatchProvider, WatchProviders, WatchRegion } from '../types/tmdb'

// "Where to watch": pure helpers over TMDB's /watch/providers data (which comes from JustWatch).

/** A country guessed from the interface language until the person picks one. */
export const DEFAULT_REGION: Record<Language, string> = { en: 'US', ru: 'RU', kk: 'KZ' }

/** Offer kinds in the order they are shown: the cheapest way to watch first. */
export const OFFER_KINDS = ['flatrate', 'free', 'ads', 'rent', 'buy'] as const
export type OfferKind = (typeof OFFER_KINDS)[number]

export interface OfferGroup {
  kind: OfferKind
  providers: WatchProvider[]
}

/** Providers of one country as ordered groups; empty groups are left out. */
export function offerGroups(region: WatchRegion | undefined): OfferGroup[] {
  if (!region) return []
  return OFFER_KINDS.map((kind) => ({
    kind,
    providers: (region[kind] ?? []).toSorted(
      (a, b) =>
        a.display_priority - b.display_priority || a.provider_name.localeCompare(b.provider_name),
    ),
  })).filter((group) => group.providers.length > 0)
}

/** Which country to show: the saved choice, else the language's default, else the first one. */
export function pickRegion(
  data: WatchProviders | undefined,
  saved: string | null,
  language: Language,
): string {
  const codes = Object.keys(data?.results ?? {})
  if (saved) return saved
  const fallback = DEFAULT_REGION[language]
  return codes.includes(fallback) || codes.length === 0
    ? fallback
    : (codes.toSorted()[0] ?? fallback)
}

/**
 * Country options for the picker, named in the interface language: every country TMDB has
 * data for, plus the chosen one (it may have no data, and it must stay selectable).
 */
export function regionOptions(
  data: WatchProviders | undefined,
  selected: string,
  locale = currentLocale(),
): Option<string>[] {
  const codes = new Set([...Object.keys(data?.results ?? {}), selected])
  return [...codes]
    .map((code) => ({ value: code, label: regionNameWith(code, locale) }))
    .toSorted((a, b) => a.label.localeCompare(b.label, locale))
}

/** True when TMDB knows no offers in any country. */
export const hasNoOffers = (data: WatchProviders | undefined): boolean =>
  offerGroupsCount(data) === 0

function offerGroupsCount(data: WatchProviders | undefined): number {
  return Object.values(data?.results ?? {}).reduce(
    (sum, region) => sum + offerGroups(region).length,
    0,
  )
}
