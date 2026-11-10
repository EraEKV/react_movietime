import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlanSession, SessionLike, SessionProposal } from '../../types/plan'
import Button from '../../shared/ui/Button/Button'
import styles from './MarathonVotes.module.css'

interface MarathonVotesProps {
  session: PlanSession
  /** Only the likes for the film the session holds now (utils/marathonVotes.likesOf). */
  likes: SessionLike[]
  ownUid: string | null
  ownerName: string
  /** Owner, editor and viewer can like; link visitors only see the count. */
  canLike: boolean
  /** Editors and viewers suggest; the owner decides instead. */
  canSuggest: boolean
  /** My suggestion for this session, if it is still about the current film. */
  mine: SessionProposal | null
  onLike: (on: boolean) => Promise<void>
  onSuggest: () => void
  onWithdraw: () => Promise<void>
}

/** Who liked: "You, Ann +2". */
function whoLine(
  likes: SessionLike[],
  ownUid: string | null,
  you: string,
  more: (n: number) => string,
) {
  const names = likes
    .toSorted((a, b) => Number(b.uid === ownUid) - Number(a.uid === ownUid))
    .map((l) => (l.uid === ownUid ? you : l.name))
  const shown = names.slice(0, 2).join(', ')
  return names.length > 2 ? `${shown} ${more(names.length - 2)}` : shown
}

/** The 👍, "suggest another film" and the state of my suggestion, under a marathon session. */
export default function MarathonVotes({
  session,
  likes,
  ownUid,
  ownerName,
  canLike,
  canSuggest,
  mine,
  onLike,
  onSuggest,
  onWithdraw,
}: MarathonVotesProps) {
  const { t } = useTranslation('planner')
  const [busy, setBusy] = useState<'like' | 'withdraw' | null>(null)
  const film = session.units[0]?.title ?? ''
  const liked = likes.some((l) => l.uid === ownUid)

  const run = (kind: 'like' | 'withdraw', action: () => Promise<void>) => {
    setBusy(kind)
    void action().finally(() => setBusy(null))
  }

  if (!canLike && !canSuggest && likes.length === 0) return null
  return (
    <>
      <div className={styles.votes}>
        {canLike ? (
          <button
            type="button"
            className={styles.like}
            aria-pressed={liked}
            aria-label={t(liked ? 'votes.unlike' : 'votes.like', { film })}
            disabled={busy !== null}
            onClick={() => run('like', () => onLike(!liked))}
          >
            <span aria-hidden="true">👍</span>
            {likes.length > 0 && <span>{likes.length}</span>}
          </button>
        ) : (
          likes.length > 0 && (
            <span
              className={`${styles.like} ${styles.count}`}
              role="img"
              aria-label={t('votes.count', { count: likes.length })}
            >
              <span aria-hidden="true">👍</span>
              <span aria-hidden="true">{likes.length}</span>
            </span>
          )
        )}
        {likes.length > 0 && (
          <span className={styles.who}>
            {whoLine(likes, ownUid, t('votes.you'), (n) => t('votes.more', { count: n }))}
          </span>
        )}
        {canSuggest && !mine && (
          <Button size="sm" variant="ghost" icon="refresh" onClick={onSuggest}>
            {t('votes.suggest')}
          </Button>
        )}
      </div>
      {mine && (
        <div className={styles.note}>
          <span>
            {mine.status === 'rejected'
              ? t('votes.declined', { owner: ownerName, film: mine.unit.title })
              : t('votes.waiting', { film: mine.unit.title, owner: ownerName })}
          </span>
          <Button
            size="sm"
            variant="ghost"
            loading={busy === 'withdraw'}
            disabled={busy !== null}
            onClick={() => run('withdraw', onWithdraw)}
          >
            {t(mine.status === 'rejected' ? 'votes.dismiss' : 'votes.withdraw')}
          </Button>
        </div>
      )}
    </>
  )
}
