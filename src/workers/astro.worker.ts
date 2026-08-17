/// <reference lib="webworker" />
import { astronomyService, type BodySnapshotWindow } from '../engine/astronomyService'

type Request = {
  type: 'snapshot'
  generation: number
  utcMillis: number
  lookAheadMillis: number
  observer: { latitude: number; longitude: number }
}

let latestGeneration = 0

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data
  latestGeneration = Math.max(latestGeneration, request.generation)
  if (request.type !== 'snapshot') return

  try {
    const window: BodySnapshotWindow = {
      fromUtcMillis: request.utcMillis,
      toUtcMillis: request.utcMillis + request.lookAheadMillis,
      from: astronomyService.getBodies(new Date(request.utcMillis), request.observer),
      to: astronomyService.getBodies(new Date(request.utcMillis + request.lookAheadMillis), request.observer),
    }
    if (request.generation !== latestGeneration) return
    self.postMessage({
      type: 'snapshot',
      generation: request.generation,
      window,
    })
  } catch (error) {
    if (request.generation !== latestGeneration) return
    const message = error instanceof Error ? error.message : '天体计算失败'
    self.postMessage({
      type: 'error',
      generation: request.generation,
      message,
    })
  }
}

export {}
