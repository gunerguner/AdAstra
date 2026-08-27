import { useT } from '@/i18n'
import type { AppError } from '@/shared/errors/appError'
import panelStyles from './StatusPanel.module.css'
import styles from './ErrorPanel.module.css'

type Props = {
  error: AppError
  onRetry?: () => void
}

export function ErrorPanel({ error, onRetry }: Props) {
  const t = useT()
  const titleKey = `error.${error.code}.title`
  return (
    <div className={`${panelStyles.panel} ${styles.content}`} role="alert">
      <span className={styles.eyebrow}>{error.code}</span>
      <h2>{t(titleKey)}</h2>
      <p>{t(error.message, error.params)}</p>
      {onRetry && error.retryable && (
        <button type="button" onClick={onRetry}>{t('retry')}</button>
      )}
    </div>
  )
}
