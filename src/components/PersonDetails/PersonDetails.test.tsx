import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/tmdb'
import type { LibraryEntry } from '../../types/library'
import type { PersonCastCredit, PersonCrewCredit, PersonDetails as Person } from '../../types/tmdb'
import PersonDetails from './PersonDetails'

type State =
  | { status: 'loading'; data: null; error: null; reload: () => void }
  | { status: 'error'; data: null; error: Error; reload: () => void }
  | { status: 'success'; data: Person; error: null; reload: () => void }

let state: State
let online = true
let entries: Pick<LibraryEntry, 'key' | 'status'>[] = []

vi.mock('../../shared/hooks/useFetch', () => ({ useFetch: () => state }))
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => online }))
vi.mock('../../hooks/useLibrary', () => ({ useLibrary: () => ({ entries }) }))

const reload = vi.fn()

function cast(id: number, over: Partial<PersonCastCredit> = {}): PersonCastCredit {
  return {
    id,
    media_type: 'movie',
    title: `Movie ${id}`,
    release_date: '2010-01-01',
    poster_path: null,
    popularity: id,
    vote_average: 7,
    genre_ids: [],
    credit_id: `c${id}`,
    character: 'Hero',
    ...over,
  }
}

function crew(id: number, job: string, over: Partial<PersonCrewCredit> = {}): PersonCrewCredit {
  return { ...cast(id), job, department: 'Directing', credit_id: `k${id}${job}`, ...over }
}

function person(over: Partial<Person> = {}): Person {
  return {
    id: 1,
    name: 'Ada Lovelace',
    biography: 'First paragraph.\n\nSecond paragraph.',
    birthday: '1980-05-06',
    deathday: null,
    place_of_birth: 'London, UK',
    profile_path: null,
    known_for_department: 'Acting',
    combined_credits: { cast: [], crew: [] },
    ...over,
  }
}

const success = (data: Person): State => ({ status: 'success', data, error: null, reload })

function setup() {
  return render(
    <MemoryRouter>
      <PersonDetails personId="1" />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  online = true
  entries = []
  reload.mockClear()
  state = success(person())
})

describe('PersonDetails states', () => {
  it('shows a labelled skeleton while loading', () => {
    state = { status: 'loading', data: null, error: null, reload }
    setup()
    expect(screen.getByLabelText('Loading person')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the error with Try again, which reloads', async () => {
    state = { status: 'error', data: null, error: new Error('boom'), reload }
    setup()
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load this profile')
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('says so when the request failed because the device is offline', () => {
    online = false
    state = { status: 'error', data: null, error: new ApiError('Network', 0), reload }
    setup()
    expect(screen.getByRole('alert')).toHaveTextContent('You’re offline')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows "not found" without Try again for a 404', () => {
    state = { status: 'error', data: null, error: new ApiError('Not found', 404), reload }
    setup()
    expect(screen.getByRole('alert')).toHaveTextContent('Person not found')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows the empty state when TMDB has no credits', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Ada Lovelace', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('No credits yet')).toBeInTheDocument()
    expect(screen.queryByText('Known for')).not.toBeInTheDocument()
  })
})

describe('PersonDetails profile', () => {
  it('shows the biography, birth data and place', () => {
    setup()
    expect(screen.getByText('First paragraph.')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
    expect(screen.getByText('London, UK')).toBeInTheDocument()
    expect(screen.getByText('Born')).toBeInTheDocument()
    expect(screen.queryByText('Died')).not.toBeInTheDocument()
  })

  it('says when there is no biography', () => {
    state = success(person({ biography: '' }))
    setup()
    expect(screen.getByText(/don’t have a biography for Ada Lovelace/)).toBeInTheDocument()
  })

  it('folds a long biography behind a toggle', async () => {
    state = success(person({ biography: 'word '.repeat(300) }))
    setup()
    const toggle = screen.getByRole('button', { name: 'Read more' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})

describe('PersonDetails filmography', () => {
  const credits = {
    cast: [
      ...Array.from({ length: 5 }, (_, i) => cast(i + 1)),
      cast(6, {
        media_type: 'tv',
        title: undefined,
        name: 'Show 6',
        release_date: undefined,
        first_air_date: '2015-01-01',
        episode_count: 12,
      }),
      cast(7, { release_date: '2099-01-01' }),
      cast(8, { release_date: '' }),
    ],
    crew: [
      crew(1, 'Director'),
      crew(1, 'Screenplay'),
      crew(9, 'Director', { release_date: '2005-01-01' }),
    ],
  }

  beforeEach(() => {
    state = success(person({ combined_credits: credits }))
  })

  it('lists each title once even with several jobs, and puts unreleased ones apart', () => {
    setup()
    const all = screen.getByRole('list', { name: 'Filmography of Ada Lovelace' })
    expect(within(all).getAllByRole('link')).toHaveLength(7) // 1–6 and 9
    expect(within(all).getAllByRole('link', { name: /Movie 1/ })).toHaveLength(1)

    const upcoming = screen.getByRole('list', { name: 'Not released yet' })
    expect(within(upcoming).getAllByRole('link')).toHaveLength(2)
    expect(within(upcoming).getByText(/Date to be announced/)).toBeInTheDocument()
  })

  it('shows "Known for" with the most popular works first', () => {
    setup()
    const strip = screen.getByRole('list', { name: 'Best-known works' })
    const names = within(strip)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(names).toEqual(['Show 6', 'Movie 5', 'Movie 4', 'Movie 3', 'Movie 2', 'Movie 1'])
  })

  it('marks library titles and counts what you have seen', () => {
    entries = [
      { key: 'movie_1', status: 'completed' },
      { key: 'movie_2', status: 'plan' },
      { key: 'tv_6', status: 'watching' },
    ]
    setup()
    expect(screen.getByText('You’ve seen 1 of 7')).toBeInTheDocument()
    expect(screen.getByText('In your plan: 1')).toBeInTheDocument()
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Plan to watch').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('progressbar', { name: 'Watched from this filmography' }),
    ).toHaveAttribute('aria-valuenow', '14')
  })

  it('filters by role and the counter follows the filter', async () => {
    entries = [{ key: 'movie_1', status: 'completed' }]
    setup()
    await userEvent.click(screen.getByRole('radio', { name: 'Director' }))
    const list = screen.getByRole('list', { name: 'Filmography of Ada Lovelace' })
    expect(within(list).getAllByRole('link')).toHaveLength(2) // 1 and 9
    expect(screen.getByText('You’ve seen 1 of 2')).toBeInTheDocument()
  })

  it('filters by type', async () => {
    setup()
    await userEvent.click(screen.getByRole('radio', { name: 'Series' }))
    const list = screen.getByRole('list', { name: 'Filmography of Ada Lovelace' })
    expect(within(list).getAllByRole('link')).toHaveLength(1)
    expect(within(list).getByText(/12 episodes/)).toBeInTheDocument()
  })

  it('sorts by year or popularity', async () => {
    setup()
    const titles = () =>
      within(screen.getByRole('list', { name: 'Filmography of Ada Lovelace' }))
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent)
    expect(titles()[0]).toBe('Show 6') // 2015, the newest
    await userEvent.click(screen.getByRole('radio', { name: 'Popularity' }))
    expect(titles().slice(0, 3)).toEqual(['Movie 9', 'Show 6', 'Movie 5'])
  })

  it('offers only the roles and types the person has', () => {
    state = success(person({ combined_credits: { cast: [cast(1), cast(2)], crew: [] } }))
    setup()
    expect(screen.queryByRole('radiogroup', { name: 'Role' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Type' })).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Sort by' })).toBeInTheDocument()
  })

  it('explains an empty filter and clears it', async () => {
    state = success(
      person({
        combined_credits: {
          cast: [
            cast(2, {
              media_type: 'tv',
              title: undefined,
              name: 'Show 2',
              release_date: undefined,
              first_air_date: '2012-01-01',
            }),
          ],
          crew: [crew(1, 'Director')],
        },
      }),
    )
    setup()
    await userEvent.click(screen.getByRole('radio', { name: 'Director' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Series' }))
    expect(screen.getByText('Nothing matches these filters')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.queryByText('Nothing matches these filters')).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Filmography of Ada Lovelace' })).toBeInTheDocument()
  })
})
