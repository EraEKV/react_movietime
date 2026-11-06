import { describe, expect, it } from 'vitest'
import {
  catalogPath,
  countActiveFilters,
  filterKeys,
  parseFilters,
  sharedCatalogParams,
} from './filters'

const parse = (query: string, type: 'movie' | 'tv' = 'movie') =>
  parseFilters(new URLSearchParams(query), type)

describe('parseFilters', () => {
  it('falls back to defaults for an empty URL', () => {
    expect(parse('')).toMatchObject({ genre: '', year: '', rating: '', lang: '', sort: 'popular' })
  })
  it('drops unknown values instead of passing them to the API', () => {
    const filters = parse('genre=abc&rating=99&lang=zz&sort=bogus&year=1')
    expect(filters).toMatchObject({ genre: '', rating: '', lang: '', sort: 'popular', year: '' })
  })
  it('keeps valid values', () => {
    expect(parse('genre=18&sort=newest')).toMatchObject({ genre: '18', sort: 'newest' })
  })
  it('accepts status only for series and runtime only for movies', () => {
    expect(parse('status=ended&runtime=90', 'movie').status).toBe('')
    expect(parse('status=ended&runtime=90', 'tv').runtime).toBe('')
  })
})

describe('filters', () => {
  it('has five filters per catalog', () => {
    expect(filterKeys('movie')).toHaveLength(5)
    expect(filterKeys('tv')).toHaveLength(5)
  })
  it('counts active filters, sort included', () => {
    expect(countActiveFilters(parse(''), 'movie')).toBe(0)
    expect(countActiveFilters(parse('genre=18&sort=oldest'), 'movie')).toBe(2)
  })
  it('keeps only shared params when switching catalogs', () => {
    const shared = sharedCatalogParams(new URLSearchParams('q=dune&genre=18&page=3&size=40'))
    expect(shared.toString()).toBe('q=dune&size=40')
  })
})

describe('catalogPath', () => {
  it('uses discover with the filters', () => {
    const path = catalogPath('movie', parse('genre=18&sort=top-rated'), '', 2)
    expect(path).toContain('/discover/movie')
    expect(path).toContain('with_genres=18')
    expect(path).toContain('page=2')
    expect(path).toContain('sort_by=vote_average.desc')
  })
  it('switches to search when there is a query', () => {
    const path = catalogPath('tv', parse('genre=18', 'tv'), 'dark', 1)
    expect(path).toContain('/search/tv')
    expect(path).toContain('query=dark')
    expect(path).not.toContain('with_genres')
  })
})
