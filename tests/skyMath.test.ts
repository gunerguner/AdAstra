import { describe, expect, it } from 'vitest'
import { applyHorizonMatrixInto, equatorialUnit, fillHorizonMatrix, localSiderealHours } from '../src/engine/coordinates/skyMath'
import { HOURS_PER_DAY, OBLIQUITY_DEG } from '../src/engine/coordinates/astroConstants'

describe('skyMath', () => {
  it('keeps sidereal hours within one day', () => {
    const hours = localSiderealHours(new Date('2024-01-01T00:00:00Z'), 116.4074)
    expect(hours).toBeGreaterThanOrEqual(0)
    expect(hours).toBeLessThan(HOURS_PER_DAY)
  })

  it('maps a meridian equatorial point to the zenith at the equator', () => {
    const date = new Date('2024-01-01T00:00:00Z')
    const observer = { latitude: 0, longitude: 0 }
    const matrix = fillHorizonMatrix(date.getTime(), observer, new Float32Array(9))
    const point = applyHorizonMatrixInto(
      equatorialUnit(localSiderealHours(date, observer.longitude), 0),
      matrix,
      { x: 0, y: 0, z: 0 },
    )
    expect(point.y).toBeCloseTo(1, 6)
  })

  it('uses the J2000 mean obliquity for the ecliptic', () => {
    expect(OBLIQUITY_DEG).toBe(23.439)
  })
})
