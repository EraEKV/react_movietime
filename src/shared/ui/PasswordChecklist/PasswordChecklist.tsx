import { useTranslation } from 'react-i18next'
import { passwordRules } from '../../lib/validation'
import Icon from '../Icon/Icon'
import styles from './PasswordChecklist.module.css'

/** Live rules under the signup password. A met rule changes icon and colour, and says so. */
export default function PasswordChecklist({ value, id }: { value: string; id?: string }) {
  const { t } = useTranslation()
  return (
    <ul className={styles.list} id={id} aria-label={t('validation.passwordRules')}>
      {passwordRules(value).map((rule) => (
        <li key={rule.id} className={rule.met ? styles.met : undefined}>
          <Icon name={rule.met ? 'check' : 'x'} size={16} />
          {rule.label}
          <span className="sr-only">{t(rule.met ? 'validation.met' : 'validation.notMet')}</span>
        </li>
      ))}
    </ul>
  )
}
