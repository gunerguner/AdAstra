export type AppErrorCode =
  | 'catalog'
  | 'webgl'
  | 'worker'
  | 'service-worker'
  | 'render'
  | 'unknown'

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly retryable: boolean
  readonly params?: Record<string, string | number>
  override readonly cause?: unknown

  constructor(
    code: AppErrorCode,
    message: string,
    options: { cause?: unknown; retryable?: boolean; params?: Record<string, string | number> } = {},
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.retryable = options.retryable ?? false
    this.params = options.params
    this.cause = options.cause
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function toAppError(error: unknown, fallback: AppErrorCode = 'unknown'): AppError {
  if (isAppError(error)) return error
  if (isAbortError(error)) return new AppError('unknown', 'error.aborted', { cause: error, retryable: true })
  return new AppError(fallback, 'error.unknown.message', {
    cause: error,
    retryable: fallback === 'catalog' || fallback === 'worker' || fallback === 'render',
  })
}

export function logAppError(error: unknown, context?: string) {
  const appError = toAppError(error)
  console.warn(`[${appError.code}] ${context ?? appError.message}`, appError.cause ?? appError)
}
