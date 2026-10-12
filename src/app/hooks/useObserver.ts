import { useCallback, useEffect, useRef, useState } from 'react'
import { readSkyPreferences, writeSkyPreferences, type StoredPlace } from '@/app/preferences/skyPreferences'
import { cities, defaultCityIndex, type City } from '@/data/cities'
import {
  GEOLOCATION_PLACE_ID,
  requestCurrentPosition,
  toGeolocationPlace,
  type GeolocationResult,
} from '@/engine/location/geolocationService'
import { clamp } from '@/shared/math'

/** 观测点：预置城市、搜索结果或浏览器定位，可再手动改经纬度。 */

export type ObserverPlace = City
/** resolveObserver 的产物：城市/定位点加上是否手动定位的 custom 标记。 */
export type ResolvedObserver = ObserverPlace & { custom: boolean }
export type LocateStatus = 'pending' | 'ready' | 'denied' | 'unavailable'

/** 有手动经纬度则盖在城市上，并标 custom。 */
export function resolveObserver(
  city: ObserverPlace,
  manualPosition: { latitude: number; longitude: number } | null,
): ResolvedObserver {
  return manualPosition
    ? { ...city, ...manualPosition, custom: true as const }
    : { ...city, custom: false as const }
}

function restoredPlace(): StoredPlace | null {
  return readSkyPreferences()?.place ?? null
}

function placeFromStored(place: StoredPlace): ObserverPlace {
  return {
    id: place.id,
    names: place.names,
    latitude: place.latitude,
    longitude: place.longitude,
    timeZone: place.timeZone,
  }
}

/** 城市选择、搜索地点、浏览器定位和手动经纬度。有上次地点时不再自动改写。 */
export function useObserver() {
  const restored = useState<StoredPlace | null>(restoredPlace)[0]
  const presetIndex = restored ? cities.findIndex((city) => city.id === restored.id) : -1
  const [activeCityIndex, setActiveCityIndex] = useState(presetIndex >= 0 ? presetIndex : defaultCityIndex)
  const [searchedPlace, setSearchedPlace] = useState<ObserverPlace | null>(
    restored && presetIndex < 0 ? placeFromStored(restored) : null,
  )
  const [manualPosition, setManualPosition] = useState<{ latitude: number; longitude: number } | null>(restored?.manual ?? null)
  const [locateStatus, setLocateStatus] = useState<LocateStatus>(restored ? 'ready' : 'pending')
  const userChosePlaceRef = useRef(restored !== null)
  const geolocatedPlaceRef = useRef<ObserverPlace | null>(null)
  const requestIdRef = useRef(0)

  const selectedCity = searchedPlace ?? cities[activeCityIndex]
  const observer = resolveObserver(selectedCity, manualPosition)
  const isAtGeolocation = observer.id === GEOLOCATION_PLACE_ID && !observer.custom

  const applyResult = useCallback((result: GeolocationResult, force: boolean) => {
    if (result.ok) {
      const place = toGeolocationPlace(result)
      geolocatedPlaceRef.current = place
      if (force || !userChosePlaceRef.current) {
        setManualPosition(null)
        setSearchedPlace(place)
      }
      setLocateStatus('ready')
      return
    }
    if (force || !userChosePlaceRef.current) {
      setManualPosition(null)
      setSearchedPlace(null)
      setActiveCityIndex(defaultCityIndex)
    }
    setLocateStatus(result.reason === 'denied' ? 'denied' : 'unavailable')
  }, [])

  const requestLocation = useCallback((force: boolean) => {
    if (force) {
      userChosePlaceRef.current = false
      const cached = geolocatedPlaceRef.current
      if (cached) {
        setManualPosition(null)
        setSearchedPlace(cached)
      }
    }
    const requestId = ++requestIdRef.current
    setLocateStatus('pending')
    void requestCurrentPosition().then((result) => {
      if (requestId !== requestIdRef.current) return
      applyResult(result, force)
    })
  }, [applyResult])

  useEffect(() => {
    if (userChosePlaceRef.current) return
    requestLocation(false)
  }, [requestLocation])

  useEffect(() => {
    if (locateStatus === 'pending' && !userChosePlaceRef.current) return
    writeSkyPreferences({
      place: {
        id: selectedCity.id,
        names: selectedCity.names,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        timeZone: selectedCity.timeZone,
        manual: manualPosition,
      },
    })
  }, [selectedCity, manualPosition, locateStatus])

  return {
    cities,
    observer,
    locateStatus,
    isAtGeolocation,
    setCity: (index: number) => {
      userChosePlaceRef.current = true
      setSearchedPlace(null)
      setManualPosition(null)
      setActiveCityIndex(index)
    },
    setPlace: (place: ObserverPlace) => {
      userChosePlaceRef.current = true
      setManualPosition(null)
      setSearchedPlace(place)
    },
    setLatitude: (latitude: number) => {
      userChosePlaceRef.current = true
      setManualPosition((value) => ({
        latitude: clamp(latitude, -90, 90),
        longitude: value?.longitude ?? selectedCity.longitude,
      }))
    },
    setLongitude: (longitude: number) => {
      userChosePlaceRef.current = true
      setManualPosition((value) => ({
        latitude: value?.latitude ?? selectedCity.latitude,
        longitude: clamp(longitude, -180, 180),
      }))
    },
    locateHere: () => requestLocation(true),
  }
}
