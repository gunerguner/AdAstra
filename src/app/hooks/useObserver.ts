import { useCallback, useEffect, useRef, useState } from 'react'
import { cities, defaultCityIndex, type City } from '@/data/cities'
import {
  GEOLOCATION_PLACE_ID,
  requestCurrentPosition,
  toGeolocationPlace,
  type GeolocationResult,
} from '@/engine/location/geolocationService'
import { clamp } from '@/shared/math'

export type ObserverPlace = City
/** resolveObserver 的产物：城市/定位点加上是否手动定位的 custom 标记。 */
export type ResolvedObserver = ObserverPlace & { custom: boolean }
export type LocateStatus = 'pending' | 'ready' | 'denied' | 'unavailable'

export function resolveObserver(
  city: ObserverPlace,
  manualPosition: { latitude: number; longitude: number } | null,
): ResolvedObserver {
  return manualPosition
    ? { ...city, ...manualPosition, custom: true as const }
    : { ...city, custom: false as const }
}

export function useObserver() {
  const [activeCityIndex, setActiveCityIndex] = useState(defaultCityIndex)
  const [searchedPlace, setSearchedPlace] = useState<ObserverPlace | null>(null)
  const [manualPosition, setManualPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locateStatus, setLocateStatus] = useState<LocateStatus>('pending')
  const userChosePlaceRef = useRef(false)
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
    requestLocation(false)
  }, [requestLocation])

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
