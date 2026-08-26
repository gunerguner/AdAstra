import type { BodySnapshot } from '@/engine/astronomy/bodyInterpolation'
import { applyHorizonMatrixInto, equatorialUnitInto, estimateSunHorizontal } from '@/engine/coordinates/skyMath'
import type { Observer } from '@/shared/types/observer'
import { atmosphereState, type AtmosphereState } from './atmosphereState'
import type { SharedSkyUniforms, SkySceneContext } from './skyContext'

export type AtmosphereSyncCache = {
  lastSunAltitude: number
  lastSunAzimuth: number
  lastUiPhase: string
}

export function syncAtmosphereUniforms(options: {
  uniforms: SharedSkyUniforms
  scratch: SkySceneContext['scratch']
  sun: BodySnapshot | undefined
  utcMillis: number
  observer: Observer
  daylightEffect: boolean
  layersChanged: boolean
  cache: AtmosphereSyncCache
  onAtmosphereChange?: (state: AtmosphereState) => void
}) {
  const { uniforms, scratch, sun, utcMillis, observer, daylightEffect, layersChanged, cache, onAtmosphereChange } = options
  const sunHorizon = sun ?? estimateSunHorizontal(utcMillis, observer)
  const sunAltitude = sunHorizon.altitude
  const sunAzimuth = sunHorizon.azimuth
  if (sun) {
    applyHorizonMatrixInto(
      equatorialUnitInto(sun.raHours, sun.decDeg, scratch.horizon),
      uniforms.horizonMat,
      scratch.projected,
    )
    uniforms.sunDir.value.copy(scratch.projected).normalize()
  }
  if (sunAltitude === cache.lastSunAltitude && sunAzimuth === cache.lastSunAzimuth && !layersChanged) return
  const atmosphere = atmosphereState(sunAltitude, sunAzimuth, daylightEffect)
  uniforms.daylight.value = atmosphere.daylight
  uniforms.twilight.value = atmosphere.twilight
  uniforms.warmth.value = atmosphere.warmth
  uniforms.groundLight.value = atmosphere.groundLight
  if (!sun) uniforms.sunDir.value.set(atmosphere.sunDirX, atmosphere.sunDirY, atmosphere.sunDirZ)
  cache.lastSunAltitude = sunAltitude
  cache.lastSunAzimuth = sunAzimuth
  if (atmosphere.phase !== cache.lastUiPhase) {
    cache.lastUiPhase = atmosphere.phase
    onAtmosphereChange?.(atmosphere)
  }
}
