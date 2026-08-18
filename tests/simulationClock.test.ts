import { describe, expect, it, vi } from 'vitest'
import { SimulationClock } from '../src/engine/clock/simulationClock'

describe('SimulationClock', () => {
  it('在暂停时保持目标时刻，并可按倍率推进', () => {
    vi.useFakeTimers()
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    const clock = new SimulationClock()
    clock.seek(1_700_000_000_000)
    expect(clock.now()).toBe(1_700_000_000_000)
    clock.play(60)
    vi.spyOn(performance, 'now').mockReturnValue(1100)
    expect(clock.now()).toBe(1_700_000_006_000)
    clock.pause()
    vi.spyOn(performance, 'now').mockReturnValue(1500)
    expect(clock.now()).toBe(1_700_000_006_000)
    vi.useRealTimers()
  })
})
