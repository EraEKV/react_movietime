import styles from './DetailsSkeleton.module.css'

export default function DetailsSkeleton() {
  return (
    <div className={styles.hero} aria-busy="true" aria-label="Loading series">
      <div className={styles.poster} />
      <div className={styles.lines}>
        <div className={`${styles.line} ${styles.title}`} />
        <div className={`${styles.line} ${styles.short}`} />
        <div className={styles.line} />
        <div className={styles.line} />
        <div className={`${styles.line} ${styles.short}`} />
      </div>
    </div>
  )
}
