import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import type { PlanSession, SessionProposal } from '../../types/plan'
import { formatDay } from '../../utils/calendar'
import Button from '../../shared/ui/Button/Button'
import Icon from '../../shared/ui/Icon/Icon'
import addStyles from '../AddTitles/AddTitles.module.css'
import styles from './MarathonVotes.module.css'

interface ProposalsPanelProps {
  offers: { proposal: SessionProposal; session: PlanSession }[]
  onDecide: (proposal: SessionProposal, session: PlanSession, accept: boolean) => Promise<void>
}

/** The owner's list of open film suggestions: accept swaps the film, reject closes it. */
export default function ProposalsPanel({ offers, onDecide }: ProposalsPanelProps) {
  const { t } = useTranslation('planner')
  const [busy, setBusy] = useState<string | null>(null)

  const decide = (id: string, action: () => Promise<void>) => {
    setBusy(id)
    void action().finally(() => setBusy(null))
  }

  return (
    <section className={styles.panel} aria-labelledby="proposals-title">
      <h2 id="proposals-title" className={styles.panelTitle}>
        {t('votes.panel.title', { count: offers.length })}
      </h2>
      <ul className={styles.offers}>
        {offers.map(({ proposal, session }) => {
          const poster = imageUrl(proposal.unit.media?.posterPath ?? null, 'w92')
          const current = session.units[0]?.title ?? ''
          const date = formatDay(session.date, { weekday: 'short', month: 'short', day: 'numeric' })
          return (
            <li key={proposal.id} className={styles.offer}>
              <div className={styles.offerBody}>
                <span className={addStyles.poster} aria-hidden="true">
                  {poster ? (
                    <img src={poster} alt="" loading="lazy" />
                  ) : (
                    <Icon name="film" size={16} />
                  )}
                </span>
                <span className={styles.offerText}>
                  <strong>
                    {t('votes.panel.offer', { name: proposal.by.name, film: proposal.unit.title })}
                  </strong>
                  <span>{t('votes.panel.instead', { film: current, date })}</span>
                </span>
              </div>
              <div className={styles.offerActions}>
                <Button
                  size="sm"
                  variant="primary"
                  icon="check"
                  loading={busy === proposal.id}
                  disabled={busy !== null}
                  aria-label={t('votes.panel.acceptLabel', { film: proposal.unit.title })}
                  onClick={() => decide(proposal.id, () => onDecide(proposal, session, true))}
                >
                  {t('votes.panel.accept')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="x"
                  disabled={busy !== null}
                  aria-label={t('votes.panel.rejectLabel', { film: proposal.unit.title })}
                  onClick={() => decide(proposal.id, () => onDecide(proposal, session, false))}
                >
                  {t('votes.panel.reject')}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
