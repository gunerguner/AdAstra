import { defaultLayers } from '@/config'
import { clampViewAltitude } from '@/engine/interaction/viewConstraints'
import { clampSkyFov } from '@/engine/render/skyProjection'
import { wrapDegrees } from '@/shared/math'
import type { LayerState, SkyView } from '@/shared/types/sky'

const STORAGE_KEY = 'adastra.preferences'

export type StoredPlace = {
  id: string
  names: { zh: string; en: string }
  latitude: number
  longitude: number
  timeZone: string
  manual: { latitude: number; longitude: number } | null
}

export type SkyPreferences = {
  layers?: LayerState
  view?: SkyView
  place?: StoredPlace
}

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>

function storageOf(storage?: PreferenceStorage): PreferenceStorage | null {
  if (storage) return storage
  try {
    return localStorage
  } catch {
    return null
  }
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function readPlace(value: unknown): StoredPlace | undefined {
  if (!value || typeof value !== 'object') return undefined
  const place = value as Partial<StoredPlace>
  const names = place.names
  if (
    typeof place.id !== 'string'
    || !names || typeof names.zh !== 'string' || typeof names.en !== 'string'
    || !finite(place.latitude) || !finite(place.longitude)
    || typeof place.timeZone !== 'string'
  ) return undefined
  let manual: StoredPlace['manual'] = null
  if (place.manual) {
    if (!finite(place.manual.latitude) || !finite(place.manual.longitude)) return undefined
    manual = { latitude: place.manual.latitude, longitude: place.manual.longitude }
  }
  return {
    id: place.id,
    names: { zh: names.zh, en: names.en },
    latitude: place.latitude,
    longitude: place.longitude,
    timeZone: place.timeZone,
    manual,
  }
}

/** 缺字段用默认图层补上，非布尔值忽略。 */
export function sanitizeLayers(value: unknown): LayerState {
  const layers: LayerState = { ...defaultLayers }
  if (!value || typeof value !== 'object') return layers
  const source = value as Record<string, unknown>
  for (const key of Object.keys(defaultLayers) as (keyof LayerState)[]) {
    if (typeof source[key] === 'boolean') layers[key] = source[key]
  }
  return layers
}

/** 方位、仰角、视场不合法时返回 null，调用方用默认视角。 */
export function sanitizeView(value: unknown): SkyView | null {
  if (!value || typeof value !== 'object') return null
  const view = value as Partial<SkyView>
  if (!finite(view.azimuth) || !finite(view.altitude) || !finite(view.fov)) return null
  return {
    azimuth: wrapDegrees(view.azimuth),
    altitude: clampViewAltitude(view.altitude),
    fov: clampSkyFov(view.fov),
  }
}

export function readSkyPreferences(storage?: PreferenceStorage): SkyPreferences | null {
  const store = storageOf(storage)
  if (!store) return null
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SkyPreferences>
    if (!parsed || typeof parsed !== 'object') return null
    const preferences: SkyPreferences = {}
    if (parsed.layers) preferences.layers = sanitizeLayers(parsed.layers)
    const view = sanitizeView(parsed.view)
    if (view) preferences.view = view
    const place = readPlace(parsed.place)
    if (place) preferences.place = place
    return preferences
  } catch {
    return null
  }
}

/** 合并写入，避免只改图层时把地点冲掉。 */
export function writeSkyPreferences(patch: SkyPreferences, storage?: PreferenceStorage) {
  const store = storageOf(storage)
  if (!store) return
  try {
    const current = readSkyPreferences(store) ?? {}
    store.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // 隐私模式或配额满时继续用内存状态。
  }
}
