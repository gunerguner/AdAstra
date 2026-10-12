import { describe, expect, it } from 'vitest'
import { timeSteps } from '@/config'
import { shiftLocalUtc } from '@/engine/coordinates/dateTimeLocal'

describe('时间步长', () => {
  it('covers minute, hour, day, year, decade and century', () => {
    expect(timeSteps.map((step) => step.id)).toEqual(['hour', 'day', 'year', 'decade', 'century'])
  })

  it('keeps the seconds when stepping one hour', () => {
    const utcMillis = Date.UTC(2024, 0, 15, 4, 30, 45, 123)
    expect(shiftLocalUtc(utcMillis, 'Asia/Shanghai', { minutes: 60 })).toBe(utcMillis + 3_600_000)
  })

  it('steps one calendar day across a daylight-saving change', () => {
    const before = Date.UTC(2024, 2, 9, 17, 0)
    const after = shiftLocalUtc(before, 'America/New_York', { days: 1 })
    expect(after).toBe(Date.UTC(2024, 2, 10, 16, 0))
  })

  it('moves Feb 29 to Feb 28 in a non-leap year', () => {
    const leap = Date.UTC(2024, 1, 28, 16, 0)
    expect(shiftLocalUtc(leap, 'Asia/Shanghai', { years: 1 })).toBe(Date.UTC(2025, 1, 27, 16, 0))
  })

  it('steps a century on the civil calendar', () => {
    const utcMillis = Date.UTC(2026, 0, 1, 0, 0) - 8 * 3_600_000
    expect(shiftLocalUtc(utcMillis, 'Asia/Shanghai', { years: 100 })).toBe(Date.UTC(2126, 0, 1, 0, 0) - 8 * 3_600_000)
  })
})
