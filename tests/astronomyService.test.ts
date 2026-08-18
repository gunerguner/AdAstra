import { describe, expect, it } from 'vitest'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '../src/engine/astronomy/astronomyService'

const window: BodySnapshotWindow = {
  fromUtcMillis: 1_000,
  toUtcMillis: 2_000,
  from: [{
    id: 'moon',
    name: '月亮',
    altitude: 10,
    azimuth: 350,
    raHours: 23.8,
    decDeg: 4,
    magnitude: -12,
  }],
  to: [{
    id: 'moon',
    name: '月亮',
    altitude: 14,
    azimuth: 10,
    raHours: 0.2,
    decDeg: 6,
    magnitude: -12.2,
  }],
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
})
