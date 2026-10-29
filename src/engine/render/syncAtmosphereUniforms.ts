import { estimateSunHorizontal } from '@/engine/coordinates/skyMath'
import type { Observer } from '@/shared/types/observer'
import { atmosphereState, type AtmosphereState } from './atmosphereState'
import type { SharedSkyUniforms } from './skyContext'

export type AtmosphereSyncCache = {
  lastSunAltitude: number
  lastSunAzimuth: number
  lastUiPhase: string
}

/**
 * 用当前时刻的太阳地平坐标更新天空/地面 uniforms，并回调 UI 昼夜相位。
 * 昼夜只取决于太阳高度，这里始终按 utcMillis 现算（Meeus 低精度，约 1°），
 * 不吃 Worker 快照：拖时间轴时快照窗口盖不住当前时刻，把采样时的高度
 * 继续画下去会把天空钉在上一次的日出/日落后才恢复。
 * 太阳圆盘的位置仍由快照插值负责，这里只管整片天空的亮暗。
 */
export function syncAtmosphereUniforms(options: {
  uniforms: SharedSkyUniforms
  utcMillis: number
  observer: Observer
  daylightEffect: boolean
  layersChanged: boolean
  cache: AtmosphereSyncCache
  onAtmosphereChange?: (state: AtmosphereState) => void
}) {
  const { uniforms, utcMillis, observer, daylightEffect, layersChanged, cache, onAtmosphereChange } = options
  const sunHorizon = estimateSunHorizontal(utcMillis, observer)
  const sunAltitude = sunHorizon.altitude
  const sunAzimuth = sunHorizon.azimuth
  if (sunAltitude === cache.lastSunAltitude && sunAzimuth === cache.lastSunAzimuth && !layersChanged) return
  const atmosphere = atmosphereState(sunAltitude, sunAzimuth, daylightEffect)
  uniforms.daylight.value = atmosphere.daylight
  uniforms.twilight.value = atmosphere.twilight
  uniforms.warmth.value = atmosphere.warmth
  uniforms.groundLight.value = atmosphere.groundLight
  uniforms.sunDir.value.set(atmosphere.sunDirX, atmosphere.sunDirY, atmosphere.sunDirZ)
  cache.lastSunAltitude = sunAltitude
  cache.lastSunAzimuth = sunAzimuth
  if (atmosphere.phase !== cache.lastUiPhase) {
    cache.lastUiPhase = atmosphere.phase
    onAtmosphereChange?.(atmosphere)
  }
}
