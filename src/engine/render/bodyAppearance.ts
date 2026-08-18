export const SATURN_RING_SCALE = 1.9
export const SUN_GLOW_SCALE = 1.55

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
  sun: { color: '#ffe69a', size: 72, priority: 100, atlasIndex: 0, spriteScale: SUN_GLOW_SCALE },
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
  const size = bodyPointSize(id, magnitude)
  if (id === 'sun') return size * 0.52
  return size * (appearance?.spriteScale ?? 1)
}

export function starBrightness(magnitude: number) {
  return Math.max(0, Math.min(1, (3.1 - magnitude) / 4.6))
}

export function starPointSize(magnitude: number) {
  return 9 + starBrightness(magnitude) * 44
}

export function daylightFactor(sunAltitude: number, enabled: boolean) {
  if (!enabled) return 0
  return Math.min(1, Math.max(0, (sunAltitude + 12) / 18))
}
