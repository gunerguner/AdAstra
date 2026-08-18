export const bodyAppearance: Record<string, { color: string; size: number; priority: number }> = {
  sun: { color: '#ffe69a', size: 78, priority: 100 },
  moon: { color: '#edf4ff', size: 56, priority: 80 },
  venus: { color: '#ffe8bb', size: 14, priority: 40 },
  jupiter: { color: '#ffd2a2', size: 16, priority: 35 },
  mars: { color: '#ff8e76', size: 12, priority: 30 },
  saturn: { color: '#f8dea3', size: 13, priority: 25 },
  mercury: { color: '#c6b49d', size: 10, priority: 20 },
}

export function bodyVisualScale(id: string, magnitude: number) {
  if (id === 'sun' || id === 'moon') return 1
  return Math.max(0.7, Math.min(1.55, (1.6 - magnitude) / 3.8))
}

export function bodyPointSize(id: string, magnitude: number) {
  return (bodyAppearance[id]?.size ?? 12) * bodyVisualScale(id, magnitude)
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
