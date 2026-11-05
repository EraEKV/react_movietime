import Icon from '../Icon/Icon'
import styles from './Pagination.module.css'

/** Returns page numbers around the current one, with null marking a gap. */
function getPageItems(page: number, totalPages: number): (number | null)[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

  const items: (number | null)[] = []
  sorted.forEach((p, i) => {
    const previous = sorted[i - 1]
    if (previous !== undefined && p - previous > 1) items.push(null)
    items.push(p)
  })
  return items
}

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <ul className={styles.pages}>
        <li>
          <button
            type="button"
            className={styles.button}
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <Icon name="chevron-left" size={18} />
          </button>
        </li>
        {getPageItems(page, totalPages).map((p, i) =>
          p === null ? (
            // Gaps are positional (before/after the current window), so key by position.
            <li key={`gap-${i}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={styles.button}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={styles.button}
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </li>
      </ul>
    </nav>
  )
}
