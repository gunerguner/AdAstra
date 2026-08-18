import type { BodySnapshotWindow } from './astronomyService'
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
