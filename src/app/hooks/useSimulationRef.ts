import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { LayerState, SkySimulation, SkyView } from '@/shared/types/sky'
import { syncReactView } from './syncReactView'

/**
 * 每帧共享的 SkySimulation。渲染循环直接读 ref，不经 React 重渲染。
 * 观测点、星等上限、图层和视角在绘制前写入，避免渲染阶段产生副作用。
 * 视角只在 setView 换了新对象时写入，拖拽中的 ref 不会被旧 state 盖掉。utcMillis 只由时钟写入。
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
  const reactView = useRef(view)

  useLayoutEffect(() => {
    Object.assign(simulationRef.current, {
      observer: { latitude, longitude },
      magnitudeLimit,
      layers,
    })
    syncReactView(simulationRef.current.view, reactView, view)
  })

  return simulationRef
}
