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

/** 当地恒星时（小时）：春分点相对观测者子午圈转了多少。 */
export function localSiderealHours(time: number | Date, longitude: number) {
  const jd = (typeof time === 'number' ? time : time.getTime()) / MS_PER_DAY + JULIAN_UNIX_EPOCH
  const d = jd - JULIAN_J2000
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
