import { Body, Equator, Horizon, Illumination, MoonPhase, Observer as AstronomyObserver } from 'astronomy-engine'
import type { Observer } from '@/shared/types/observer'
import { lerpDegrees } from './moonPhaseName'

export type BodySnapshot = {
  id: string
  name: string
  altitude: number
  azimuth: number
  raHours: number
  decDeg: number
  magnitude: number
  phaseAngle: number
  phaseFraction: number
  synodicDeg?: number
  ringTilt?: number
}

export type BodySnapshotWindow = {
  fromUtcMillis: number
  toUtcMillis: number
  from: BodySnapshot[]
  to: BodySnapshot[]
}

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

export function interpolateBodySnapshots(window: BodySnapshotWindow | null, utcMillis: number): BodySnapshot[] {
  if (!window) return []
  const span = Math.max(window.toUtcMillis - window.fromUtcMillis, 1)
  const t = Math.min(1, Math.max(0, (utcMillis - window.fromUtcMillis) / span))
  const nextById = new Map(window.to.map((body) => [body.id, body]))

  return window.from.map((from) => {
    const to = nextById.get(from.id)
    if (!to) return from
    const fromRa = from.raHours * Math.PI / 12
    const toRa = to.raHours * Math.PI / 12
    const fromDec = from.decDeg * Math.PI / 180
    const toDec = to.decDeg * Math.PI / 180
    const ax = Math.cos(fromDec) * Math.cos(fromRa)
    const ay = Math.cos(fromDec) * Math.sin(fromRa)
    const az = Math.sin(fromDec)
    const bx = Math.cos(toDec) * Math.cos(toRa)
    const by = Math.cos(toDec) * Math.sin(toRa)
    const bz = Math.sin(toDec)
    const dot = Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz))
    const omega = Math.acos(dot)
    const sinOmega = Math.sin(omega)
    const left = sinOmega < 1e-6 ? 1 - t : Math.sin((1 - t) * omega) / sinOmega
    const right = sinOmega < 1e-6 ? t : Math.sin(t * omega) / sinOmega
    const x = ax * left + bx * right
    const y = ay * left + by * right
    const z = az * left + bz * right
    const raHours = ((Math.atan2(y, x) * 12 / Math.PI) + 24) % 24
    const decDeg = Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI
    return {
      ...from,
      raHours,
      decDeg,
      altitude: from.altitude + (to.altitude - from.altitude) * t,
      azimuth: from.azimuth + ((((to.azimuth - from.azimuth + 540) % 360) - 180) * t),
      magnitude: from.magnitude + (to.magnitude - from.magnitude) * t,
      phaseAngle: from.phaseAngle + (to.phaseAngle - from.phaseAngle) * t,
      phaseFraction: from.phaseFraction + (to.phaseFraction - from.phaseFraction) * t,
      synodicDeg: from.synodicDeg != null && to.synodicDeg != null
        ? lerpDegrees(from.synodicDeg, to.synodicDeg, t)
        : from.synodicDeg,
      ringTilt: from.ringTilt != null && to.ringTilt != null
        ? from.ringTilt + (to.ringTilt - from.ringTilt) * t
        : from.ringTilt,
    }
  })
}

export const astronomyService = new AstronomyService()
