import { errorTitle, type AppError } from '@/shared/errors/appError'
import panelStyles from './StatusPanel.module.css'
import styles from './ErrorPanel.module.css'

type Props = {
  error: AppError
  onRetry?: () => void
}

export function ErrorPanel({ error, onRetry }: Props) {
  return (
    <div className={`${panelStyles.panel} ${styles.content}`} role="alert">
      <span className={styles.eyebrow}>{error.code}</span>
      <h2>{errorTitle(error)}</h2>
      <p>{error.message}</p>
      {onRetry && error.retryable && (
        <button type="button" onClick={onRetry}>重试</button>
      )}
    </div>
  )
}
