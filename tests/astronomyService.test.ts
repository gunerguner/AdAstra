import { describe, expect, it } from 'vitest'
import { MoonPhase } from 'astronomy-engine'
import { astronomyService } from '../src/engine/astronomy/astronomyService'
import { interpolateBodySnapshots, type BodySnapshot, type BodySnapshotWindow } from '../src/engine/astronomy/bodyInterpolation'
import { lerpDegrees, moonPhaseName } from '../src/engine/astronomy/moonPhaseName'

function sample(overrides: Partial<BodySnapshot> = {}): BodySnapshot {
  return {
    id: 'moon',
    name: '月亮',
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

  it('把窗口外时间夹到首尾样本，避免过冲', () => {
    expect(interpolateBodySnapshots(window, 500)[0].altitude).toBe(10)
    expect(interpolateBodySnapshots(window, 2_500)[0].altitude).toBe(14)
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
    expect(moonPhaseName(0)).toBe('新月')
    expect(moonPhaseName(90)).toBe('上弦月')
    expect(moonPhaseName(180)).toBe('满月')
    expect(moonPhaseName(270)).toBe('下弦月')
  })

  it('在已知新月日期给出接近 0 的朔望角', () => {
    const date = new Date('2024-04-08T18:21:00Z')
    const synodic = MoonPhase(date)
    expect(Math.min(synodic, 360 - synodic)).toBeLessThan(8)
    const moon = astronomyService.getBodies(date, { latitude: 31.23, longitude: 121.47 }).find((body) => body.id === 'moon')
    expect(moonPhaseName(moon?.synodicDeg ?? 0)).toBe('新月')
    expect(astronomyService.getBodies(date, { latitude: 0, longitude: 0 }).map((body) => body.id)).toContain('uranus')
  })
})
