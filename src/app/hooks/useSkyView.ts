import { useCallback, useState } from 'react'
import { SKY_FOV_DEG } from '@/engine/render/skyProjection'
import type { SkyView } from '@/shared/types/sky'

export function useSkyView() {
  const [view, setView] = useState<SkyView>({ azimuth: 180, altitude: 0, fov: SKY_FOV_DEG })
  const onViewChange = useCallback((next: SkyView) => {
    setView(next)
  }, [])
  const resetView = () => setView({ azimuth: 180, altitude: 0, fov: SKY_FOV_DEG })
  return { view, setView, onViewChange, resetView }
}
