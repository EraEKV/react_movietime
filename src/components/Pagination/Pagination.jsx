import styles from './Pagination.module.css'

/** Returns page numbers around the current one, with null marking a gap. */
function getPageItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

  const items = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(null)
    items.push(p)
  })
  return items
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className={styles.button}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        ‹ Prev
      </button>

      <ul className={styles.pages}>
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
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        className={styles.button}
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        Next ›
      </button>
    </nav>
  )
}
