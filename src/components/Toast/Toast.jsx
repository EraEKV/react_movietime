import styles from './Toast.module.css'

export default function Toast({ children, action }) {
  return (
    <div className={styles.toast} role="status">
      <span>{children}</span>
      {action}
    </div>
  )
}
