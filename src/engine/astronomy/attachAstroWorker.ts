/** 创建天文计算 Worker：节流发 snapshot、只接受最新 generation、页面隐藏时不请求。 */
import type { Observer } from '@/shared/types/observer'
import { AppError } from '@/shared/errors/appError'
import type { BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import {
  type AstroWorkerRequest,
  type AstroWorkerResponse,
} from '@/engine/astronomy/astroWorkerProtocol'
import { shouldRequestBodySnapshot, BODY_SNAPSHOT_LOOKAHEAD_MS, type BodySnapshotRequestState } from '@/engine/astronomy/bodySnapshotRequest'

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
      handlers.onError(new AppError('worker', event.data.message, { retryable: true }))
      return
    }
    handlers.onSnapshot(event.data.window)
  }
  worker.onerror = (event) => {
    event.preventDefault()
    handlers.onError(new AppError('worker', '天体计算线程异常', { cause: event.error, retryable: true }))
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
