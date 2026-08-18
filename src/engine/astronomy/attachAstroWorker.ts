import type { Observer } from '@/shared/types/observer'
import { AppError } from '@/shared/errors/appError'
import type { BodySnapshotWindow } from '@/engine/astronomy/astronomyService'

type WorkerMessage = {
  type: 'snapshot' | 'error'
  generation: number
  window?: BodySnapshotWindow
  message?: string
}

export function attachAstroWorker(handlers: {
  onSnapshot: (window: BodySnapshotWindow) => void
  onError: (error: AppError) => void
}) {
  const worker = new Worker(new URL('../../workers/astronomy.worker.ts', import.meta.url), { type: 'module' })
  let bodyGeneration = 0
  let lastBodyRequestAt = -Infinity

  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    if (event.data.generation !== bodyGeneration) return
    if (event.data.type === 'error') {
      handlers.onError(new AppError('worker', event.data.message ?? '天体计算失败', { retryable: true }))
      return
    }
    if (event.data.window) handlers.onSnapshot(event.data.window)
  }
  worker.onerror = (event) => {
    event.preventDefault()
    handlers.onError(new AppError('worker', '天体计算线程异常', { cause: event.error, retryable: true }))
  }

  return {
    requestSnapshot(now: number, utcMillis: number, observer: Observer) {
      if (document.hidden || now - lastBodyRequestAt < 120) return
      bodyGeneration += 1
      lastBodyRequestAt = now
      worker.postMessage({
        type: 'snapshot',
        generation: bodyGeneration,
        utcMillis,
        lookAheadMillis: 6 * 60 * 60 * 1000,
        observer,
      })
    },
    terminate() {
      worker.terminate()
    },
  }
}
