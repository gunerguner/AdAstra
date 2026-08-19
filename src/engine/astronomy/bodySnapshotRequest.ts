/** 判断这一帧要不要再向 Worker 要采样窗口（最短间隔、地点/时间是否变了）。 */
import type { Observer } from '@/shared/types/observer'

export type BodySnapshotRequestState = {
  at: number
  utcMillis: number
  latitude: number
  longitude: number
}

export const BODY_SNAPSHOT_MIN_INTERVAL_MS = 120
export const BODY_SNAPSHOT_LOOKAHEAD_MS = 6 * 60 * 60 * 1000

export function shouldRequestBodySnapshot(
  now: number,
  utcMillis: number,
  observer: Observer,
  last: BodySnapshotRequestState | null,
  hidden: boolean,
  minIntervalMs = BODY_SNAPSHOT_MIN_INTERVAL_MS,
) {
  if (hidden) return false
  if (last && now - last.at < minIntervalMs) return false
  if (
    last
    && last.utcMillis === utcMillis
    && last.latitude === observer.latitude
    && last.longitude === observer.longitude
  ) return false
  return true
}
