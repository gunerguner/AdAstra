/** Open-Meteo 城市搜索：按名称返回经纬度和 IANA 时区。 */
import { isAbortError } from '@/shared/errors/appError'

export const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search'
export const GEOCODING_MIN_QUERY_LENGTH = 2
export const GEOCODING_RESULT_COUNT = 8

export type GeocodedPlace = {
  id: string
  name: string
  latitude: number
  longitude: number
  timeZone: string
  regionLabel: string
}

type GeocodingHit = {
  id?: number
  name?: string
  latitude?: number
  longitude?: number
  timezone?: string
  feature_code?: string
  country?: string
  admin1?: string
}

type GeocodingResponse = {
  results?: GeocodingHit[]
  error?: boolean
  reason?: string
}

export function geocodingLanguage(query: string): 'zh' | 'en' {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(query) ? 'zh' : 'en'
}

function isPopulatedPlace(featureCode: string | undefined) {
  return !featureCode || featureCode.startsWith('PPL')
}

function finiteCoordinate(value: number | undefined, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function mapGeocodingHits(hits: GeocodingHit[]): GeocodedPlace[] {
  const places: GeocodedPlace[] = []
  for (const hit of hits) {
    if (!isPopulatedPlace(hit.feature_code)) continue
    if (typeof hit.id !== 'number' || typeof hit.name !== 'string' || !hit.name.trim()) continue
    if (!finiteCoordinate(hit.latitude, -90, 90) || !finiteCoordinate(hit.longitude, -180, 180)) continue
    if (typeof hit.timezone !== 'string' || !hit.timezone) continue
    places.push({
      id: `geonames:${hit.id}`,
      name: hit.name.trim(),
      latitude: hit.latitude,
      longitude: hit.longitude,
      timeZone: hit.timezone,
      regionLabel: [hit.admin1, hit.country].filter(Boolean).join(' · '),
    })
  }
  return places
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<GeocodedPlace[]> {
  const name = query.trim()
  if (name.length < GEOCODING_MIN_QUERY_LENGTH) return []

  const url = new URL(GEOCODING_ENDPOINT)
  url.searchParams.set('name', name)
  url.searchParams.set('count', String(GEOCODING_RESULT_COUNT))
  url.searchParams.set('language', geocodingLanguage(name))
  url.searchParams.set('format', 'json')

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new Error('geocoding unreachable')
  }

  if (!response.ok) throw new Error(`geocoding http ${response.status}`)

  let payload: GeocodingResponse
  try {
    payload = await response.json() as GeocodingResponse
  } catch {
    throw new Error('geocoding invalid json')
  }
  if (payload.error) throw new Error(payload.reason ?? 'geocoding error')
  return mapGeocodingHits(payload.results ?? [])
}
