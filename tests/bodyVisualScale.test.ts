import { describe, expect, it } from 'vitest'
import { bodyPickSize, bodyPointSize, bodyVisualScale, daylightFactor, starBrightness } from '../src/engine/render/bodyAppearance'

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

  it('keeps planets smaller than the Moon and Sun glow', () => {
    expect(bodyPointSize('venus', -4)).toBeLessThan(bodyPointSize('moon', -12))
    expect(bodyPointSize('jupiter', -2)).toBeLessThan(bodyPointSize('moon', -12))
    expect(bodyPointSize('sun', -26)).toBeGreaterThan(bodyPointSize('moon', -12))
  })

  it('gives Saturn a larger pick size than Jupiter because of rings', () => {
    expect(bodyPickSize('saturn', -0.5)).toBeGreaterThan(bodyPickSize('jupiter', -2))
  })

  it('keeps the Sun pick target near the disc instead of the glow', () => {
    expect(bodyPickSize('sun', -26)).toBeLessThan(bodyPointSize('sun', -26))
    expect(bodyPickSize('sun', -26)).toBeGreaterThan(bodyPickSize('moon', -12) * 0.8)
  })
})
