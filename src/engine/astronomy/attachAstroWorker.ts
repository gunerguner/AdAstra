/** 创建天文计算 Worker：节流发 snapshot、只接受最新 generation、页面隐藏时不请求。 */
import type { Observer } from '@/shared/types/observer'
import { AppError } from '@/shared/errors/appError'
import type { BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import {
  type AstroWorkerRequest,
  type AstroWorkerResponse,
} from '@/engine/astronomy/astroWorkerProtocol'

const BODY_SNAPSHOT_MIN_INTERVAL_MS = 120
const BODY_SNAPSHOT_LOOKAHEAD_MS = 6 * 60 * 60 * 1000

type BodySnapshotRequestState = {
  at: number
  utcMillis: number
  latitude: number
  longitude: number
}

/** 判断这一帧要不要再向 Worker 要采样窗口（最短间隔、地点/时间是否变了）。 */
function shouldRequestBodySnapshot(
  now: number,
  utcMillis: number,
  observer: Observer,
  last: BodySnapshotRequestState | null,
  hidden: boolean,
) {
  if (hidden) return false
  if (last && now - last.at < BODY_SNAPSHOT_MIN_INTERVAL_MS) return false
  if (
    last
    && last.utcMillis === utcMillis
    && last.latitude === observer.latitude
    && last.longitude === observer.longitude
  ) return false
  return true
}

export function attachAstroWorker(handlers: {
  onSnapshot: (window: BodySnapshotWindow) => void
  onError: (error: AppError) => void
}) {
  const worker = new Worker(new URL('../../workers/astronomy.worker.ts', import.meta.url), { type: 'module' })
  let bodyGeneration = 0
  let lastRequest: BodySnapshotRequestState | null = null

  worker.onmessage = (event: MessageEvent<AstroWorkerResponse>) => {
    if (event.data.generation !== bodyGeneration) return
    if (event.data.type === 'error') {
      handlers.onError(new AppError('worker', 'error.worker.failed', { retryable: true, cause: event.data.message }))
      return
    }
    handlers.onSnapshot(event.data.window)
  }
  worker.onerror = (event) => {
    event.preventDefault()
    handlers.onError(new AppError('worker', 'error.worker.thread', { cause: event.error, retryable: true }))
  }

  return {
    requestSnapshot(now: number, utcMillis: number, observer: Observer) {
      if (!shouldRequestBodySnapshot(now, utcMillis, observer, lastRequest, document.hidden)) return
      bodyGeneration += 1
      lastRequest = {
        at: now,
        utcMillis,
        latitude: observer.latitude,
        longitude: observer.longitude,
      }
      const request: AstroWorkerRequest = {
        type: 'snapshot',
        generation: bodyGeneration,
        utcMillis,
        lookAheadMillis: BODY_SNAPSHOT_LOOKAHEAD_MS,
        observer,
      }
      worker.postMessage(request)
    },
    terminate() {
      worker.terminate()
    },
  }
}
