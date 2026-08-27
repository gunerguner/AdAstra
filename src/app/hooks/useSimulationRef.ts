import { useRef, type RefObject } from 'react'
import type { LayerState, SkySimulation, SkyView } from '@/shared/types/sky'

/**
 * 每帧共享的 SkySimulation。渲染循环直接读 ref，不经 React 重渲染；
 * 观测点、星等上限、图层、视角在每次提交后同步进 ref，utcMillis 只由时钟写入。
 */
export function useSimulationRef(options: {
  latitude: number
  longitude: number
  magnitudeLimit: number
  layers: LayerState
  view: SkyView
}): RefObject<SkySimulation> {
  const { latitude, longitude, magnitudeLimit, layers, view } = options
  const simulationRef = useRef<SkySimulation>({
    utcMillis: Date.now(),
    observer: { latitude, longitude },
    magnitudeLimit,
    layers,
    view: { ...view },
  })
  Object.assign(simulationRef.current, {
    observer: { latitude, longitude },
    magnitudeLimit,
    layers,
  })
  Object.assign(simulationRef.current.view, view)
  return simulationRef
}
