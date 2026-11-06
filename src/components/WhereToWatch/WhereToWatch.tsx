import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import type { Language } from '../../shared/types/preferences'
import SelectField from '../../shared/ui/SelectField/SelectField'
import Icon from '../../shared/ui/Icon/Icon'
import { loadWatchRegion, saveWatchRegion } from '../../storage/watchRegionStorage'
import type { WatchProviders } from '../../types/tmdb'
import { hasNoOffers, offerGroups, pickRegion, regionOptions } from '../../utils/watch'
import styles from './WhereToWatch.module.css'

/**
 * Official places to watch a title in one country: subscription, free, with ads, rent, buy.
 * The data is TMDB's /watch/providers, which comes from JustWatch (TMDB's terms ask for that
 * credit next to it). It only points to services; the app plays nothing itself.
 * The country starts from the interface language and the choice is remembered on the device.
 */
export default function WhereToWatch({ providers }: { providers: WatchProviders | undefined }) {
  const { t, i18n } = useTranslation('catalog', { keyPrefix: 'watch' })
  const [saved, setSaved] = useState(loadWatchRegion)
  const region = pickRegion(providers, saved, i18n.language as Language)
  const groups = offerGroups(providers?.results[region])
  const link = providers?.results[region]?.link

  function change(code: string) {
    setSaved(code)
    saveWatchRegion(code)
  }

  return (
    <div className={styles.block}>
      <SelectField
        className={styles.region}
        label={t('region')}
        value={region}
        options={regionOptions(providers, region)}
        onChange={change}
      />

      {groups.length > 0 ? (
        groups.map((group) => (
          <section key={group.kind} className={styles.group} aria-label={t(`kind.${group.kind}`)}>
            <h3 className={styles.kind}>{t(`kind.${group.kind}`)}</h3>
            <ul className={styles.list}>
              {group.providers.map((provider) => (
                <li key={provider.provider_id} className={styles.provider}>
                  {imageUrl(provider.logo_path, 'w92') ? (
                    <img
                      src={imageUrl(provider.logo_path, 'w92') ?? ''}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                    />
                  ) : (
                    <span className={styles.noLogo} aria-hidden="true" />
                  )}
                  <span className={styles.name}>{provider.provider_name}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className={styles.empty}>{hasNoOffers(providers) ? t('none') : t('noneHere')}</p>
      )}

      <p className={styles.credit}>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {t('seeAll')}
            <Icon name="arrow-right" size={14} />
          </a>
        )}
        <span>
          {t('credit')}{' '}
          <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer">
            JustWatch
          </a>
        </span>
      </p>
    </div>
  )
}
