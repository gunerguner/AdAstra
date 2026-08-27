import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GEOCODING_ENDPOINT,
  geocodingLanguage,
  mapGeocodingHits,
  searchCities,
} from '../src/engine/location/geocodingService'

afterEach(() => vi.unstubAllGlobals())

function requestedUrl(fetch: ReturnType<typeof vi.fn>) {
  const calls = fetch.mock.calls as unknown[][]
  const input = calls[0]?.[0]
  if (input === undefined) throw new Error('fetch was not called')
  return new URL(String(input))
}

const hangzhou = {
  id: 1808926,
  name: 'Hangzhou',
  latitude: 30.29365,
  longitude: 120.16142,
  timezone: 'Asia/Shanghai',
  feature_code: 'PPLA',
  country: 'China',
  admin1: 'Zhejiang',
}

describe('geocodingService', () => {
  it('uses English for Latin queries and Chinese for CJK queries', () => {
    expect(geocodingLanguage('Hangzhou')).toBe('en')
    expect(geocodingLanguage('New York')).toBe('en')
    expect(geocodingLanguage('杭州')).toBe('zh')
    expect(geocodingLanguage('東京')).toBe('zh')
  })

  it('drops airports and incomplete hits', () => {
    expect(mapGeocodingHits([
      hangzhou,
      { ...hangzhou, id: 6301383, name: 'Hangzhou Xiaoshan International Airport', feature_code: 'AIRP' },
      { ...hangzhou, id: 1, name: 'Nowhere', timezone: undefined },
      { ...hangzhou, id: 2, latitude: 200 },
    ])).toEqual([{
      id: 'geonames:1808926',
      name: 'Hangzhou',
      latitude: 30.29365,
      longitude: 120.16142,
      timeZone: 'Asia/Shanghai',
      regionLabel: 'Zhejiang · China',
    }])
  })

  it('returns an empty list for short queries without fetching', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(searchCities('H')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requests English language for New York so the city ranks first', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ results: [hangzhou] })))
    vi.stubGlobal('fetch', fetch)
    await searchCities('New York')
    const url = requestedUrl(fetch)
    expect(url.origin + url.pathname).toBe(GEOCODING_ENDPOINT)
    expect(url.searchParams.get('name')).toBe('New York')
    expect(url.searchParams.get('language')).toBe('en')
    expect(url.searchParams.get('count')).toBe('8')
  })

  it('requests Chinese language for CJK queries', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ results: [] })))
    vi.stubGlobal('fetch', fetch)
    await expect(searchCities('杭州')).resolves.toEqual([])
    expect(requestedUrl(fetch).searchParams.get('language')).toBe('zh')
  })

  it('treats a missing results field as an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ generationtime_ms: 0.1 }))))
    await expect(searchCities('Nowhereville')).resolves.toEqual([])
  })

  it('throws on HTTP errors without changing caller state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 502 })))
    await expect(searchCities('Paris')).rejects.toThrow('geocoding http 502')
  })
})
