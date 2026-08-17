import { Body, Equator, Horizon, Illumination, MoonPhase, Observer as AstronomyObserver } from 'astronomy-engine'
import type { Observer } from './skyMath'

export type BodySnapshot = {
  id: string
  name: string
  altitude: number
  azimuth: number
  raHours: number
  decDeg: number
  magnitude: number
}

const bodyDefinitions = [
  [Body.Sun, 'sun', '太阳'],
  [Body.Moon, 'moon', '月亮'],
  [Body.Mercury, 'mercury', '水星'],
  [Body.Venus, 'venus', '金星'],
  [Body.Mars, 'mars', '火星'],
  [Body.Jupiter, 'jupiter', '木星'],
  [Body.Saturn, 'saturn', '土星'],
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
      }
    })
  }

  getMoonPhase(date: Date) {
    return MoonPhase(date)
  }
}

export const astronomyService = new AstronomyService()
