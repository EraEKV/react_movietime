import type { SeriesProgress } from '../../types/library'
import type { PlanUnit } from '../../types/plan'
import { episodeCode, formatRuntime, pluralize } from '../../utils/format'
import { continueIndex, type StartChoice } from '../../utils/planner'
import Banner from '../Banner/Banner'
import RadioCards, { type RadioCardOption } from '../RadioCards/RadioCards'
import SelectField from '../SelectField/SelectField'
import styles from './Planner.module.css'

interface StartStepProps {
  kind: 'series' | 'list'
  units: PlanUnit[]
  progress: SeriesProgress | null
  choice: StartChoice
  onChange: (choice: StartChoice) => void
  skipped: number
}

type Mode = 'continue' | 'beginning' | 'episode'

const code = (u: PlanUnit | undefined) =>
  u && u.season !== null && u.episode !== null ? episodeCode(u.season, u.episode) : ''

/** Step 2: where the plan starts — after your progress, from S1E1, or any episode/movie. */
export default function StartStep({
  kind,
  units,
  progress,
  choice,
  onChange,
  skipped,
}: StartStepProps) {
  if (kind === 'list')
    return <MovieStart units={units} choice={choice} onChange={onChange} skipped={skipped} />

  const next = continueIndex(units, progress)
  const caughtUp = progress !== null && next >= units.length
  const options: RadioCardOption<Mode>[] = []
  if (progress && !caughtUp) {
    options.push({
      value: 'continue',
      label: `Continue from ${code(units[next])}`,
      description: `Right after your last watched episode (${episodeCode(progress.season, progress.episode)}) · ${pluralize(units.length - next, 'episode')}`,
      icon: 'play',
    })
  }
  options.push(
    {
      value: 'beginning',
      label: 'From the beginning',
      description: `${code(units[0])} · ${pluralize(units.length, 'episode')}`,
      icon: 'refresh',
    },
    {
      value: 'episode',
      label: 'Choose an episode',
      description: 'Pick a season and episode',
      icon: 'list',
    },
  )

  const seasons = [...new Set(units.map((u) => u.season ?? 0))]
  const season = choice.mode === 'episode' ? choice.season : (units[0]?.season ?? 1)
  const episodes = units.filter((u) => u.season === season)

  return (
    <div className={styles.stack}>
      {caughtUp && (
        <Banner>
          You’ve watched every aired episode. Plan a rewatch from the start or any episode.
        </Banner>
      )}
      <RadioCards
        legend="Start from"
        options={options}
        value={choice.mode === 'movie' ? 'beginning' : choice.mode}
        onChange={(mode) =>
          onChange(
            mode === 'episode'
              ? { mode, season: units[0]?.season ?? 1, episode: units[0]?.episode ?? 1 }
              : { mode },
          )
        }
      />
      {choice.mode === 'episode' && (
        <div className={styles.row}>
          <SelectField
            label="Season"
            value={String(season)}
            options={seasons.map((s) => ({ value: String(s), label: `Season ${s}` }))}
            onChange={(value) => {
              const first = units.find((u) => u.season === Number(value))
              onChange({ mode: 'episode', season: Number(value), episode: first?.episode ?? 1 })
            }}
          />
          <SelectField
            label="Episode"
            value={String(choice.episode)}
            options={episodes.map((u) => ({
              value: String(u.episode),
              label: `Episode ${u.episode} · ${u.title}`.slice(0, 60),
            }))}
            onChange={(value) => onChange({ mode: 'episode', season, episode: Number(value) })}
          />
        </div>
      )}
    </div>
  )
}

function MovieStart({
  units,
  choice,
  onChange,
  skipped,
}: Pick<StartStepProps, 'units' | 'choice' | 'onChange' | 'skipped'>) {
  const index = choice.mode === 'movie' ? choice.index : 0
  return (
    <div className={styles.stack}>
      {skipped > 0 && (
        <Banner>
          {pluralize(skipped, 'series')} in this list {skipped === 1 ? 'is' : 'are'} left out: a
          marathon plans movies. Plan a series on its own.
        </Banner>
      )}
      <SelectField
        label="Start with"
        value={String(index)}
        options={units.map((u, i) => ({ value: String(i), label: `${i + 1}. ${u.title}` }))}
        onChange={(value) => onChange({ mode: 'movie', index: Number(value) })}
      />
      <ol className={styles.movies} aria-label="Movies in the plan">
        {units.map((u, i) => (
          <li key={u.mediaKey} className={i < index ? styles.movieOut : undefined}>
            <span className={styles.movieTitle}>{u.title}</span>
            <span className={styles.muted}>{formatRuntime(u.runtime)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
