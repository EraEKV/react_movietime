import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../types/auth'
import type { LibraryEntry } from '../types/library'
import { createEntry } from '../utils/library'
import authSlice, { authChanged, authErrorCleared } from './authSlice'
import librarySlice, {
  accountLibraryLoading,
  guestEntryRemoved,
  guestEntrySaved,
  guestLibraryLoaded,
  libraryNoticeDismissed,
  libraryNoticeShown,
  selectFilteredLibrary,
  selectLibraryCounts,
} from './librarySlice'
import type { RootState } from './store'
import preferencesSlice, {
  languageChanged,
  preferencesSynced,
  themeChanged,
} from './preferencesSlice'

const user: AuthUser = {
  uid: 'u1',
  email: 'a@b.co',
  displayName: 'Ann',
  photoURL: null,
  emailVerified: true,
  providers: ['password'],
}

describe('authSlice', () => {
  it('starts loading, so guards wait for Firebase', () => {
    expect(authSlice.reducer(undefined, { type: 'init' }).status).toBe('loading')
  })
  it('authChanged sets the user and status', () => {
    const signedIn = authSlice.reducer(undefined, authChanged(user))
    expect(signedIn).toMatchObject({ user, status: 'authenticated' })
    expect(authSlice.reducer(signedIn, authChanged(null))).toMatchObject({
      user: null,
      status: 'guest',
    })
  })
  it('clears the error', () => {
    const state = { ...authSlice.reducer(undefined, { type: 'init' }), error: { code: 'x' } as never }
    expect(authSlice.reducer(state, authErrorCleared()).error).toBeNull()
  })
})

describe('preferencesSlice', () => {
  const initial = preferencesSlice.reducer(undefined, { type: 'init' })
  it('changes theme and language', () => {
    expect(preferencesSlice.reducer(initial, themeChanged('light')).theme).toBe('light')
    expect(preferencesSlice.reducer(initial, languageChanged('ru')).language).toBe('ru')
  })
  it('applies the account settings', () => {
    const next = preferencesSlice.reducer(initial, preferencesSynced({ theme: 'dark', language: 'kk' }))
    expect(next).toMatchObject({ theme: 'dark', language: 'kk' })
  })
})

describe('librarySlice', () => {
  const entry = (id: number, changes: Partial<LibraryEntry> = {}): LibraryEntry => ({
    ...createEntry(
      {
        mediaType: 'movie',
        tmdbId: id,
        title: `Movie ${id}`,
        posterPath: null,
        year: String(2000 + id),
        genreIds: [18],
        tmdbRating: 7,
        runtime: 100,
        totalEpisodes: null,
      },
      'plan',
      `2026-01-0${id}T10:00:00Z`,
    ),
    ...changes,
  })
  const reduce = (...actions: Parameters<typeof librarySlice.reducer>[1][]) =>
    actions.reduce(librarySlice.reducer, librarySlice.reducer(undefined, { type: 'init' }))
  const root = (library: ReturnType<typeof reduce>) => ({ library }) as unknown as RootState

  it('loads guest entries, newest change first', () => {
    const state = reduce(guestLibraryLoaded([entry(1), entry(3), entry(2)]))
    expect(state).toMatchObject({ source: 'guest', status: 'ready' })
    expect(state.ids).toEqual(['movie_3', 'movie_2', 'movie_1'])
  })
  it('saves and removes a guest entry', () => {
    const saved = reduce(guestLibraryLoaded([]), guestEntrySaved(entry(1)))
    expect(saved.ids).toEqual(['movie_1'])
    expect(reduce(guestEntryRemoved('movie_1' as never)).ids).toEqual([])
  })
  it('clears the previous entries while the account loads', () => {
    const state = reduce(guestLibraryLoaded([entry(1)]), accountLibraryLoading())
    expect(state).toMatchObject({ ids: [], source: 'account', status: 'loading' })
  })
  it('shows and dismisses a notice', () => {
    const shown = reduce(libraryNoticeShown({ tone: 'success', text: 'ok' }))
    expect(shown.notice).toEqual({ tone: 'success', text: 'ok' })
    expect(librarySlice.reducer(shown, libraryNoticeDismissed()).notice).toBeNull()
  })
  it('counts per status', () => {
    const state = reduce(guestLibraryLoaded([entry(1), entry(2, { status: 'completed' })]))
    expect(selectLibraryCounts(root(state))).toEqual({
      all: 2,
      plan: 1,
      watching: 0,
      completed: 1,
      dropped: 0,
    })
  })
  it('filters by status and search, and memoizes the result', () => {
    const state = root(reduce(guestLibraryLoaded([entry(1), entry(2, { status: 'completed' })])))
    const query = { search: '', status: 'completed', type: 'all', genre: '', sort: 'updated' } as never
    const first = selectFilteredLibrary(state, query)
    expect(first.map((e) => e.key)).toEqual(['movie_2'])
    expect(selectFilteredLibrary(state, { ...(query as object) } as never)).toBe(first)
    expect(selectFilteredLibrary(state, { ...(query as object), search: 'zzz' } as never)).toEqual([])
  })
})
