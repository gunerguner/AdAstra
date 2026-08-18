import { describe, expect, it, vi } from 'vitest'
import { SimulationClock, getTimeQuality } from '../src/engine/clock/simulationClock'

describe('SimulationClock', () => {
  it('在暂停时保持目标时刻，并可按倍率推进', () => {
    vi.useFakeTimers()
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    const clock = new SimulationClock()
    clock.seek(1_700_000_000_000)
    expect(clock.now().utcMillis).toBe(1_700_000_000_000)
    clock.play(60)
    vi.spyOn(performance, 'now').mockReturnValue(1100)
    expect(clock.now().utcMillis).toBe(1_700_000_006_000)
    clock.pause()
    vi.spyOn(performance, 'now').mockReturnValue(1500)
    expect(clock.now().utcMillis).toBe(1_700_000_006_000)
    vi.useRealTimers()
  })

  it('为历史与远期时间标记可解释的质量等级', () => {
    expect(getTimeQuality(Date.UTC(1900, 0, 1))).toBe('utc-like-historical')
    expect(getTimeQuality(Date.UTC(2025, 0, 1))).toBe('modern-utc')
    expect(getTimeQuality(Date.UTC(2100, 0, 1))).toBe('utc-like-future')
  })
})
