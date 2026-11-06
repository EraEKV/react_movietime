import { useTranslation } from 'react-i18next'
import { LANGUAGES, languageInfo } from '../../shared/i18n/languages'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { languageChanged, selectLanguage } from '../../store/preferencesSlice'
import { buttonClass } from '../../shared/ui/Button/variants'
import Icon from '../../shared/ui/Icon/Icon'
import Menu from '../../shared/ui/Menu/Menu'
import styles from './Layout.module.css'

/**
 * Header language switcher: "EN ▾" opens English / Русский / Қазақша. The choice goes
 * through the same action as Settings, so it is saved on this device and in the account.
 */
export default function LanguageMenu() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const language = useAppSelector(selectLanguage)
  const current = languageInfo(language)

  return (
    <Menu
      label={t('header.language', { name: current.label })}
      align="right"
      triggerClassName={buttonClass('ghost', 'md')}
      trigger={
        <>
          {current.short}
          <Icon name="chevron-down" size={16} className={styles.langChevron} />
        </>
      }
      items={LANGUAGES.map((item) => ({
        label: item.label,
        checked: item.value === language,
        onSelect: () => dispatch(languageChanged(item.value)),
      }))}
    />
  )
}
