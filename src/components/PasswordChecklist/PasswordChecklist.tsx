import { passwordRules } from '../../utils/validation'
import Icon from '../Icon/Icon'
import styles from './PasswordChecklist.module.css'

/** Live rules under the signup password. A met rule changes icon and colour, and says so. */
export default function PasswordChecklist({ value, id }: { value: string; id?: string }) {
  return (
    <ul className={styles.list} id={id} aria-label="Password requirements">
      {passwordRules(value).map((rule) => (
        <li key={rule.id} className={rule.met ? styles.met : undefined}>
          <Icon name={rule.met ? 'check' : 'x'} size={16} />
          {rule.label}
          <span className="sr-only">{rule.met ? ' — met' : ' — not met'}</span>
        </li>
      ))}
    </ul>
  )
}
