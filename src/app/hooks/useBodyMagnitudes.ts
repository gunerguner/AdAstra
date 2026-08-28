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
  /** Worker 首帧快照到达后调用，迫使视星等表按当前时刻重算。 */
  const markBodiesReady = useCallback(() => setEpoch((value) => value + 1), [])

  const bodyMagnitudes = useMemo(() => {
    void epoch
    void currentTimeMs
    void latitude
    void longitude
    return Object.fromEntries(
      interpolateBodySnapshots(bodySnapshotRef.current, simulationRef.current.utcMillis)
        .map((body) => [body.id, body.magnitude]),
    )
  }, [epoch, currentTimeMs, latitude, longitude, bodySnapshotRef, simulationRef])

  return { bodyMagnitudes, markBodiesReady }
}
