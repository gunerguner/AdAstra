/**
 * 太阳系天体怎么画：点大小、图集格、拾取半径。
 */
import { clamp } from '@/shared/math'

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

/** 行星视星等 → 相对大小；日月固定 1。 */
export function bodyVisualScale(id: string, magnitude: number) {
  if (id === 'sun' || id === 'moon') return 1
  return clamp((1.6 - magnitude) / 3.8, 0.7, 1.55)
}

/** 点精灵直径（像素）。 */
export function bodyPointSize(id: string, magnitude: number) {
  const base = bodyAppearance[id]?.size ?? 10
  return base * bodyVisualScale(id, magnitude)
}

/** 点击命中半径（像素）；太阳按光球不算光晕。 */
export function bodyPickSize(id: string, magnitude: number) {
  const appearance = bodyAppearance[id]
  const diameter = bodyPointSize(id, magnitude)
  if (id === 'sun') return diameter * 0.5 + 4
  return diameter * 0.5 * (appearance?.spriteScale ?? 1) + 8
}

/** 视星等 → 0–1 亮度，给点精灵大小和透明度。 */
export function starBrightness(magnitude: number) {
  return clamp((3.1 - magnitude) / 4.6, 0, 1)
}

/** 恒星点精灵直径（像素）。 */
export function starPointSize(magnitude: number) {
  return 9 + starBrightness(magnitude) * 44
}
