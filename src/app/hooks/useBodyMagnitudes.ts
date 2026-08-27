import { useCallback, useMemo, useState, type RefObject } from 'react'
import {
  interpolateBodySnapshots,
  type BodySnapshotWindow,
} from '@/engine/astronomy/bodyInterpolation'
import type { SkySimulation } from '@/shared/types/sky'

/**
 * 各天体当前视星等表（给 QuickNav 排序/过滤用）。
 * 快照走 ref 不进依赖，由星表就绪时的 markBodiesReady 手动触发重算。
 */
export function useBodyMagnitudes(options: {
  bodySnapshotRef: RefObject<BodySnapshotWindow | null>
  simulationRef: RefObject<SkySimulation>
  currentTimeMs: number
  latitude: number
  longitude: number
}) {
  const { bodySnapshotRef, simulationRef, currentTimeMs, latitude, longitude } = options
  const [epoch, setEpoch] = useState(0)
  const markBodiesReady = useCallback(() => setEpoch((value) => value + 1), [])

  const bodyMagnitudes = useMemo(() => {
    void epoch
    void currentTimeMs
    void latitude
    void longitude
    const magnitudes: Record<string, number> = {}
    for (const body of interpolateBodySnapshots(bodySnapshotRef.current, simulationRef.current.utcMillis)) {
      magnitudes[body.id] = body.magnitude
    }
    return magnitudes
  }, [epoch, currentTimeMs, latitude, longitude, bodySnapshotRef, simulationRef])

  return { bodyMagnitudes, markBodiesReady }
}
