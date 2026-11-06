import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { WatchProviders } from '../../types/tmdb'
import { WATCH_REGION_KEY } from '../../storage/watchRegionStorage'
import WhereToWatch from './WhereToWatch'

const provider = (id: number, name: string) => ({
  provider_id: id,
  provider_name: name,
  logo_path: `/${id}.jpg`,
  display_priority: id,
})

const data: WatchProviders = {
  results: {
    US: {
      link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
      flatrate: [provider(1, 'Netflix')],
      rent: [provider(2, 'Apple TV')],
    },
    DE: {
      link: 'https://www.themoviedb.org/movie/1/watch?locale=DE',
      buy: [provider(3, 'Amazon')],
    },
    KZ: { link: 'https://www.themoviedb.org/movie/1/watch?locale=KZ' },
  },
}

describe('WhereToWatch', () => {
  beforeEach(() => localStorage.clear())

  it('shows the providers of the default country in groups, with the JustWatch credit', () => {
    render(<WhereToWatch providers={data} />)
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('US')
    expect(screen.getByText('Netflix')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Stream' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Rent' })).toBeInTheDocument()
    expect(screen.queryByText('Amazon')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'JustWatch' })).toHaveAttribute(
      'href',
      'https://www.justwatch.com',
    )
    expect(screen.getByRole('link', { name: /All options for this country/ })).toHaveAttribute(
      'href',
      'https://www.themoviedb.org/movie/1/watch?locale=US',
    )
  })

  it('switches the country and remembers it', async () => {
    render(<WhereToWatch providers={data} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'DE')
    expect(screen.getByText('Amazon')).toBeInTheDocument()
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
    expect(localStorage.getItem(WATCH_REGION_KEY)).toBe('DE')
  })

  it('starts from the saved country', () => {
    localStorage.setItem(WATCH_REGION_KEY, 'DE')
    render(<WhereToWatch providers={data} />)
    expect(screen.getByText('Amazon')).toBeInTheDocument()
  })

  it('says so when this country has no offers but others do', async () => {
    localStorage.setItem(WATCH_REGION_KEY, 'KZ')
    render(<WhereToWatch providers={data} />)
    expect(screen.getByText(/Try another country/)).toBeInTheDocument()
  })

  it('says so when TMDB has nothing at all', () => {
    render(<WhereToWatch providers={undefined} />)
    expect(screen.getByText('No streaming information for this title yet.')).toBeInTheDocument()
  })
})
