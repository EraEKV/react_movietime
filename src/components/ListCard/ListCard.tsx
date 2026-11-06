import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { imageUrl } from '../../shared/api/tmdb'
import type { ListRole, TitleList } from '../../types/list'
import { LIST_COVERS, titlesCount } from '../../utils/lists'
import { memberName } from '../../utils/sharing'
import AvatarStack from '../../shared/ui/AvatarStack/AvatarStack'
import { RoleBadge, VisibilityBadge } from '../../shared/ui/Badge/ListBadges'
import styles from './ListCard.module.css'

interface ListCardProps {
  list: TitleList
  /** Set on lists shared with you: shows the owner and your role instead of visibility. */
  role?: Exclude<ListRole, 'owner'>
}

/** A list in a grid: 4-poster collage, emoji tile, name, count and a badge. */
export default function ListCard({ list, role }: ListCardProps) {
  const { t } = useTranslation('lists')
  // Always four cells, empty ones stay as sunken tiles.
  const cells = Array.from({ length: LIST_COVERS }, (_, i) => list.covers[i] ?? null)
  const count = titlesCount(list.itemCount)
  const people = [list.ownerName, ...list.memberEmails.map(memberName)]

  return (
    <Link to={`/lists/${list.id}`} className={styles.card}>
      <div className={styles.collage} aria-hidden="true">
        {cells.map((path, i) => {
          const src = imageUrl(path, 'w185')
          return src ? <img key={i} src={src} alt="" loading="lazy" /> : <span key={i} />
        })}
        {/* Decorative: the name below is the accessible text. */}
        <span className={styles.emoji}>{list.emoji}</span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{list.name}</h3>
        <p className={styles.meta}>
          {role ? t('items.byOwner', { count, owner: list.ownerName }) : count}
        </p>
        <div className={styles.footer}>
          {role ? (
            <RoleBadge role={role} />
          ) : (
            <VisibilityBadge visibility={list.visibility} members={list.memberEmails.length} />
          )}
          {list.memberEmails.length > 0 && <AvatarStack people={people} size={24} />}
        </div>
      </div>
    </Link>
  )
}
