import { describe, expect, it } from 'vitest'
import { HOURS_PER_DAY, JULIAN_J2000, JULIAN_UNIX_EPOCH, MS_PER_DAY } from '../src/engine/coordinates/astroConstants'
import { localSiderealHours } from '../src/engine/coordinates/skyMath'
import { aimSkyView, locateSkyTarget } from '../src/engine/interaction/locateSkyTarget'
import { SKY_FOV_DEG } from '../src/engine/render/skyProjection'
import type { BodySnapshot } from '../src/engine/astronomy/bodyInterpolation'
import type { SkyView } from '../src/shared/types/sky'
import type { Star } from '../src/shared/types/star'

function utcMillisFromJd(jd: number) {
  return (jd - JULIAN_UNIX_EPOCH) * MS_PER_DAY
}

const utcMillis = utcMillisFromJd(JULIAN_J2000)
const observer = { latitude: 0, longitude: 0 }
const lst = localSiderealHours(utcMillis, observer.longitude)
const view: SkyView = { azimuth: 180, altitude: 0, fov: SKY_FOV_DEG }

function star(id: string, raHours: number, decDeg: number): Star {
  return {
    id,
    name: id,
    constellation: '测试',
    raHours,
    decDeg,
    magnitude: 0.1,
    color: '#fff',
  }
}

function body(id: string, name: string, raHours: number, decDeg: number): BodySnapshot {
  return {
    id,
    name,
    altitude: 0,
    azimuth: 0,
    raHours,
    decDeg,
    magnitude: 1,
    phaseAngle: 0,
    phaseFraction: 1,
  }
}

describe('aimSkyView', () => {
  it('keeps the current view when the target is below the horizon', () => {
    const next = aimSkyView(view, { azimuth: 90, altitude: -12 })
    expect(next.belowHorizon).toBe(true)
    expect(next.azimuth).toBe(view.azimuth)
    expect(next.altitude).toBe(view.altitude)
  })

  it('only turns azimuth when the target already sits in the current frame', () => {
    const next = aimSkyView(view, { azimuth: 40, altitude: 18 })
    expect(next.belowHorizon).toBe(false)
    expect(next.azimuth).toBe(40)
    expect(next.altitude).toBe(0)
  })

  it('nudges altitude only far enough to bring a high target into view', () => {
    const next = aimSkyView(view, { azimuth: 10, altitude: 88 })
    expect(next.azimuth).toBe(10)
    expect(next.altitude).toBeGreaterThan(0)
    expect(next.altitude).toBeLessThan(88)
  })
})

describe('locateSkyTarget', () => {
  it('looks toward a star above the horizon without slamming to zenith', () => {
    const zenith = star('zenith', lst, 0)
    const result = locateSkyTarget({
      id: 'zenith',
      type: 'star',
      bodies: [],
      starById: new Map([[zenith.id, zenith]]),
      utcMillis,
      observer,
      view,
    })
    expect(result?.belowHorizon).toBe(false)
    expect(result?.targetAltitude).toBeCloseTo(90, 4)
    expect(result?.altitude).toBeGreaterThan(0)
    expect(result?.altitude).toBeLessThan(80)
    expect(result?.selected.name).toBe('zenith')
  })

  it('does not rotate when a star is below the horizon', () => {
    const nadir = star('nadir', (lst + 12) % HOURS_PER_DAY, 0)
    const result = locateSkyTarget({
      id: 'nadir',
      type: 'star',
      bodies: [],
      starById: new Map([[nadir.id, nadir]]),
      utcMillis,
      observer,
      view,
    })
    expect(result?.belowHorizon).toBe(true)
    expect(result?.azimuth).toBe(view.azimuth)
    expect(result?.altitude).toBe(view.altitude)
    expect(result?.targetAltitude).toBeCloseTo(-90, 4)
    expect(result?.selected.id).toBe('nadir')
  })

  it('uses solar-system snapshots for body pose', () => {
    const mars = body('mars', '火星', lst, 0)
    const result = locateSkyTarget({
      id: 'mars',
      type: 'body',
      bodies: [mars],
      starById: new Map(),
      utcMillis,
      observer,
      view,
    })
    expect(result?.belowHorizon).toBe(false)
    expect(result?.targetAltitude).toBeCloseTo(90, 4)
    expect(result?.selected.name).toBe('火星')
  })

  it('returns null when the target is missing', () => {
    expect(locateSkyTarget({
      id: 'missing',
      type: 'star',
      bodies: [],
      starById: new Map(),
      utcMillis,
      observer,
      view,
    })).toBeNull()
  })
})
