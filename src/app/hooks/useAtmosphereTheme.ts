import { useCallback, useLayoutEffect, useState, type RefObject } from 'react'
import { estimateSunHorizontal } from '@/engine/coordinates/skyMath'
import {
  atmosphereState,
  type AtmospherePhase,
  type AtmosphereState,
} from '@/engine/render/atmosphereState'
import type { SkySimulation } from '@/shared/types/sky'

/**
 * 把昼夜状态落到 <html> 上：data-sky-phase 切主题变量，--ui-warmth 混入金色暖光。
 * CSS 端的消费者在 tokens.css 和各组件样式的 color-mix 里。
 */
function syncUiAtmosphere(state: AtmosphereState) {
  const root = document.documentElement
  if (root.dataset.skyPhase !== state.phase) {
    root.dataset.skyPhase = state.phase
  }
  const warmth = (Math.round(state.warmth * 8) / 8).toFixed(3)
  if (root.style.getPropertyValue('--ui-warmth') !== warmth) {
    root.style.setProperty('--ui-warmth', warmth)
  }
}

/** 推算当前昼夜相位并同步 UI；观测点或白天效果开关变化时重算。 */
export function useAtmosphereTheme(options: {
  simulationRef: RefObject<SkySimulation>
  latitude: number
  longitude: number
  daylightEffect: boolean
}) {
  const { simulationRef, latitude, longitude, daylightEffect } = options
  const [phase, setPhase] = useState<AtmospherePhase>(() => {
    const sun = estimateSunHorizontal(Date.now(), { latitude, longitude })
    return atmosphereState(sun.altitude, sun.azimuth, daylightEffect).phase
  })

  const onAtmosphereChange = useCallback((state: AtmosphereState) => {
    syncUiAtmosphere(state)
    setPhase((current) => (current === state.phase ? current : state.phase))
  }, [])

  useLayoutEffect(() => {
    const sun = estimateSunHorizontal(simulationRef.current.utcMillis, {
      latitude,
      longitude,
    })
    onAtmosphereChange(atmosphereState(sun.altitude, sun.azimuth, daylightEffect))
  }, [simulationRef, onAtmosphereChange, latitude, longitude, daylightEffect])

  return { atmospherePhase: phase, onAtmosphereChange }
}
