import { describe, expect, it } from 'vitest'
import {
  atmospherePhase,
  atmospherePhaseLabel,
  atmosphereState,
  daylightFactor,
} from '../src/engine/render/bodyAppearance'

describe('atmosphere state', () => {
  it('maps solar altitude into continuous twilight phases', () => {
    expect(atmospherePhase(-20, true)).toBe('night')
    expect(atmospherePhase(-15, true)).toBe('astronomical')
    expect(atmospherePhase(-9, true)).toBe('nautical')
    expect(atmospherePhase(-3, true)).toBe('civil')
    expect(atmospherePhase(12, true)).toBe('day')
    expect(atmospherePhase(12, false)).toBe('night')
  })

  it('keeps daylight continuous across one-degree steps', () => {
    let previous = daylightFactor(-18, true)
    for (let altitude = -17; altitude <= 8; altitude += 1) {
      const next = daylightFactor(altitude, true)
      expect(Math.abs(next - previous)).toBeLessThan(0.07)
      previous = next
    }
  })

  it('falls back to a stable night sky when daylight is disabled', () => {
    const state = atmosphereState(40, 120, false)
    expect(state.daylight).toBe(0)
    expect(state.twilight).toBe(0)
    expect(state.phase).toBe('night')
    expect(state.groundLight).toBeLessThan(0.1)
  })

  it('builds a unit sun direction from altitude and azimuth', () => {
    const north = atmosphereState(0, 0, true)
    expect(north.sunDirX).toBeCloseTo(0, 5)
    expect(north.sunDirY).toBeCloseTo(0, 5)
    expect(north.sunDirZ).toBeCloseTo(1, 5)
    const east = atmosphereState(0, 90, true)
    expect(east.sunDirX).toBeCloseTo(1, 5)
    expect(east.sunDirZ).toBeCloseTo(0, 5)
    const zenith = atmosphereState(90, 12, true)
    expect(zenith.sunDirY).toBeCloseTo(1, 5)
    const length = Math.hypot(east.sunDirX, east.sunDirY, east.sunDirZ)
    expect(length).toBeCloseTo(1, 5)
  })

  it('labels phases in Chinese', () => {
    expect(atmospherePhaseLabel('civil')).toBe('民用曙暮光')
    expect(atmospherePhaseLabel('night')).toBe('夜晚')
  })
})
