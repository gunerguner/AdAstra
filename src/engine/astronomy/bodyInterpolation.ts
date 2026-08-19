/**
 * 在 Worker 给出的两个采样时刻之间插值太阳系天体。
 * 主线程每帧只做球面/角度插值，不直接调用第三方星历库。
 */
import { lerpDegrees } from './moonPhaseName'
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

function copySnapshot(from: BodySnapshot, out: BodySnapshot) {
  out.id = from.id
  out.name = from.name
  out.altitude = from.altitude
  out.azimuth = from.azimuth
  out.raHours = from.raHours
  out.decDeg = from.decDeg
  out.magnitude = from.magnitude
  out.phaseAngle = from.phaseAngle
  out.phaseFraction = from.phaseFraction
  out.synodicDeg = from.synodicDeg
  out.ringTilt = from.ringTilt
  return out
}

function interpolatePair(from: BodySnapshot, to: BodySnapshot, t: number, out: BodySnapshot) {
  const fromRa = from.raHours * DEG_PER_HOUR * Math.PI / 180
  const toRa = to.raHours * DEG_PER_HOUR * Math.PI / 180
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
  copySnapshot(from, out)
  out.raHours = ((Math.atan2(y, x) * 180 / Math.PI / DEG_PER_HOUR) + HOURS_PER_DAY) % HOURS_PER_DAY
  out.decDeg = Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI
  out.altitude = from.altitude + (to.altitude - from.altitude) * t
  out.azimuth = from.azimuth + ((((to.azimuth - from.azimuth + 540) % 360) - 180) * t)
  out.magnitude = from.magnitude + (to.magnitude - from.magnitude) * t
  out.phaseAngle = from.phaseAngle + (to.phaseAngle - from.phaseAngle) * t
  out.phaseFraction = from.phaseFraction + (to.phaseFraction - from.phaseFraction) * t
  out.synodicDeg = from.synodicDeg != null && to.synodicDeg != null
    ? lerpDegrees(from.synodicDeg, to.synodicDeg, t)
    : from.synodicDeg
  out.ringTilt = from.ringTilt != null && to.ringTilt != null
    ? from.ringTilt + (to.ringTilt - from.ringTilt) * t
    : from.ringTilt
  return out
}

/** t∈[0,1] 在两个采样时刻之间插值。方位走劣弧，位置走球面，避免穿越地心。 */
export function interpolateBodySnapshots(window: BodySnapshotWindow | null, utcMillis: number): BodySnapshot[] {
  if (!window) return EMPTY
  if (window === cachedWindow && utcMillis === cachedUtcMillis) return result
  const span = Math.max(window.toUtcMillis - window.fromUtcMillis, 1)
  const t = Math.min(1, Math.max(0, (utcMillis - window.fromUtcMillis) / span))
  nextById.clear()
  for (const body of window.to) nextById.set(body.id, body)
  result.length = window.from.length
  for (let index = 0; index < window.from.length; index += 1) {
    const from = window.from[index]
    const to = nextById.get(from.id)
    const out = slot(index)
    result[index] = to ? interpolatePair(from, to, t, out) : copySnapshot(from, out)
  }
  cachedWindow = window
  cachedUtcMillis = utcMillis
  return result
}
