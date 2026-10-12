/** 唯一允许 import astronomy-engine 的模块。输入时刻与地点，输出太阳/月亮/行星快照。 */
import { Body, Equator, Horizon, Illumination, MoonPhase, Observer as AstronomyObserver } from 'astronomy-engine'
import type { Observer } from '@/shared/types/observer'
import type { BodySnapshot } from './bodyInterpolation'

const bodyDefinitions = [
  [Body.Sun, 'sun'],
  [Body.Moon, 'moon'],
  [Body.Mercury, 'mercury'],
  [Body.Venus, 'venus'],
  [Body.Mars, 'mars'],
  [Body.Jupiter, 'jupiter'],
  [Body.Saturn, 'saturn'],
  [Body.Uranus, 'uranus'],
  [Body.Neptune, 'neptune'],
] as const

export class AstronomyService {
  /** 指定时刻、地点的太阳系天体快照（含月相角、土星环倾角）。 */
  getBodies(date: Date, observer: Observer): BodySnapshot[] {
    const site = new AstronomyObserver(observer.latitude, observer.longitude, 0)
    return bodyDefinitions.map(([body, id]) => {
      const equatorial = Equator(body, date, site, true, true)
      const horizontal = Horizon(date, site, equatorial.ra, equatorial.dec, 'normal')
      const light = Illumination(body, date)
      return {
        id,
        altitude: horizontal.altitude,
        azimuth: horizontal.azimuth,
        raHours: equatorial.ra,
        decDeg: equatorial.dec,
        magnitude: light.mag,
        phaseAngle: light.phase_angle,
        phaseFraction: light.phase_fraction,
        synodicDeg: id === 'moon' ? MoonPhase(date) : undefined,
        ringTilt: light.ring_tilt,
      }
    })
  }
}

export const astronomyService = new AstronomyService()
