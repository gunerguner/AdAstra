import { describe, expect, it } from 'vitest'
import { MoonPhase } from 'astronomy-engine'
import { astronomyService } from '@/engine/astronomy/astronomyService'
import { interpolateBodySnapshots, type BodySnapshot, type BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { lerpDegrees } from '@/shared/math'
import { moonPhaseName } from '@/engine/astronomy/moonPhaseName'

function sample(overrides: Partial<BodySnapshot> = {}): BodySnapshot {
  return {
    id: 'moon',
    altitude: 10,
    azimuth: 350,
    raHours: 23.8,
    decDeg: 4,
    magnitude: -12,
    phaseAngle: 10,
    phaseFraction: 0.9,
    synodicDeg: 170,
    ...overrides,
  }
}

const window: BodySnapshotWindow = {
  fromUtcMillis: 1_000,
  toUtcMillis: 2_000,
  from: [sample()],
  to: [sample({
    altitude: 14,
    azimuth: 10,
    raHours: 0.2,
    decDeg: 6,
    magnitude: -12.2,
    phaseAngle: 20,
    phaseFraction: 0.8,
    synodicDeg: 190,
  })],
}

describe('天体快照插值', () => {
  it('在同一模拟时间内连续插值赤道和地平坐标', () => {
    const [body] = interpolateBodySnapshots(window, 1_500)
    expect(Math.min(body.raHours, 24 - body.raHours)).toBeLessThan(0.01)
    expect(body.decDeg).toBeCloseTo(5, 1)
    expect(body.altitude).toBeCloseTo(12, 2)
    expect(Math.min(body.azimuth, 360 - body.azimuth)).toBeCloseTo(0, 2)
  })

  it('窗口覆盖不了当前时刻时不外推，交给低精度太阳估计兜底', () => {
    expect(interpolateBodySnapshots(window, 500)).toHaveLength(0)
    expect(interpolateBodySnapshots(window, 2_500)).toHaveLength(0)
    expect(interpolateBodySnapshots(window, 1_000)[0].altitude).toBe(10)
    expect(interpolateBodySnapshots(window, 2_000)[0].altitude).toBe(14)
  })

  it('窗口时间范围改掉后，不再复用范围外的上一次插值', () => {
    const live: BodySnapshotWindow = {
      fromUtcMillis: 1_000,
      toUtcMillis: 2_000,
      from: [sample({ id: 'sun', altitude: 20 })],
      to: [sample({ id: 'sun', altitude: -30, raHours: 0.2, azimuth: 10 })],
    }
    expect(interpolateBodySnapshots(live, 1_000)[0].altitude).toBe(20)
    live.fromUtcMillis = 5_000
    live.toUtcMillis = 6_000
    expect(interpolateBodySnapshots(live, 1_000)).toHaveLength(0)
    expect(interpolateBodySnapshots(live, 5_000)[0].altitude).toBe(20)
  })

  it('在同一窗口与时间上复用插值结果', () => {
    const first = interpolateBodySnapshots(window, 1_500)
    const second = interpolateBodySnapshots(window, 1_500)
    expect(second).toBe(first)
  })

  it('按最短弧插值朔望角', () => {
    const wrap: BodySnapshotWindow = {
      fromUtcMillis: 0,
      toUtcMillis: 1000,
      from: [sample({ synodicDeg: 350 })],
      to: [sample({ synodicDeg: 10, raHours: 0.2, azimuth: 10 })],
    }
    expect(lerpDegrees(350, 10, 0.5)).toBeCloseTo(0, 5)
    expect(interpolateBodySnapshots(wrap, 500)[0].synodicDeg).toBeCloseTo(0, 5)
  })
})

describe('月亮朔望月', () => {
  it('把朔望经度映射成月相名称', () => {
    expect(moonPhaseName(0)).toBe('new')
    expect(moonPhaseName(90)).toBe('firstQuarter')
    expect(moonPhaseName(180)).toBe('full')
    expect(moonPhaseName(270)).toBe('lastQuarter')
  })

  it('在已知新月日期给出接近 0 的朔望角', () => {
    const date = new Date('2024-04-08T18:21:00Z')
    const synodic = MoonPhase(date)
    expect(Math.min(synodic, 360 - synodic)).toBeLessThan(8)
    const moon = astronomyService.getBodies(date, { latitude: 31.23, longitude: 121.47 }).find((body) => body.id === 'moon')
    expect(moonPhaseName(moon?.synodicDeg ?? 0)).toBe('new')
    expect(astronomyService.getBodies(date, { latitude: 0, longitude: 0 }).map((body) => body.id)).toContain('uranus')
  })
})
