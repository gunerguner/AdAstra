import { describe, expect, it } from 'vitest'
import { formatDateTimeLocal, parseDateTimeLocal } from '../src/engine/timeZone'

describe('观测地时区转换', () => {
  it('按 IANA 时区往返 datetime-local', () => {
    const utcMillis = Date.UTC(2024, 0, 15, 4, 30)
    const value = formatDateTimeLocal(utcMillis, 'Asia/Shanghai')
    expect(value).toBe('2024-01-15T12:30')
    expect(parseDateTimeLocal(value, 'Asia/Shanghai')).toBe(utcMillis)
  })

  it('拒绝 DST 跳过的本地时间', () => {
    expect(parseDateTimeLocal('2024-03-10T02:30', 'America/New_York')).toBeNull()
  })
})
