import { errorTitle, type AppError } from '../engine/appError'

type Props = {
  error: AppError
  onRetry?: () => void
}

export default function ErrorPanel({ error, onRetry }: Props) {
  return (
    <div className="error-panel" role="alert">
      <span className="eyebrow">{error.code}</span>
      <h2>{errorTitle(error)}</h2>
      <p>{error.message}</p>
      {onRetry && error.retryable && (
        <button type="button" onClick={onRetry}>重试</button>
      )}
    </div>
  )
}
