/// <reference lib="webworker" />
import { astronomyService } from '@/engine/astronomy/astronomyService'
import {
  type AstroWorkerRequest,
  type AstroWorkerResponse,
} from '@/engine/astronomy/astroWorkerProtocol'

let latestGeneration = 0

self.onmessage = (event: MessageEvent<AstroWorkerRequest>) => {
  const request = event.data
  latestGeneration = Math.max(latestGeneration, request.generation)
  if (request.type !== 'snapshot') return

  try {
    const response: AstroWorkerResponse = {
      type: 'snapshot',
      generation: request.generation,
      window: {
        fromUtcMillis: request.utcMillis,
        toUtcMillis: request.utcMillis + request.lookAheadMillis,
        from: astronomyService.getBodies(new Date(request.utcMillis), request.observer),
        to: astronomyService.getBodies(new Date(request.utcMillis + request.lookAheadMillis), request.observer),
      },
    }
    if (request.generation !== latestGeneration) return
    self.postMessage(response)
  } catch (error) {
    if (request.generation !== latestGeneration) return
    const response: AstroWorkerResponse = {
      type: 'error',
      generation: request.generation,
      message: error instanceof Error ? error.message : '天体计算失败',
    }
    self.postMessage(response)
  }
}

export {}
