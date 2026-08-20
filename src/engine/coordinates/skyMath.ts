/**
 * 赤道 ↔ 地平：星表给赤经/赤纬，画面要方位/高度。
 * 向量约定：赤道 x=春分点、z=北天极；地平 x=西、y=天顶、z=北。
 * +X 取西，是为了面朝南时左东右西，与肉眼一致（Three 相机朝向 -Z 时右侧为 +X）。
 */
import { clamp, degToRad, radToDeg, wrapDegrees } from '@/shared/math'
import type { Observer } from '@/shared/types/observer'
import {
  DEG_PER_HOUR,
  GMST_HOURS_AT_J2000,
  HOURS_PER_DAY,
  JULIAN_J2000,
  JULIAN_UNIX_EPOCH,
  MS_PER_DAY,
  OBLIQUITY_DEG,
  SIDEREAL_HOURS_PER_SOLAR_DAY,
} from './astroConstants'

const JULIAN_DAYS_PER_CENTURY = 36525
const ARCSEC_TO_RAD = Math.PI / (180 * 3600)
const precessionScratch = new Float32Array(9)

function julianDay(time: number | Date) {
  return (typeof time === 'number' ? time : time.getTime()) / MS_PER_DAY + JULIAN_UNIX_EPOCH
}

/** 当地恒星时（小时）：春分点相对观测者子午圈转了多少。 */
export function localSiderealHours(time: number | Date, longitude: number) {
  const d = julianDay(time) - JULIAN_J2000
  return ((GMST_HOURS_AT_J2000 + SIDEREAL_HOURS_PER_SOLAR_DAY * d + longitude / DEG_PER_HOUR) % HOURS_PER_DAY + HOURS_PER_DAY) % HOURS_PER_DAY
}

/** 赤经（时）赤纬（度）→ 天球单位向量。 */
export function equatorialUnitInto(
  raHours: number,
  decDeg: number,
  out: { x: number; y: number; z: number },
) {
  const ra = degToRad(raHours * DEG_PER_HOUR)
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

/** 写出 3×3 行主序矩阵：赤道向量 × 此阵 = 地平向量。由地方恒星时和纬度决定。 */
export function fillHorizonMatrix(
  time: number | Date,
  observer: Observer,
  out: number[] | Float32Array,
) {
  const lst = degToRad(localSiderealHours(time, observer.longitude) * DEG_PER_HOUR)
  const lat = degToRad(observer.latitude)
  const sinLst = Math.sin(lst)
  const cosLst = Math.cos(lst)
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  out[0] = sinLst
  out[1] = -cosLst
  out[2] = 0
  out[3] = cosLat * cosLst
  out[4] = cosLat * sinLst
  out[5] = sinLat
  out[6] = -sinLat * cosLst
  out[7] = -sinLat * sinLst
  out[8] = cosLat
  return out
}

/**
 * IAU 1976 / Meeus：J2000 赤道 → 日期平赤道。行主序。
 * T=0 时为单位阵。不含章动。
 */
export function fillPrecessionMatrix(time: number | Date, out: number[] | Float32Array) {
  const t = (julianDay(time) - JULIAN_J2000) / JULIAN_DAYS_PER_CENTURY
  const t2 = t * t
  const t3 = t2 * t
  const zeta = (2306.2181 * t + 0.30188 * t2 + 0.017998 * t3) * ARCSEC_TO_RAD
  const z = (2306.2181 * t + 1.09468 * t2 + 0.018203 * t3) * ARCSEC_TO_RAD
  const theta = (2004.3109 * t - 0.42665 * t2 - 0.041833 * t3) * ARCSEC_TO_RAD
  const cz = Math.cos(z)
  const sz = Math.sin(z)
  const ct = Math.cos(theta)
  const st = Math.sin(theta)
  const czeta = Math.cos(zeta)
  const szeta = Math.sin(zeta)
  out[0] = cz * ct * czeta - sz * szeta
  out[1] = cz * ct * szeta + sz * czeta
  out[2] = cz * st
  out[3] = -sz * ct * czeta - cz * szeta
  out[4] = -sz * ct * szeta + cz * czeta
  out[5] = -sz * st
  out[6] = -st * czeta
  out[7] = -st * szeta
  out[8] = ct
  return out
}

/** 行主序 3×3：out = a × b。out 不可与 a、b 别名。 */
export function multiplyMat3(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  out: number[] | Float32Array,
) {
  const a00 = a[0]
  const a01 = a[1]
  const a02 = a[2]
  const a10 = a[3]
  const a11 = a[4]
  const a12 = a[5]
  const a20 = a[6]
  const a21 = a[7]
  const a22 = a[8]
  out[0] = a00 * b[0] + a01 * b[3] + a02 * b[6]
  out[1] = a00 * b[1] + a01 * b[4] + a02 * b[7]
  out[2] = a00 * b[2] + a01 * b[5] + a02 * b[8]
  out[3] = a10 * b[0] + a11 * b[3] + a12 * b[6]
  out[4] = a10 * b[1] + a11 * b[4] + a12 * b[7]
  out[5] = a10 * b[2] + a11 * b[5] + a12 * b[8]
  out[6] = a20 * b[0] + a21 * b[3] + a22 * b[6]
  out[7] = a20 * b[1] + a21 * b[4] + a22 * b[7]
  out[8] = a20 * b[2] + a21 * b[5] + a22 * b[8]
  return out
}

/** 同时写出行星用地平矩阵，以及 J2000 恒星/网格用的 地平×岁差。 */
export function fillEqjHorizonMatrices(
  time: number | Date,
  observer: Observer,
  horizonOut: number[] | Float32Array,
  eqjOut: number[] | Float32Array,
) {
  fillHorizonMatrix(time, observer, horizonOut)
  fillPrecessionMatrix(time, precessionScratch)
  return multiplyMat3(horizonOut, precessionScratch, eqjOut)
}

/** 用上面的 3×3 把一个赤道方向转到地平。 */
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

/** 黄道上某黄经对应的赤道方向。 */
export function eclipticEquatorialUnit(longitudeDeg: number) {
  const obliquity = degToRad(OBLIQUITY_DEG)
  const lon = degToRad(longitudeDeg)
  const ra = Math.atan2(Math.sin(lon) * Math.cos(obliquity), Math.cos(lon))
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(lon))
  return equatorialUnit(((ra < 0 ? ra + Math.PI * 2 : ra) / (Math.PI * 2)) * HOURS_PER_DAY, radToDeg(dec))
}

/** 地平单位向量 → 高度角、方位角（度）。y 是天顶分量。 */
export function horizonAnglesFromVector(vector: { x: number; y: number; z: number }) {
  return {
    altitude: radToDeg(Math.asin(clamp(vector.y, -1, 1))),
    azimuth: wrapDegrees(radToDeg(Math.atan2(-vector.x, vector.z))),
  }
}
