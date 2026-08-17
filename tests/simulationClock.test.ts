import { describe, expect, it, vi } from 'vitest'
import { SimulationClock, getTimeQuality } from '../src/engine/simulationClock'
import { applyHorizonMatrix, equatorialUnit, horizonMatrix, localSiderealHours, raDecToSkyPoint } from '../src/engine/skyMath'

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

describe('地平坐标变换', () => {
  it('恒星在天顶附近应具有高高度角', () => {
    const date = new Date('2024-01-01T00:00:00Z')
    const longitude = 116.4074
    const ra = localSiderealHours(date, longitude)
    const point = raDecToSkyPoint(ra, 39.9042, date, { latitude: 39.9042, longitude })
    expect(point.altitude).toBeGreaterThan(89)
  })

  it('地平旋转矩阵与球面公式一致', () => {
    const date = new Date('2024-01-01T00:00:00Z')
    const observer = { latitude: 39.9042, longitude: 116.4074 }
    const spherical = raDecToSkyPoint(6.75, -16.72, date, observer)
    const cartesian = applyHorizonMatrix(equatorialUnit(6.75, -16.72), horizonMatrix(date, observer))
    expect(cartesian.x).toBeCloseTo(spherical.x, 6)
    expect(cartesian.y).toBeCloseTo(spherical.y, 6)
    expect(cartesian.z).toBeCloseTo(spherical.z, 6)
  })
})
