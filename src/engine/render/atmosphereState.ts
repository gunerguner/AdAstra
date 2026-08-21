/**
 * 昼夜：用太阳高度算出 daylight/twilight/warmth，喂给天空和 UI。
 */
import {
  ASTRONOMICAL_TWILIGHT_ALTITUDE_DEG,
  CIVIL_TWILIGHT_ALTITUDE_DEG,
  DAYLIGHT_FULL_ALTITUDE_DEG,
  NAUTICAL_TWILIGHT_ALTITUDE_DEG,
} from '@/engine/coordinates/astroConstants'
import { clamp, degToRad } from '@/shared/math'

export type AtmospherePhase = 'night' | 'astronomical' | 'nautical' | 'civil' | 'day'

export type AtmosphereState = {
  daylight: number
  twilight: number
  night: number
  warmth: number
  groundLight: number
  sunElevation: number
  sunAzimuth: number
  sunDirX: number
  sunDirY: number
  sunDirZ: number
  phase: AtmospherePhase
}

const NIGHT_ATMOSPHERE: AtmosphereState = {
  daylight: 0,
  twilight: 0,
  night: 1,
  warmth: 0,
  groundLight: 0.06,
  sunElevation: -90,
  sunAzimuth: 0,
  sunDirX: 0,
  sunDirY: -1,
  sunDirZ: 0,
  phase: 'night',
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function atmospherePhase(sunAltitude: number, enabled: boolean): AtmospherePhase {
  if (!enabled || sunAltitude < ASTRONOMICAL_TWILIGHT_ALTITUDE_DEG) return 'night'
  if (sunAltitude < NAUTICAL_TWILIGHT_ALTITUDE_DEG) return 'astronomical'
  if (sunAltitude < CIVIL_TWILIGHT_ALTITUDE_DEG) return 'nautical'
  if (sunAltitude < 0) return 'civil'
  return 'day'
}

const ATMOSPHERE_PHASE_LABEL: Record<AtmospherePhase, string> = {
  astronomical: '天文曙暮光',
  nautical: '航海曙暮光',
  civil: '民用曙暮光',
  day: '白昼',
  night: '夜晚',
}

export function atmospherePhaseLabel(phase: AtmospherePhase) {
  return ATMOSPHERE_PHASE_LABEL[phase]
}

/** 由太阳高度得到昼夜混合系数。天文曙暮光以下全夜，DAYLIGHT_FULL 左右白天。 */
export function atmosphereState(sunAltitude: number, sunAzimuth: number, enabled: boolean): AtmosphereState {
  if (!enabled) {
    return {
      ...NIGHT_ATMOSPHERE,
      sunElevation: sunAltitude,
      sunAzimuth,
    }
  }
  const altitude = degToRad(sunAltitude)
  const azimuth = degToRad(sunAzimuth)
  const daylight = clamp(
    (sunAltitude - NAUTICAL_TWILIGHT_ALTITUDE_DEG)
      / (DAYLIGHT_FULL_ALTITUDE_DEG - NAUTICAL_TWILIGHT_ALTITUDE_DEG),
    0,
    1,
  )
  const twilight = smoothstep(ASTRONOMICAL_TWILIGHT_ALTITUDE_DEG, -8, sunAltitude)
    * (1 - smoothstep(2, 14, sunAltitude))
  const night = 1 - smoothstep(ASTRONOMICAL_TWILIGHT_ALTITUDE_DEG, CIVIL_TWILIGHT_ALTITUDE_DEG, sunAltitude)
  return {
    daylight,
    twilight,
    night,
    warmth: twilight * (0.28 + 0.72 * (1 - clamp(Math.abs(sunAltitude) / 10, 0, 1))),
    groundLight: smoothstep(NAUTICAL_TWILIGHT_ALTITUDE_DEG, 8, sunAltitude),
    sunElevation: sunAltitude,
    sunAzimuth,
    sunDirX: -Math.cos(altitude) * Math.sin(azimuth),
    sunDirY: Math.sin(altitude),
    sunDirZ: Math.cos(altitude) * Math.cos(azimuth),
    phase: atmospherePhase(sunAltitude, true),
  }
}
