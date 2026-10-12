import { panView } from './viewConstraints'
import type { SkyView } from '@/shared/types/sky'

/** 慢拖或松手前已停住时不滑行，避免惯性干扰对准。 */
export const INERTIA_MIN_SPEED = 0.18
export const INERTIA_MAX_SPEED = 0.55
export const INERTIA_TAU_MS = 100
export const INERTIA_MAX_MS = 320
export const INERTIA_STOP_SPEED = 0.04
const SAMPLE_WINDOW_MS = 80
const REST_MS = 48

export type InertiaSample = { t: number; x: number; y: number }
export type InertiaVelocity = { vx: number; vy: number }

/** 由松手前一小段位移得到像素/毫秒速度；太慢、太短或已经停住则返回 null。 */
export function releaseViewInertia(samples: InertiaSample[], now: number): InertiaVelocity | null {
  if (samples.length < 2) return null
  const last = samples[samples.length - 1]
  if (now - last.t > REST_MS) return null
  let first = samples[0]
  for (const sample of samples) {
    if (last.t - sample.t <= SAMPLE_WINDOW_MS) {
      first = sample
      break
    }
  }
  const dt = last.t - first.t
  if (dt < 8) return null
  let vx = (last.x - first.x) / dt
  let vy = (last.y - first.y) / dt
  const speed = Math.hypot(vx, vy)
  if (speed < INERTIA_MIN_SPEED) return null
  if (speed > INERTIA_MAX_SPEED) {
    vx *= INERTIA_MAX_SPEED / speed
    vy *= INERTIA_MAX_SPEED / speed
  }
  return { vx, vy }
}

/** 衰减一帧。done 时调用方应停掉动画并把视角写回 React。 */
export function stepViewInertia(
  view: SkyView,
  velocity: InertiaVelocity,
  dtMs: number,
  elapsedMs: number,
): { view: SkyView; velocity: InertiaVelocity; done: boolean } {
  if (elapsedMs >= INERTIA_MAX_MS) {
    return { view, velocity: { vx: 0, vy: 0 }, done: true }
  }
  const dt = Math.min(32, Math.max(0, dtMs))
  if (dt === 0) return { view, velocity, done: false }
  const next = panView(view, velocity.vx * dt, velocity.vy * dt)
  const decay = Math.exp(-dt / INERTIA_TAU_MS)
  const vx = next.azimuth === view.azimuth ? 0 : velocity.vx * decay
  const vy = next.altitude === view.altitude ? 0 : velocity.vy * decay
  const done = Math.hypot(vx, vy) < INERTIA_STOP_SPEED
  return { view: next, velocity: { vx, vy }, done }
}
