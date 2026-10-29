import { describe, expect, it } from 'vitest'
import { syncAtmosphereUniforms } from '@/engine/render/syncAtmosphereUniforms'
import { testSkyUniforms } from './testSkyUniforms'

const observer = { latitude: 31.2304, longitude: 121.4737 }

function cache() {
  return { lastSunAltitude: Number.NaN, lastSunAzimuth: Number.NaN, lastUiPhase: '' }
}

function sync(uniforms = testSkyUniforms(), utc = Date.parse('2026-10-29T04:00:00Z'), state = cache()) {
  syncAtmosphereUniforms({
    uniforms,
    utcMillis: utc,
    observer,
    daylightEffect: true,
    layersChanged: false,
    cache: state,
  })
  return state
}

describe('昼夜 uniform', () => {
  it('上海当地正午是白天，午夜是夜晚', () => {
    const noon = testSkyUniforms()
    sync(noon, Date.parse('2026-10-29T04:00:00Z'))
    expect(noon.daylight.value).toBe(1)

    const midnight = testSkyUniforms()
    sync(midnight, Date.parse('2026-10-29T16:00:00Z'))
    expect(midnight.daylight.value).toBe(0)
  })

  it('时刻前进半天，昼夜跟着翻转', () => {
    const uniforms = testSkyUniforms()
    const state = cache()
    sync(uniforms, Date.parse('2026-10-29T04:00:00Z'), state)
    expect(uniforms.daylight.value).toBe(1)
    sync(uniforms, Date.parse('2026-10-30T16:00:00Z'), state)
    expect(uniforms.daylight.value).toBe(0)
    expect(state.lastSunAltitude).toBeLessThan(-12)
  })

  it('同一时刻重复同步不重复写 uniform', () => {
    const uniforms = testSkyUniforms()
    const state = sync(uniforms)
    uniforms.daylight.value = 123
    syncAtmosphereUniforms({
      uniforms,
      utcMillis: Date.parse('2026-10-29T04:00:00Z'),
      observer,
      daylightEffect: true,
      layersChanged: false,
      cache: state,
    })
    expect(uniforms.daylight.value).toBe(123)
  })

  it('昼夜效果关闭时恒为夜晚', () => {
    const uniforms = testSkyUniforms()
    syncAtmosphereUniforms({
      uniforms,
      utcMillis: Date.parse('2026-10-29T04:00:00Z'),
      observer,
      daylightEffect: false,
      layersChanged: false,
      cache: cache(),
    })
    expect(uniforms.daylight.value).toBe(0)
  })
})
