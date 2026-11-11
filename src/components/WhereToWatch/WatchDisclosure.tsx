import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../../shared/api/tmdb'
import { useFetch } from '../../shared/hooks/useFetch'
import Button from '../../shared/ui/Button/Button'
import Skeleton from '../../shared/ui/Skeleton/Skeleton'
import type { MediaType } from '../../types/media'
import type { WatchProviders } from '../../types/tmdb'
import WhereToWatch from './WhereToWatch'
import styles from './WatchDisclosure.module.css'

interface WatchDisclosureProps {
  mediaType: MediaType
  tmdbId: number
}

/**
 * A "Where to watch" button that opens the services for one title in place. Nothing is
 * requested until it is opened, so a plan of thirty films costs no extra requests on load.
 */
export default function WatchDisclosure({ mediaType, tmdbId }: WatchDisclosureProps) {
  const { t } = useTranslation(['catalog', 'common'])
  const [open, setOpen] = useState(false)
  // Once asked, the answer stays mounted (only hidden), so closing and opening costs nothing.
  const [asked, setAsked] = useState(false)
  const panel = useId()

  return (
    <div className={styles.root}>
      <Button
        variant="ghost"
        icon="play"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => {
          setOpen(!open)
          setAsked(true)
        }}
      >
        {t('catalog:watch.title')}
      </Button>
      <div id={panel} hidden={!open} className={styles.panel}>
        {asked && <Providers mediaType={mediaType} tmdbId={tmdbId} />}
      </div>
    </div>
  )
}

function Providers({ mediaType, tmdbId }: WatchDisclosureProps) {
  const { t } = useTranslation('common')
  const request = useFetch<{ 'watch/providers'?: WatchProviders }>(
    endpoints.watchProviders(mediaType, tmdbId),
  )

  if (request.status === 'error') {
    return (
      <div className={styles.error} role="alert">
        <span>{request.error.message}</span>
        <Button size="sm" variant="secondary" onClick={request.reload}>
          {t('actions.tryAgain')}
        </Button>
      </div>
    )
  }
  if (request.status !== 'success') return <Skeleton height={96} radius="md" />
  return <WhereToWatch providers={request.data['watch/providers']} />
}
