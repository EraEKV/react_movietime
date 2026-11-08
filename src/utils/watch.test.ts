import { describe, expect, it } from 'vitest'
import type { WatchProvider, WatchProviders } from '../types/tmdb'
import { hasNoOffers, offerGroups, pickRegion, regionOptions } from './watch'

const p = (id: number, name: string, priority: number): WatchProvider => ({
  provider_id: id,
  provider_name: name,
  logo_path: null,
  display_priority: priority,
})

const data: WatchProviders = {
  results: {
    US: {
      link: 'https://tmdb.test/us',
      flatrate: [p(2, 'B', 5), p(1, 'A', 5), p(3, 'C', 1)],
      buy: [p(4, 'D', 1)],
    },
    KZ: { link: 'https://tmdb.test/kz' },
    DE: { link: 'https://tmdb.test/de', rent: [p(5, 'E', 1)] },
  },
}

describe('offerGroups', () => {
  it('orders kinds cheapest first and providers by priority, then name', () => {
    const groups = offerGroups(data.results.US)
    expect(groups.map((g) => g.kind)).toEqual(['flatrate', 'buy'])
    expect(groups[0]?.providers.map((x) => x.provider_name)).toEqual(['C', 'A', 'B'])
  })

  it('leaves empty groups out and handles no data', () => {
    expect(offerGroups(data.results.KZ)).toEqual([])
    expect(offerGroups(undefined)).toEqual([])
  })
})

describe('pickRegion', () => {
  it('prefers the saved country', () => {
    expect(pickRegion(data, 'DE', 'en')).toBe('DE')
  })

  it('follows the interface language otherwise', () => {
    expect(pickRegion(data, null, 'en')).toBe('US')
    expect(pickRegion(data, null, 'kk')).toBe('KZ')
  })

  it('sends Kazakh to Russia when Kazakhstan has no data', () => {
    const noKz = { results: { DE: { link: 'de' }, RU: { link: 'ru' } } } satisfies WatchProviders
    expect(pickRegion(noKz, null, 'kk')).toBe('RU')
    expect(pickRegion(noKz, null, 'en')).toBe('DE')
  })

  it('falls back to the first available country, or the default when there is no data', () => {
    expect(pickRegion(data, null, 'ru')).toBe('DE')
    expect(pickRegion(undefined, null, 'ru')).toBe('RU')
  })
})

describe('regionOptions', () => {
  it('names countries in the language and keeps the selected one even without data', () => {
    const options = regionOptions(data, 'FR', 'en')
    expect(options.map((o) => o.value).toSorted()).toEqual(['DE', 'FR', 'KZ', 'US'])
    expect(options.find((o) => o.value === 'DE')?.label).toBe('Germany')
  })

  it('always lists Kazakhstan, even when TMDB has no data for it', () => {
    const noKz = { results: { DE: { link: 'de' } } } satisfies WatchProviders
    expect(regionOptions(noKz, 'DE', 'en').map((o) => o.value)).toContain('KZ')
  })

  it('has Kazakh names without Intl data', () => {
    expect(regionOptions(data, 'KZ', 'kk').find((o) => o.value === 'KZ')?.label).toBe('Қазақстан')
  })
})

describe('hasNoOffers', () => {
  it('is true only when no country has any offer', () => {
    expect(hasNoOffers(data)).toBe(false)
    expect(hasNoOffers({ results: { KZ: { link: 'x' } } })).toBe(true)
    expect(hasNoOffers(undefined)).toBe(true)
  })
})
