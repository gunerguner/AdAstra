/** 视角钳制：方位 0–360、仰角约 -30°–89°、视场夹在投影允许范围内。 */
import { clampSkyFov } from '@/engine/render/skyProjection'
import { clamp, wrapDegrees } from '@/shared/math'
import type { SkyView } from '@/shared/types/sky'

export const VIEW_ALTITUDE_MIN = -30
export const VIEW_ALTITUDE_MAX = 89
export const VIEW_DEFAULT_AZIMUTH = 180
export const VIEW_DEFAULT_ALTITUDE = 0

/** 仰角夹在可下探地平以下与接近天顶之间。 */
export function clampViewAltitude(altitude: number) {
  return clamp(altitude, VIEW_ALTITUDE_MIN, VIEW_ALTITUDE_MAX)
}

/** 顶栏读数。拖拽中直接写 DOM，松手后 React 用同一格式，避免对不上。 */
export function formatViewBearing(view: SkyView) {
  return `${Math.round(view.azimuth)}° · ${Math.round(view.altitude)}°`
}

/** 指针拖拽：delta 是像素，转成方位/仰角增量。 */
export function panView(view: SkyView, deltaX: number, deltaY: number): SkyView {
  return {
    azimuth: wrapDegrees(view.azimuth + deltaX * 0.22),
    altitude: clampViewAltitude(view.altitude + deltaY * 0.16),
    fov: view.fov,
  }
}

/** 滚轮/捏合：factor > 1 拉远（视场变大）。 */
export function zoomView(view: SkyView, factor: number): SkyView {
  return { ...view, fov: clampSkyFov(view.fov * factor) }
}

/** 方向键平移，+/- 缩放；其它键返回 null。 */
export function nudgeView(view: SkyView, key: string): SkyView | null {
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    return { ...view, azimuth: wrapDegrees(view.azimuth + (key === 'ArrowLeft' ? -6 : 6)) }
  }
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    return { ...view, altitude: clampViewAltitude(view.altitude + (key === 'ArrowUp' ? 4 : -4)) }
  }
  if (key === '+' || key === '=') return zoomView(view, 0.9)
  if (key === '-') return zoomView(view, 1.1)
  return null
}
