import { describe, expect, it } from 'vitest'
import { resolveObserver } from '../src/app/hooks/useObserver'
import { cities } from '../src/data/cities'
import { defaultLayers } from '../src/config/defaultLayers'
import { layerToggles } from '../src/config/layerToggles'
import { playbackSpeeds } from '../src/config/playbackSpeeds'
import { TIMELINE_RANGE_HOURS, TIMELINE_RANGE_MS } from '../src/config/timeline'

describe('application configuration', () => {
  it('uses custom coordinates while retaining the city time zone', () => {
    const observer = resolveObserver(cities[0], { latitude: 1, longitude: 2 })
    expect(observer).toMatchObject({
      name: '自定义坐标',
      latitude: 1,
      longitude: 2,
      timeZone: cities[0].timeZone,
    })
  })

  it('keeps the default visible layers and supported controls', () => {
    expect(defaultLayers.stars).toBe(true)
    expect(defaultLayers.landscape).toBe(true)
    expect(layerToggles.some((item) => item.key === 'ecliptic')).toBe(true)
    expect(layerToggles.some((item) => item.key === 'landscape')).toBe(true)
    expect(playbackSpeeds.map((item) => item.value)).toContain(240)
  })

  it('uses an eight-hour timeline window', () => {
    expect(TIMELINE_RANGE_HOURS).toBe(8)
    expect(TIMELINE_RANGE_MS).toBe(8 * 60 * 60 * 1000)
  })
})
