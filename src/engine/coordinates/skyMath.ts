import type { Observer } from '@/shared/types/observer'

const degToRad = (value: number) => (value * Math.PI) / 180
const radToDeg = (value: number) => (value * 180) / Math.PI

const utcMillisOf = (time: number | Date) => (typeof time === 'number' ? time : time.getTime())

const julianDate = (utcMillis: number) => utcMillis / 86400000 + 2440587.5

export function localSiderealHours(time: number | Date, longitude: number) {
  const jd = julianDate(utcMillisOf(time))
  const d = jd - 2451545.0
  return ((18.697374558 + 24.06570982441908 * d + longitude / 15) % 24 + 24) % 24
}

export function equatorialUnitInto(
  raHours: number,
  decDeg: number,
  out: { x: number; y: number; z: number },
) {
  const ra = degToRad(raHours * 15)
  const dec = degToRad(decDeg)
  const cosDec = Math.cos(dec)
  out.x = cosDec * Math.cos(ra)
  out.y = cosDec * Math.sin(ra)
  out.z = Math.sin(dec)
  return out
}

export function equatorialUnit(raHours: number, decDeg: number) {
  return equatorialUnitInto(raHours, decDeg, { x: 0, y: 0, z: 0 })
}

/** Equatorial (x=春分点, z=北天极) → 地平 (x=东, y=天顶, z=北) */
export function fillHorizonMatrix(
  time: number | Date,
  observer: Observer,
  out: number[] | Float32Array,
) {
  const lst = degToRad(localSiderealHours(time, observer.longitude) * 15)
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
