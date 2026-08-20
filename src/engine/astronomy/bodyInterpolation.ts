/**
 * 在 Worker 给出的两个采样时刻之间插值太阳系天体。
 * 主线程每帧只做球面/角度插值，不直接调用第三方星历库。
 */
import { clamp, degToRad, lerp, lerpDegrees, radToDeg } from '@/shared/math'
import { DEG_PER_HOUR, HOURS_PER_DAY } from '@/engine/coordinates/astroConstants'

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

const EMPTY: BodySnapshot[] = []
const pooled: BodySnapshot[] = []
const result: BodySnapshot[] = []
const nextById = new Map<string, BodySnapshot>()

let cachedWindow: BodySnapshotWindow | null = null
let cachedUtcMillis = Number.NaN

function slot(index: number): BodySnapshot {
  const existing = pooled[index]
  if (existing) return existing
  const created: BodySnapshot = {
    id: '',
    name: '',
    altitude: 0,
    azimuth: 0,
    raHours: 0,
    decDeg: 0,
    magnitude: 0,
    phaseAngle: 0,
    phaseFraction: 0,
  }
  pooled[index] = created
  return created
}

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

/** t∈[0,1] 在两个采样时刻之间插值。方位走劣弧，位置走球面，避免穿越地心。 */
export function interpolateBodySnapshots(window: BodySnapshotWindow | null, utcMillis: number): BodySnapshot[] {
  if (!window) return EMPTY
  if (window === cachedWindow && utcMillis === cachedUtcMillis) return result
  const span = Math.max(window.toUtcMillis - window.fromUtcMillis, 1)
  const t = clamp((utcMillis - window.fromUtcMillis) / span, 0, 1)
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
