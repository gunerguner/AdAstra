/** 唯一允许 import astronomy-engine 的模块。输入时刻与地点，输出太阳/月亮/行星快照。 */
import { Body, Equator, Horizon, Illumination, MoonPhase, Observer as AstronomyObserver } from 'astronomy-engine'
import type { Observer } from '@/shared/types/observer'
import type { BodySnapshot } from './bodyInterpolation'

export type { BodySnapshot, BodySnapshotWindow } from './bodyInterpolation'

const bodyDefinitions = [
  [Body.Sun, 'sun', '太阳'],
  [Body.Moon, 'moon', '月亮'],
  [Body.Mercury, 'mercury', '水星'],
  [Body.Venus, 'venus', '金星'],
  [Body.Mars, 'mars', '火星'],
  [Body.Jupiter, 'jupiter', '木星'],
  [Body.Saturn, 'saturn', '土星'],
  [Body.Uranus, 'uranus', '天王星'],
  [Body.Neptune, 'neptune', '海王星'],
] as const

export class AstronomyService {
  getBodies(date: Date, observer: Observer): BodySnapshot[] {
    const site = new AstronomyObserver(observer.latitude, observer.longitude, 0)
    return bodyDefinitions.map(([body, id, name]) => {
      const equatorial = Equator(body, date, site, true, true)
      const horizontal = Horizon(date, site, equatorial.ra, equatorial.dec, 'normal')
      const light = Illumination(body, date)
      return {
        id,
        name,
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
