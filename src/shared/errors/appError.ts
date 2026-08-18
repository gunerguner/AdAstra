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
  override readonly cause?: unknown

  constructor(code: AppErrorCode, message: string, options: { cause?: unknown; retryable?: boolean } = {}) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.retryable = options.retryable ?? false
    this.cause = options.cause
  }
}

const titles: Record<AppErrorCode, string> = {
  catalog: '星表无法加载',
  webgl: '无法绘制星空',
  worker: '天体计算中断',
  'service-worker': '离线缓存不可用',
  render: '界面渲染失败',
  unknown: '出现未知错误',
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function toAppError(error: unknown, fallback: AppErrorCode = 'unknown'): AppError {
  if (isAppError(error)) return error
  if (isAbortError(error)) return new AppError('unknown', '请求已取消', { cause: error, retryable: true })
  const message = error instanceof Error && error.message.trim() ? error.message : '出现未知错误'
  return new AppError(fallback, message, {
    cause: error,
    retryable: fallback === 'catalog' || fallback === 'worker' || fallback === 'render',
  })
}

export function errorTitle(error: AppError) {
  return titles[error.code]
}

export function logAppError(error: unknown, context?: string) {
  const appError = toAppError(error)
  console.warn(`[${appError.code}] ${context ?? appError.message}`, appError.cause ?? appError)
}
