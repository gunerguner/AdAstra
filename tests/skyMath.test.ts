import { describe, expect, it } from 'vitest'
import { applyHorizonMatrix, equatorialUnit, horizonMatrix, localSiderealHours, raDecToSkyPoint } from '../src/engine/coordinates/skyMath'

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
