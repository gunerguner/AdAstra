import { describe, expect, it } from 'vitest'
import { resolveObserver } from '../src/app/hooks/useObserver'
import { cities } from '../src/data/cities'
import { toGeolocationPlace } from '../src/engine/location/geolocationService'
import { defaultLayers } from '../src/config/defaultLayers'
import { layerToggles } from '../src/config/layerToggles'
import { playbackSpeeds, defaultPlaybackSpeed } from '../src/config/playbackSpeeds'
import { TIMELINE_RANGE_HOURS, TIMELINE_RANGE_MS } from '../src/config/timeline'

describe('application configuration', () => {
  it('uses custom coordinates while retaining the city time zone', () => {
    const observer = resolveObserver(cities[0], { latitude: 1, longitude: 2 })
    expect(observer).toMatchObject({
      custom: true,
      latitude: 1,
      longitude: 2,
      timeZone: cities[0].timeZone,
    })
  })

  it('keeps geolocation coordinates and the device time zone', () => {
    const place = toGeolocationPlace({ latitude: 30.2741, longitude: 120.1551 }, 'Asia/Shanghai')
    expect(resolveObserver(place, null)).toMatchObject({
      custom: false,
      id: 'geolocation',
      latitude: 30.2741,
      longitude: 120.1551,
      timeZone: 'Asia/Shanghai',
    })
  })

  it('keeps a searched city time zone when coordinates are edited', () => {
    const hangzhou = {
      id: 'geonames:1808926',
      names: { zh: '杭州', en: 'Hangzhou' },
      latitude: 30.29365,
      longitude: 120.16142,
      timeZone: 'Asia/Shanghai',
    }
    expect(resolveObserver(hangzhou, null)).toMatchObject({ custom: false, latitude: 30.29365 })
    expect(resolveObserver(hangzhou, { latitude: 31, longitude: 121 })).toMatchObject({
      custom: true,
      latitude: 31,
      longitude: 121,
      timeZone: 'Asia/Shanghai',
    })
  })

  it('keeps the default visible layers and supported controls', () => {
    expect(defaultLayers.stars).toBe(true)
    expect(defaultLayers.landscape).toBe(true)
    expect(layerToggles.some((item) => item.key === 'ecliptic')).toBe(true)
    expect(layerToggles.some((item) => item.key === 'landscape')).toBe(true)
    expect(playbackSpeeds.map((item) => item.value)).toContain(defaultPlaybackSpeed)
  })

  it('uses an eight-hour timeline window', () => {
    expect(TIMELINE_RANGE_HOURS).toBe(8)
    expect(TIMELINE_RANGE_MS).toBe(8 * 60 * 60 * 1000)
  })
})
