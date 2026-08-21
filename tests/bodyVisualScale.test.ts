import { describe, expect, it } from 'vitest'
import { atmosphereState } from '../src/engine/render/atmosphereState'
import { bodyPickSize, bodyPointSize, bodyVisualScale, starBrightness, SUN_DAY_GLOW_SCALE, SUN_GLOW_SCALE } from '../src/engine/render/bodyAppearance'

describe('body appearance', () => {
  it('preserves the Sun and Moon visual scale', () => {
    expect(bodyVisualScale('sun', 10)).toBe(1)
    expect(bodyVisualScale('moon', -10)).toBe(1)
  })

  it('clamps planet scale and daylight values', () => {
    expect(bodyVisualScale('mars', 20)).toBe(0.7)
    expect(bodyPointSize('mars', 1)).toBeGreaterThan(0)
    expect(starBrightness(20)).toBe(0)
    expect(atmosphereState(-20, 0, true).daylight).toBe(0)
    expect(atmosphereState(20, 0, true).daylight).toBe(1)
  })

  it('keeps planets smaller than the Moon and Sun disc', () => {
    expect(bodyPointSize('venus', -4)).toBeLessThan(bodyPointSize('moon', -12))
    expect(bodyPointSize('jupiter', -2)).toBeLessThan(bodyPointSize('moon', -12))
    expect(bodyPointSize('sun', -26)).toBeGreaterThan(bodyPointSize('moon', -12))
    expect(bodyPointSize('sun', -26)).toBeGreaterThan(bodyPointSize('venus', -4) * 2)
  })

  it('gives Saturn a larger pick size than Jupiter because of rings', () => {
    expect(bodyPickSize('saturn', -0.5)).toBeGreaterThan(bodyPickSize('jupiter', -2))
  })

  it('keeps the Sun pick target on the disc instead of the glow', () => {
    expect(SUN_DAY_GLOW_SCALE).toBeGreaterThan(SUN_GLOW_SCALE)
    expect(bodyPickSize('sun', -26)).toBeLessThan(bodyPointSize('sun', -26) * 0.7)
    expect(bodyPickSize('sun', -26)).toBeGreaterThan(bodyPickSize('venus', -4))
    expect(bodyPickSize('sun', -26)).toBeLessThan(bodyPickSize('moon', -12) * 1.6)
  })
})
