import { describe, expect, it } from 'vitest'
import { bodyPointSize, bodyVisualScale, daylightFactor, starBrightness } from '../src/engine/render/bodyAppearance'

describe('body appearance', () => {
  it('preserves the Sun and Moon visual scale', () => {
    expect(bodyVisualScale('sun', 10)).toBe(1)
    expect(bodyVisualScale('moon', -10)).toBe(1)
  })

  it('clamps planet scale and daylight values', () => {
    expect(bodyVisualScale('mars', 20)).toBe(0.7)
    expect(bodyPointSize('mars', 1)).toBeGreaterThan(0)
    expect(starBrightness(20)).toBe(0)
    expect(daylightFactor(-20, true)).toBe(0)
    expect(daylightFactor(20, true)).toBe(1)
  })
})
