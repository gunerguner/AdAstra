/** 主线程 ↔ 天文 Worker 的请求/响应类型。generation 用来丢弃过时结果。 */
import type { BodySnapshotWindow } from './bodyInterpolation'
import type { Observer } from '@/shared/types/observer'

export type AstroWorkerRequest = {
  type: 'snapshot'
  generation: number
  utcMillis: number
  lookAheadMillis: number
  observer: Observer
}

export type AstroWorkerSnapshot = {
  type: 'snapshot'
  generation: number
  window: BodySnapshotWindow
}

export type AstroWorkerError = {
  type: 'error'
  generation: number
  message: string
}

export type AstroWorkerResponse = AstroWorkerSnapshot | AstroWorkerError
