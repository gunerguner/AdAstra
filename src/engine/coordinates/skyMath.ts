import type { Observer } from '@/shared/types/observer'
import type { SkyPoint } from '@/shared/types/skyPoint'

export type { Observer } from '@/shared/types/observer'
export type { SkyPoint } from '@/shared/types/skyPoint'

export const degToRad = (value: number) => (value * Math.PI) / 180
export const radToDeg = (value: number) => (value * 180) / Math.PI

const julianDate = (date: Date) => date.getTime() / 86400000 + 2440587.5

export function localSiderealHours(date: Date, longitude: number) {
  const jd = julianDate(date)
  const d = jd - 2451545.0
  return ((18.697374558 + 24.06570982441908 * d + longitude / 15) % 24 + 24) % 24
}

export function raDecToSkyPoint(raHours: number, decDeg: number, date: Date, observer: Observer): SkyPoint {
  const lat = degToRad(observer.latitude)
  const dec = degToRad(decDeg)
  const hourAngle = degToRad((localSiderealHours(date, observer.longitude) - raHours) * 15)
  const altitude = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle))
  const azimuth = Math.atan2(
    -Math.sin(hourAngle) * Math.cos(dec),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(hourAngle),
  )
  const az = (azimuth + Math.PI * 2) % (Math.PI * 2)

  return {
    x: Math.cos(altitude) * Math.sin(az),
    y: Math.sin(altitude),
    z: Math.cos(altitude) * Math.cos(az),
    altitude: radToDeg(altitude),
    azimuth: radToDeg(az),
  }
}

export function equatorialUnit(raHours: number, decDeg: number) {
  const ra = degToRad(raHours * 15)
  const dec = degToRad(decDeg)
  const cosDec = Math.cos(dec)
  return {
    x: cosDec * Math.cos(ra),
    y: cosDec * Math.sin(ra),
    z: Math.sin(dec),
  }
}

/** Equatorial (x=春分点, z=北天极) → 地平 (x=东, y=天顶, z=北) */
export function fillHorizonMatrix(
  date: Date,
  observer: Observer,
  out: number[] | Float32Array,
) {
  const lst = degToRad(localSiderealHours(date, observer.longitude) * 15)
  const lat = degToRad(observer.latitude)
  const sinLst = Math.sin(lst)
  const cosLst = Math.cos(lst)
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  out[0] = -sinLst
  out[1] = cosLst
  out[2] = 0
  out[3] = cosLat * cosLst
  out[4] = cosLat * sinLst
  out[5] = sinLat
  out[6] = -sinLat * cosLst
  out[7] = -sinLat * sinLst
  out[8] = cosLat
  return out
}

export function horizonMatrix(date: Date, observer: Observer) {
  return fillHorizonMatrix(date, observer, new Array<number>(9))
}

export function applyHorizonMatrixInto(
  vector: { x: number; y: number; z: number },
  matrix: ArrayLike<number>,
  out: { x: number; y: number; z: number },
) {
  out.x = matrix[0] * vector.x + matrix[1] * vector.y + matrix[2] * vector.z
  out.y = matrix[3] * vector.x + matrix[4] * vector.y + matrix[5] * vector.z
  out.z = matrix[6] * vector.x + matrix[7] * vector.y + matrix[8] * vector.z
  return out
}

export function applyHorizonMatrix(
  vector: { x: number; y: number; z: number },
  matrix: ArrayLike<number>,
) {
  return applyHorizonMatrixInto(vector, matrix, { x: 0, y: 0, z: 0 })
}

export function eclipticEquatorialUnit(longitudeDeg: number) {
  const obliquity = degToRad(23.439)
  const lon = degToRad(longitudeDeg)
  const ra = Math.atan2(Math.sin(lon) * Math.cos(obliquity), Math.cos(lon))
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(lon))
  return equatorialUnit(((ra < 0 ? ra + Math.PI * 2 : ra) / (Math.PI * 2)) * 24, radToDeg(dec))
}

export function horizonAnglesFromVector(vector: { x: number; y: number; z: number }) {
  return {
    altitude: Math.asin(Math.max(-1, Math.min(1, vector.y))) * 180 / Math.PI,
    azimuth: (Math.atan2(vector.x, vector.z) * 180 / Math.PI + 360) % 360,
  }
}
