import { describe, expect, it } from 'vitest'
import {
  applyHorizonMatrixInto,
  eclipticEquatorialUnit,
  equatorialUnit,
  fillEqjHorizonMatrices,
  fillHorizonMatrix,
  fillPrecessionMatrix,
  localSiderealHours,
} from '../src/engine/coordinates/skyMath'
import { HOURS_PER_DAY, JULIAN_J2000, JULIAN_UNIX_EPOCH, MS_PER_DAY, NORTH_ECLIPTIC_POLE, OBLIQUITY_DEG, SOUTH_ECLIPTIC_POLE } from '../src/engine/coordinates/astroConstants'

function utcMillisFromJd(jd: number) {
  return (jd - JULIAN_UNIX_EPOCH) * MS_PER_DAY
}

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

  it('places J2000 ecliptic poles opposite each other and orthogonal to the ecliptic', () => {
    expect(NORTH_ECLIPTIC_POLE).toEqual({ raHours: 18, decDeg: 90 - OBLIQUITY_DEG })
    expect(SOUTH_ECLIPTIC_POLE).toEqual({ raHours: 6, decDeg: OBLIQUITY_DEG - 90 })
    const north = equatorialUnit(NORTH_ECLIPTIC_POLE.raHours, NORTH_ECLIPTIC_POLE.decDeg)
    const south = equatorialUnit(SOUTH_ECLIPTIC_POLE.raHours, SOUTH_ECLIPTIC_POLE.decDeg)
    expect(north.x + south.x).toBeCloseTo(0, 6)
    expect(north.y + south.y).toBeCloseTo(0, 6)
    expect(north.z + south.z).toBeCloseTo(0, 6)
    for (const longitude of [0, 90, 180, 270]) {
      const onEcliptic = eclipticEquatorialUnit(longitude)
      expect(north.x * onEcliptic.x + north.y * onEcliptic.y + north.z * onEcliptic.z).toBeCloseTo(0, 5)
    }
  })

  it('is the identity precession matrix at J2000', () => {
    const matrix = fillPrecessionMatrix(utcMillisFromJd(JULIAN_J2000), new Float32Array(9))
    expect([...matrix]).toEqual([
      expect.closeTo(1, 6), expect.closeTo(0, 6), expect.closeTo(0, 6),
      expect.closeTo(0, 6), expect.closeTo(1, 6), expect.closeTo(0, 6),
      expect.closeTo(0, 6), expect.closeTo(0, 6), expect.closeTo(1, 6),
    ])
  })

  it('tilts the J2000 north pole by Meeus theta at J2100', () => {
    const matrix = fillPrecessionMatrix(utcMillisFromJd(JULIAN_J2000 + 36525), new Float32Array(9))
    const poleAngleDeg = Math.acos(Math.min(1, Math.max(-1, matrix[8]))) * (180 / Math.PI)
    expect(poleAngleDeg * 3600).toBeCloseTo(2004, 0)
  })

  it('keeps the meridian zenith test after composing precession at J2000', () => {
    const date = new Date('2000-01-01T12:00:00Z')
    const observer = { latitude: 0, longitude: 0 }
    const horizon = new Float32Array(9)
    const eqj = new Float32Array(9)
    fillEqjHorizonMatrices(date.getTime(), observer, horizon, eqj)
    const point = applyHorizonMatrixInto(
      equatorialUnit(localSiderealHours(date, observer.longitude), 0),
      eqj,
      { x: 0, y: 0, z: 0 },
    )
    expect(point.y).toBeCloseTo(1, 5)
  })
})
