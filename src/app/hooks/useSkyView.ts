import { useState } from 'react'
import { SKY_FOV_DEG } from '@/engine/render/skyProjection'
import { VIEW_DEFAULT_ALTITUDE, VIEW_DEFAULT_AZIMUTH } from '@/engine/interaction/viewConstraints'
import type { SkyView } from '@/shared/types/sky'

const DEFAULT_VIEW: SkyView = {
  azimuth: VIEW_DEFAULT_AZIMUTH,
  altitude: VIEW_DEFAULT_ALTITUDE,
  fov: SKY_FOV_DEG,
}

export function useSkyView() {
  const [view, setView] = useState<SkyView>(DEFAULT_VIEW)
  const resetView = () => setView(DEFAULT_VIEW)
  return { view, setView, onViewChange: setView, resetView }
}
