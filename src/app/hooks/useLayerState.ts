/** 图层开关。toggleLayer 按 key 翻转一项，并写回本地偏好。 */
import { useEffect, useState } from 'react'
import { readSkyPreferences, sanitizeLayers, writeSkyPreferences } from '@/app/preferences/skyPreferences'
import type { LayerState } from '@/shared/types/sky'

export function useLayerState() {
  const [layers, setLayers] = useState(() => sanitizeLayers(readSkyPreferences()?.layers))
  useEffect(() => {
    writeSkyPreferences({ layers })
  }, [layers])
  const toggleLayer = (key: keyof LayerState) => {
    setLayers((value) => ({ ...value, [key]: !value[key] }))
  }
  return { layers, toggleLayer }
}
