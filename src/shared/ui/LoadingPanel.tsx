import styles from './ErrorPanel.module.css'

export function LoadingPanel({ message }: { message: string }) {
  return (
    <div className={`${styles.panel} ${styles.loading}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
