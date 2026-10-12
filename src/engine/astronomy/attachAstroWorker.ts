/** 创建天文计算 Worker：节流发 snapshot、只接受最新 generation、页面隐藏或拖时间轴时不请求。 */
import type { Observer } from '@/shared/types/observer'
import { AppError } from '@/shared/errors/appError'
import type { BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import {
  type AstroWorkerRequest,
  type AstroWorkerResponse,
} from '@/engine/astronomy/astroWorkerProtocol'

const BODY_SNAPSHOT_MIN_INTERVAL_MS = 120
const BODY_SNAPSHOT_LOOKAHEAD_MS = 6 * 60 * 60 * 1000

export type BodySnapshotRequestState = {
  at: number
  utcMillis: number
  latitude: number
  longitude: number
}

/** 节流门闩。scrubbing 为真时不发请求；松手时清掉上一发，强制要终点窗口。 */
export type BodySnapshotGate = {
  last: BodySnapshotRequestState | null
  scrubbing: boolean
}

export function createBodySnapshotGate(): BodySnapshotGate {
  return { last: null, scrubbing: false }
}

/**
 * 这一帧是否该向 Worker 发 snapshot。
 * 返回 true 时已把本次请求记进 gate。
 */
export function admitBodySnapshot(
  gate: BodySnapshotGate,
  input: {
    now: number
    utcMillis: number
    latitude: number
    longitude: number
    hidden: boolean
    scrubbing: boolean
  },
) {
  const leavingScrub = gate.scrubbing && !input.scrubbing
  gate.scrubbing = input.scrubbing
  if (leavingScrub) gate.last = null
  if (input.hidden || input.scrubbing) return false
  const last = gate.last
  if (last && input.now - last.at < BODY_SNAPSHOT_MIN_INTERVAL_MS) return false
  if (
    last
    && last.utcMillis === input.utcMillis
    && last.latitude === input.latitude
    && last.longitude === input.longitude
  ) return false
  gate.last = {
    at: input.now,
    utcMillis: input.utcMillis,
    latitude: input.latitude,
    longitude: input.longitude,
  }
  return true
}

/** 挂上 Worker，返回 requestSnapshot / terminate。 */
export function attachAstroWorker(handlers: {
  onSnapshot: (window: BodySnapshotWindow) => void
  onError: (error: AppError) => void
}) {
  const worker = new Worker(new URL('../../workers/astronomy.worker.ts', import.meta.url), { type: 'module' })
  let bodyGeneration = 0
  const gate = createBodySnapshotGate()

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
    requestSnapshot(now: number, utcMillis: number, observer: Observer, scrubbing = false) {
      if (!admitBodySnapshot(gate, {
        now,
        utcMillis,
        latitude: observer.latitude,
        longitude: observer.longitude,
        hidden: document.hidden,
        scrubbing,
      })) return
      bodyGeneration += 1
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
