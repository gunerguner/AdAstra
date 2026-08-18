import { useState } from 'react'
import { defaultLayers } from '@/config/defaultLayers'
import type { LayerState } from '@/shared/types/sky'

export function useLayerState() {
  const [layers, setLayers] = useState(defaultLayers)
  const toggleLayer = (key: keyof LayerState) => {
    setLayers((value) => ({ ...value, [key]: !value[key] }))
  }
  return { layers, toggleLayer }
}
