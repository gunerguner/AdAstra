import type { Observer } from '@/shared/types/observer'

export type BodySnapshotRequestState = {
  at: number
  utcMillis: number
  latitude: number
  longitude: number
}

export function shouldRequestBodySnapshot(
  now: number,
  utcMillis: number,
  observer: Observer,
  last: BodySnapshotRequestState | null,
  hidden: boolean,
  minIntervalMs = 120,
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
