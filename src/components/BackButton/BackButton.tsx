import { useLocation, useNavigate } from 'react-router'
import styles from './BackButton.module.css'

/**
 * Goes back in history when the user came from inside the app (keeps their filters),
 * or to the home page when the detail page was opened directly from a link.
 */
export default function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const hasHistory = location.key !== 'default'

  return (
    <button
      type="button"
      className={styles.back}
      onClick={() => (hasHistory ? navigate(-1) : navigate('/'))}
    >
      ← Back
    </button>
  )
}
