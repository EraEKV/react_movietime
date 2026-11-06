import { Link } from 'react-router'
import { imageUrl } from '../../api/tmdb'
import type { ListRole, TitleList } from '../../types/list'
import { LIST_COVERS, titlesCount } from '../../utils/lists'
import { RoleBadge, VisibilityBadge } from '../Badge/ListBadges'
import styles from './ListCard.module.css'

interface ListCardProps {
  list: TitleList
  /** Set on lists shared with you: shows the owner and your role instead of visibility. */
  role?: Exclude<ListRole, 'owner'>
}

/** A list in a grid: 4-poster collage, emoji tile, name, count and a badge. */
export default function ListCard({ list, role }: ListCardProps) {
  // Always four cells, empty ones stay as sunken tiles.
  const cells = Array.from({ length: LIST_COVERS }, (_, i) => list.covers[i] ?? null)
  const count = titlesCount(list.itemCount)

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
        <p className={styles.meta}>{role ? `${count} · by ${list.ownerName}` : count}</p>
        <div className={styles.footer}>
          {role ? (
            <RoleBadge role={role} />
          ) : (
            <VisibilityBadge visibility={list.visibility} members={list.memberEmails.length} />
          )}
        </div>
      </div>
    </Link>
  )
}
