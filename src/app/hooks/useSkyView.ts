import { useCallback, useState } from 'react'
import { SKY_FOV_DEG } from '@/engine/render/skyProjection'
import { VIEW_DEFAULT_ALTITUDE, VIEW_DEFAULT_AZIMUTH } from '@/engine/interaction/viewConstraints'
import type { SkyView } from '@/shared/types/sky'

export function useSkyView() {
  const [view, setView] = useState<SkyView>({
    azimuth: VIEW_DEFAULT_AZIMUTH,
    altitude: VIEW_DEFAULT_ALTITUDE,
    fov: SKY_FOV_DEG,
  })
  const onViewChange = useCallback((next: SkyView) => {
    setView(next)
  }, [])
  const resetView = () => setView({
    azimuth: VIEW_DEFAULT_AZIMUTH,
    altitude: VIEW_DEFAULT_ALTITUDE,
    fov: SKY_FOV_DEG,
  })
  return { view, setView, onViewChange, resetView }
}
