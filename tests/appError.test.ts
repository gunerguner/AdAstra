import { describe, expect, it } from 'vitest'
import { AppError, isAbortError, toAppError } from '../src/shared/errors/appError'

describe('统一错误处理', () => {
  it('保留已有 AppError 的编码与可重试标记', () => {
    const error = new AppError('catalog', '星表 SHA-256 校验失败', { retryable: true })
    expect(toAppError(error)).toBe(error)
    expect(error.retryable).toBe(true)
  })

  it('把未知异常规范成带编码的 AppError', () => {
    const error = toAppError(new Error('worker exploded'), 'worker')
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('worker')
    expect(error.message).toBe('worker exploded')
  })

  it('识别取消请求，避免当成界面故障', () => {
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true)
    expect(isAbortError(new Error('fail'))).toBe(false)
  })
})
