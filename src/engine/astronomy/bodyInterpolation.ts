/**
 * 在 Worker 给出的两个采样时刻之间插值太阳系天体。
 * 主线程每帧只做球面/角度插值，不直接调用第三方星历库。
 */
import { clamp, degToRad, lerp, lerpDegrees, radToDeg } from '@/shared/math'
import { DEG_PER_HOUR, HOURS_PER_DAY } from '@/engine/coordinates/astroConstants'
import { estimateSunBodyInto } from '@/engine/coordinates/skyMath'
import type { Observer } from '@/shared/types/observer'

/** 某一时刻一颗太阳系天体的地平/赤道坐标与外观。 */
export type BodySnapshot = {
  id: string
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

/** Worker 给出的一对采样：from/to 之间由主线程按当前时刻插值。 */
export type BodySnapshotWindow = {
  fromUtcMillis: number
  toUtcMillis: number
  from: BodySnapshot[]
  to: BodySnapshot[]
}

const EMPTY: BodySnapshot[] = []
/** 对象池：按天体下标复用快照，避免每帧分配。 */
const pooled: Array<BodySnapshot | undefined> = []
const result: BodySnapshot[] = []
const nextById = new Map<string, BodySnapshot>()

let cachedWindow: BodySnapshotWindow | null = null
let cachedUtcMillis = Number.NaN

/** 取第 index 个池化快照；没有才新建。 */
function slot(index: number): BodySnapshot {
  return pooled[index] ??= {
    id: '',
    altitude: 0,
    azimuth: 0,
    raHours: 0,
    decDeg: 0,
    magnitude: 0,
    phaseAngle: 0,
    phaseFraction: 0,
  }
}

/** 两帧之间插值一颗天体：赤经赤纬走球面，方位走劣弧，写入 out。 */
function interpolatePair(from: BodySnapshot, to: BodySnapshot, t: number, out: BodySnapshot) {
  const fromRa = degToRad(from.raHours * DEG_PER_HOUR)
  const toRa = degToRad(to.raHours * DEG_PER_HOUR)
  const fromDec = degToRad(from.decDeg)
  const toDec = degToRad(to.decDeg)
  const ax = Math.cos(fromDec) * Math.cos(fromRa)
  const ay = Math.cos(fromDec) * Math.sin(fromRa)
  const az = Math.sin(fromDec)
  const bx = Math.cos(toDec) * Math.cos(toRa)
  const by = Math.cos(toDec) * Math.sin(toRa)
  const bz = Math.sin(toDec)
  const dot = clamp(ax * bx + ay * by + az * bz, -1, 1)
  const omega = Math.acos(dot)
  const sinOmega = Math.sin(omega)
  const left = sinOmega < 1e-6 ? 1 - t : Math.sin((1 - t) * omega) / sinOmega
  const right = sinOmega < 1e-6 ? t : Math.sin(t * omega) / sinOmega
  const x = ax * left + bx * right
  const y = ay * left + by * right
  const z = az * left + bz * right
  Object.assign(out, from)
  out.raHours = ((radToDeg(Math.atan2(y, x)) / DEG_PER_HOUR) + HOURS_PER_DAY) % HOURS_PER_DAY
  out.decDeg = radToDeg(Math.atan2(z, Math.hypot(x, y)))
  out.altitude = lerp(from.altitude, to.altitude, t)
  out.azimuth = lerpDegrees(from.azimuth, to.azimuth, t)
  out.magnitude = lerp(from.magnitude, to.magnitude, t)
  out.phaseAngle = lerp(from.phaseAngle, to.phaseAngle, t)
  out.phaseFraction = lerp(from.phaseFraction, to.phaseFraction, t)
  out.synodicDeg = from.synodicDeg != null && to.synodicDeg != null
    ? lerpDegrees(from.synodicDeg, to.synodicDeg, t)
    : from.synodicDeg
  out.ringTilt = from.ringTilt != null && to.ringTilt != null
    ? lerp(from.ringTilt, to.ringTilt, t)
    : from.ringTilt
  return out
}

function windowCovers(window: BodySnapshotWindow, utcMillis: number) {
  const span = window.toUtcMillis - window.fromUtcMillis
  return span > 0 && utcMillis >= window.fromUtcMillis && utcMillis <= window.toUtcMillis
}

/** 快照窗口盖不住时的太阳兜底：低精度估算，只保证日盘、拾取和信息卡不消失。 */
const sunFallback: BodySnapshot = {
  id: 'sun',
  altitude: 0,
  azimuth: 0,
  raHours: 0,
  decDeg: 0,
  magnitude: -26.7,
  phaseAngle: 0,
  phaseFraction: 1,
  synodicDeg: undefined,
  ringTilt: undefined,
}
const sunFallbackList: BodySnapshot[] = [sunFallback]
let cachedFallbackUtcMillis = Number.NaN

/**
 * t∈[0,1] 在两个采样时刻之间插值。方位走劣弧，位置走球面，避免穿越地心。
 * 窗口盖不住当前时刻（拖时间轴后旧窗口还没被新采样替换）时不外推其余天体，
 * 太阳改用低精度估算兜底——把采样时刻的高度继续画下去，会把日落钉死到下一次相位变化。
 */
export function interpolateBodySnapshots(
  window: BodySnapshotWindow | null,
  utcMillis: number,
  observer?: Observer,
): BodySnapshot[] {
  if (!Number.isFinite(utcMillis)) return EMPTY
  if (window && windowCovers(window, utcMillis)) {
    if (window === cachedWindow && utcMillis === cachedUtcMillis) return result
    cachedFallbackUtcMillis = Number.NaN
    const span = window.toUtcMillis - window.fromUtcMillis
    const t = (utcMillis - window.fromUtcMillis) / span
    nextById.clear()
    for (const body of window.to) nextById.set(body.id, body)
    result.length = window.from.length
    for (let index = 0; index < window.from.length; index += 1) {
      const from = window.from[index]
      const to = nextById.get(from.id)
      const out = slot(index)
      result[index] = to ? interpolatePair(from, to, t, out) : Object.assign(out, from)
    }
    cachedWindow = window
    cachedUtcMillis = utcMillis
    return result
  }
  cachedWindow = null
  cachedUtcMillis = Number.NaN
  if (!observer) return EMPTY
  if (utcMillis === cachedFallbackUtcMillis) return sunFallbackList
  cachedFallbackUtcMillis = utcMillis
  estimateSunBodyInto(utcMillis, observer, sunFallback)
  return sunFallbackList
}
