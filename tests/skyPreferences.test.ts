import { describe, expect, it } from 'vitest'
import { defaultLayers } from '@/config'
import { readSkyPreferences, sanitizeLayers, writeSkyPreferences } from '@/app/preferences/skyPreferences'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

const place = {
  id: 'london',
  names: { zh: '伦敦', en: 'London' },
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  manual: null,
}

describe('本地星空偏好', () => {
  it('合并保存图层、视角和地点', () => {
    const storage = memoryStorage()
    writeSkyPreferences({ place }, storage)
    writeSkyPreferences({
      layers: { ...defaultLayers, ecliptic: false },
      view: { azimuth: 400, altitude: 120, fov: 10 },
    }, storage)
    const stored = readSkyPreferences(storage)
    expect(stored?.place?.id).toBe('london')
    expect(stored?.layers?.ecliptic).toBe(false)
    expect(stored?.layers?.stars).toBe(true)
    expect(stored?.view).toEqual({ azimuth: 40, altitude: 89, fov: 38 })
  })

  it('坏数据和缺字段回退到默认', () => {
    const storage = memoryStorage()
    storage.setItem('adastra.preferences', '{')
    expect(readSkyPreferences(storage)).toBeNull()
    expect(sanitizeLayers({ stars: 'yes', horizon: false }).horizon).toBe(false)
    expect(sanitizeLayers({ stars: 'yes' }).stars).toBe(true)
  })
})
