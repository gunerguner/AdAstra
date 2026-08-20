import { describe, expect, it } from 'vitest'
import { clamp, degToRad, lerp, lerpDegrees, radToDeg, wrapDegrees } from '../src/shared/math'

describe('shared math', () => {
  it('clamps to inclusive bounds', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
    expect(clamp(2, 0, 1)).toBe(1)
    expect(clamp(0.4, 0, 1)).toBe(0.4)
  })

  it('lerps linearly', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })

  it('wraps degrees including negatives', () => {
    expect(wrapDegrees(370)).toBe(10)
    expect(wrapDegrees(-30)).toBe(330)
  })

  it('lerps degrees along the short arc', () => {
    expect(lerpDegrees(350, 10, 0.5)).toBeCloseTo(0, 5)
  })

  it('converts degrees and radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 10)
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 10)
  })
})
