import { useState } from 'react'
import { cities, defaultCityIndex } from '@/data/cities'
import { clamp } from '@/shared/math'

export function resolveObserver(
  city: (typeof cities)[number],
  manualPosition: { latitude: number; longitude: number } | null,
) {
  return manualPosition
    ? { ...city, ...manualPosition, custom: true as const }
    : { ...city, custom: false as const }
}

export function useObserver() {
  const [activeCityIndex, setActiveCityIndex] = useState(defaultCityIndex)
  const [manualPosition, setManualPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const selectedCity = cities[activeCityIndex]
  const observer = resolveObserver(selectedCity, manualPosition)

  return {
    cities,
    activeCityIndex,
    observer,
    setCity: (index: number) => {
      setManualPosition(null)
      setActiveCityIndex(index)
    },
    setLatitude: (latitude: number) => {
      setManualPosition((value) => ({
        latitude: clamp(latitude, -90, 90),
        longitude: value?.longitude ?? selectedCity.longitude,
      }))
    },
    setLongitude: (longitude: number) => {
      setManualPosition((value) => ({
        latitude: value?.latitude ?? selectedCity.latitude,
        longitude: clamp(longitude, -180, 180),
      }))
    },
  }
}
