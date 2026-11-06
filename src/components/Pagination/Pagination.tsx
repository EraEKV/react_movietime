import { useTranslation } from 'react-i18next'
import type { Option } from '../../types/common'
import Icon from '../Icon/Icon'
import SelectField from '../SelectField/SelectField'
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

interface PageSizeControl<S extends string> {
  value: S
  options: Option<S>[]
  onChange: (value: S) => void
}

interface PaginationProps<S extends string> {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Optional "Per page" select next to the page buttons. */
  pageSize?: PageSizeControl<S>
}

export default function Pagination<S extends string>({
  page,
  totalPages,
  onPageChange,
  pageSize,
}: PaginationProps<S>) {
  const { t } = useTranslation()
  // The size select stays even with one page: switching back from 60 to 20 must be possible.
  if (totalPages <= 1 && !pageSize) return null

  return (
    <div className={styles.pagination}>
      {totalPages > 1 && (
        <PageButtons page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
      {pageSize && (
        <SelectField
          label={t('pagination.perPage')}
          className={styles.size}
          value={pageSize.value}
          options={pageSize.options}
          onChange={pageSize.onChange}
        />
      )}
    </div>
  )
}

function PageButtons({
  page,
  totalPages,
  onPageChange,
}: Pick<PaginationProps<string>, 'page' | 'totalPages' | 'onPageChange'>) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('pagination.label')}>
      <ul className={styles.pages}>
        <li>
          <button
            type="button"
            className={styles.button}
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label={t('pagination.previous')}
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
                aria-label={t('pagination.page', { page: p })}
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
            aria-label={t('pagination.next')}
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </li>
      </ul>
    </nav>
  )
}
