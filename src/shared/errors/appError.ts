/** 应用错误：带 code / 是否可重试 / i18n 参数，给错误面板和日志用。 */

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

/** fetch / AbortController 取消。 */
export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/** 把未知异常收成 AppError；AbortError 单独标成可重试。 */
export function toAppError(error: unknown, fallback: AppErrorCode = 'unknown'): AppError {
  if (isAppError(error)) return error
  if (isAbortError(error)) return new AppError('unknown', 'error.aborted', { cause: error, retryable: true })
  return new AppError(fallback, 'error.unknown.message', {
    cause: error,
    retryable: fallback === 'catalog' || fallback === 'worker' || fallback === 'render',
  })
}

/** 开发环境把错误打到 console，生产面板另走 ErrorPanel。 */
export function logAppError(error: unknown, context?: string) {
  const appError = toAppError(error)
  console.warn(`[${appError.code}] ${context ?? appError.message}`, appError.cause ?? appError)
}
