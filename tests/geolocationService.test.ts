import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GEOLOCATION_TIMEOUT_MS,
  mapGeolocationError,
  requestCurrentPosition,
  toGeolocationPlace,
} from '@/engine/location/geolocationService'

afterEach(() => vi.unstubAllGlobals())

function stubGeolocation(getCurrentPosition: Geolocation['getCurrentPosition'] | undefined) {
  vi.stubGlobal('navigator', getCurrentPosition ? { geolocation: { getCurrentPosition } } : {})
}

describe('geolocationService', () => {
  it('builds a current-location place with the given time zone', () => {
    expect(toGeolocationPlace({ latitude: 31.23, longitude: 121.47 }, 'Asia/Shanghai')).toEqual({
      id: 'geolocation',
      names: { zh: '当前位置', en: 'Current location' },
      latitude: 31.23,
      longitude: 121.47,
      timeZone: 'Asia/Shanghai',
    })
  })

  it('maps permission denial separately from other geolocation errors', () => {
    expect(mapGeolocationError(1)).toBe('denied')
    expect(mapGeolocationError(2)).toBe('unavailable')
    expect(mapGeolocationError(3)).toBe('unavailable')
    expect(mapGeolocationError(undefined)).toBe('unavailable')
  })

  it('returns unsupported when the geolocation API is missing', async () => {
    stubGeolocation(undefined)
    await expect(requestCurrentPosition()).resolves.toEqual({ ok: false, reason: 'unsupported' })
  })

  it('returns coordinates when positioning succeeds', async () => {
    stubGeolocation((success) => {
      success({
        coords: { latitude: 30.2741, longitude: 120.1551, accuracy: 20 },
        timestamp: 0,
      } as GeolocationPosition)
    })
    await expect(requestCurrentPosition()).resolves.toEqual({
      ok: true,
      latitude: 30.2741,
      longitude: 120.1551,
    })
  })

  it('passes a low-accuracy timeout to the browser API', async () => {
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success) => {
      success({
        coords: { latitude: 0, longitude: 0, accuracy: 1 },
        timestamp: 0,
      } as GeolocationPosition)
    })
    stubGeolocation(getCurrentPosition)
    await requestCurrentPosition()
    expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual({
      enableHighAccuracy: false,
      timeout: GEOLOCATION_TIMEOUT_MS,
      maximumAge: 300_000,
    })
  })

  it('rejects out-of-range coordinates', async () => {
    stubGeolocation((success) => {
      success({
        coords: { latitude: 200, longitude: 0, accuracy: 1 },
        timestamp: 0,
      } as GeolocationPosition)
    })
    await expect(requestCurrentPosition()).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('returns denied when permission is refused', async () => {
    stubGeolocation((_success, error) => {
      error?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 })
    })
    await expect(requestCurrentPosition()).resolves.toEqual({ ok: false, reason: 'denied' })
  })

  it('returns unavailable when positioning times out', async () => {
    stubGeolocation((_success, error) => {
      error?.({ code: 3, message: 'timeout', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 })
    })
    await expect(requestCurrentPosition()).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })
})
