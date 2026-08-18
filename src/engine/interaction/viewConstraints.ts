import { clampSkyFov } from '@/engine/render/skyProjection'
import type { SkyView } from '@/shared/types/sky'

export const VIEW_ALTITUDE_MIN = -30
export const VIEW_ALTITUDE_MAX = 89

export function clampViewAltitude(altitude: number) {
  return Math.max(VIEW_ALTITUDE_MIN, Math.min(VIEW_ALTITUDE_MAX, altitude))
}

export function wrapAzimuth(azimuth: number) {
  return (azimuth + 360) % 360
}

export function panView(view: SkyView, deltaX: number, deltaY: number): SkyView {
  return {
    azimuth: wrapAzimuth(view.azimuth - deltaX * 0.22),
    altitude: clampViewAltitude(view.altitude + deltaY * 0.16),
    fov: view.fov,
  }
}

export function zoomView(view: SkyView, factor: number): SkyView {
  return { ...view, fov: clampSkyFov(view.fov * factor) }
}

export function nudgeView(view: SkyView, key: string): SkyView | null {
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    return {
      azimuth: wrapAzimuth(view.azimuth + (key === 'ArrowLeft' ? 6 : -6)),
      altitude: view.altitude,
      fov: view.fov,
    }
  }
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    return {
      azimuth: view.azimuth,
      altitude: clampViewAltitude(view.altitude + (key === 'ArrowUp' ? 4 : -4)),
      fov: view.fov,
    }
  }
  if (key === '+' || key === '=') return zoomView(view, 0.9)
  if (key === '-') return zoomView(view, 1.1)
  return null
}
