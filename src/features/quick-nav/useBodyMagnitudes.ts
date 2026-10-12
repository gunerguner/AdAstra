import { useCallback, useEffect, useState, type RefObject } from 'react'
import {
  interpolateBodySnapshots,
  type BodySnapshotWindow,
} from '@/engine/astronomy/bodyInterpolation'
import type { SkySimulation } from '@/shared/types/sky'

/** 播放中刷新导航星等的间隔。星等变化慢，不必跟播放时钟走。 */
const PLAYBACK_REFRESH_MS = 2000

/**
 * 各天体当前视星等。每次渲染按 ref 现算；
 * 快照到达或播放中的定时器只负责触发这次重渲染。
 */
export function useBodyMagnitudes(options: {
  bodySnapshotRef: RefObject<BodySnapshotWindow | null>
  simulationRef: RefObject<SkySimulation>
  isPlaying: boolean
}) {
  const { bodySnapshotRef, simulationRef, isPlaying } = options
  const [, setEpoch] = useState(0)
  const refresh = useCallback(() => setEpoch((value) => value + 1), [])

  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setInterval(refresh, PLAYBACK_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [isPlaying, refresh])

  const bodyMagnitudes = Object.fromEntries(
    interpolateBodySnapshots(bodySnapshotRef.current, simulationRef.current.utcMillis)
      .map((body) => [body.id, body.magnitude]),
  )

  return { bodyMagnitudes, refresh }
}
