/** 相机朝向 React state。高频拖拽走 simulation ref，这里只做低频同步，并记住上次视角。 */
import { useEffect, useState } from 'react'
import { readSkyPreferences, sanitizeView, writeSkyPreferences } from '@/app/preferences/skyPreferences'
import { SKY_FOV_DEG } from '@/engine/render/skyProjection'
import { VIEW_DEFAULT_ALTITUDE, VIEW_DEFAULT_AZIMUTH } from '@/engine/interaction/viewConstraints'
import type { SkyView } from '@/shared/types/sky'

const DEFAULT_VIEW: SkyView = {
  azimuth: VIEW_DEFAULT_AZIMUTH,
  altitude: VIEW_DEFAULT_ALTITUDE,
  fov: SKY_FOV_DEG,
}

export function useSkyView() {
  const [view, setView] = useState<SkyView>(() => sanitizeView(readSkyPreferences()?.view) ?? DEFAULT_VIEW)
  useEffect(() => {
    writeSkyPreferences({ view })
  }, [view])
  const resetView = () => setView(DEFAULT_VIEW)
  return { view, setView, resetView }
}
