/**
 * 太阳系天体怎么画：点大小、图集格、拾取半径。
 * 后半是昼夜：用太阳高度算出 daylight/twilight/warmth，喂给天空和 UI。
 */
import {
  ASTRONOMICAL_TWILIGHT_ALTITUDE_DEG,
  CIVIL_TWILIGHT_ALTITUDE_DEG,
  DAYLIGHT_FULL_ALTITUDE_DEG,
  NAUTICAL_TWILIGHT_ALTITUDE_DEG,
} from '@/engine/coordinates/astroConstants'

export const SATURN_RING_SCALE = 1.9
/** 夜间太阳精灵比光球略大，用来画光晕。 */
export const SUN_GLOW_SCALE = 1.7
/** 白天光晕更大；拾取仍按光球半径。 */
export const SUN_DAY_GLOW_SCALE = 2.45

export const bodyRenderOrder = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const

export const bodyAppearance: Record<string, {
  color: string
  size: number
  priority: number
  atlasIndex: number
  spriteScale: number
}> = {
  sun: { color: '#ffe69a', size: 46, priority: 100, atlasIndex: 0, spriteScale: SUN_GLOW_SCALE },
  moon: { color: '#edf4ff', size: 32, priority: 80, atlasIndex: 1, spriteScale: 1 },
  mercury: { color: '#c6b49d', size: 8, priority: 20, atlasIndex: 2, spriteScale: 1 },
  venus: { color: '#ffe8bb', size: 11, priority: 40, atlasIndex: 3, spriteScale: 1 },
  mars: { color: '#ff8e76', size: 10, priority: 30, atlasIndex: 4, spriteScale: 1 },
  jupiter: { color: '#ffd2a2', size: 15, priority: 35, atlasIndex: 5, spriteScale: 1 },
  saturn: { color: '#f8dea3', size: 13, priority: 25, atlasIndex: 6, spriteScale: SATURN_RING_SCALE },
  uranus: { color: '#9fd7de', size: 8, priority: 18, atlasIndex: 7, spriteScale: 1 },
  neptune: { color: '#6f8fe0', size: 8, priority: 16, atlasIndex: 8, spriteScale: 1 },
}

export function bodyKindLabel(id: string) {
  if (id === 'sun') return '太阳'
  if (id === 'moon') return '月亮'
  return '行星'
}

export function bodyVisualScale(id: string, magnitude: number) {
  if (id === 'sun' || id === 'moon') return 1
  return Math.max(0.7, Math.min(1.55, (1.6 - magnitude) / 3.8))
}

export function bodyPointSize(id: string, magnitude: number) {
  const base = bodyAppearance[id]?.size ?? 10
  return base * bodyVisualScale(id, magnitude)
}

export function bodyPickSize(id: string, magnitude: number) {
  const appearance = bodyAppearance[id]
  const diameter = bodyPointSize(id, magnitude)
  if (id === 'sun') return diameter * 0.5 + 4
  return diameter * 0.5 * (appearance?.spriteScale ?? 1) + 8
}

export function starBrightness(magnitude: number) {
  return Math.max(0, Math.min(1, (3.1 - magnitude) / 4.6))
}

export function starPointSize(magnitude: number) {
  return 9 + starBrightness(magnitude) * 44
}

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

function saturate(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = saturate((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function atmospherePhase(sunAltitude: number, enabled: boolean): AtmospherePhase {
  if (!enabled || sunAltitude < ASTRONOMICAL_TWILIGHT_ALTITUDE_DEG) return 'night'
  if (sunAltitude < NAUTICAL_TWILIGHT_ALTITUDE_DEG) return 'astronomical'
  if (sunAltitude < CIVIL_TWILIGHT_ALTITUDE_DEG) return 'nautical'
  if (sunAltitude < 0) return 'civil'
  return 'day'
}

export function atmospherePhaseLabel(phase: AtmospherePhase) {
  if (phase === 'astronomical') return '天文曙暮光'
  if (phase === 'nautical') return '航海曙暮光'
  if (phase === 'civil') return '民用曙暮光'
  if (phase === 'day') return '白昼'
  return '夜晚'
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
  const altitude = sunAltitude * Math.PI / 180
  const azimuth = sunAzimuth * Math.PI / 180
  const daylight = saturate(
    (sunAltitude - NAUTICAL_TWILIGHT_ALTITUDE_DEG)
      / (DAYLIGHT_FULL_ALTITUDE_DEG - NAUTICAL_TWILIGHT_ALTITUDE_DEG),
  )
  const twilight = smoothstep(ASTRONOMICAL_TWILIGHT_ALTITUDE_DEG, -8, sunAltitude)
    * (1 - smoothstep(2, 14, sunAltitude))
  const night = 1 - smoothstep(ASTRONOMICAL_TWILIGHT_ALTITUDE_DEG, CIVIL_TWILIGHT_ALTITUDE_DEG, sunAltitude)
  return {
    daylight,
    twilight,
    night,
    warmth: twilight * (0.28 + 0.72 * (1 - saturate(Math.abs(sunAltitude) / 10))),
    groundLight: smoothstep(NAUTICAL_TWILIGHT_ALTITUDE_DEG, 8, sunAltitude),
    sunElevation: sunAltitude,
    sunAzimuth,
    sunDirX: Math.cos(altitude) * Math.sin(azimuth),
    sunDirY: Math.sin(altitude),
    sunDirZ: Math.cos(altitude) * Math.cos(azimuth),
    phase: atmospherePhase(sunAltitude, true),
  }
}
