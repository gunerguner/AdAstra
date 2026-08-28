import type { City } from '@/data/cities'

/** 浏览器定位：把 Geolocation API 收成观测点，失败原因可展示。 */

export const GEOLOCATION_PLACE_ID = 'geolocation'
export const GEOLOCATION_TIMEOUT_MS = 10_000

export type GeolocationCoords = {
  latitude: number
  longitude: number
}

export type GeolocationResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: 'denied' | 'unavailable' | 'unsupported' }

const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: GEOLOCATION_TIMEOUT_MS,
  maximumAge: 300_000,
}

/** 设备 IANA 时区；读不到或空字符串时回退 UTC。 */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 定位成功后的「当前地点」城市记录。 */
export function toGeolocationPlace(
  coords: GeolocationCoords,
  timeZone = deviceTimeZone(),
): City {
  return {
    id: GEOLOCATION_PLACE_ID,
    names: { zh: '当前位置', en: 'Current location' },
    latitude: coords.latitude,
    longitude: coords.longitude,
    timeZone,
  }
}

export function mapGeolocationError(code: number | undefined): 'denied' | 'unavailable' {
  return code === 1 ? 'denied' : 'unavailable'
}

function finiteCoordinate(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max
}

/** 调一次 getCurrentPosition；不支持 / 超时 / 拒绝都收成 ok:false。 */
export function requestCurrentPosition(): Promise<GeolocationResult> {
  const geolocation = globalThis.navigator?.geolocation
  if (!geolocation?.getCurrentPosition) {
    return Promise.resolve({ ok: false, reason: 'unsupported' })
  }

  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        if (!finiteCoordinate(latitude, -90, 90) || !finiteCoordinate(longitude, -180, 180)) {
          resolve({ ok: false, reason: 'unavailable' })
          return
        }
        resolve({ ok: true, latitude, longitude })
      },
      (error) => {
        resolve({ ok: false, reason: mapGeolocationError(error?.code) })
      },
      POSITION_OPTIONS,
    )
  })
}
