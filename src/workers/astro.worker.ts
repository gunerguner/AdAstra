/// <reference lib="webworker" />
import { astronomyService } from '../engine/astronomyService'

type Request = {
  type: 'snapshot'
  generation: number
  utcMillis: number
  observer: { latitude: number; longitude: number }
}

let latestGeneration = 0

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data
  latestGeneration = Math.max(latestGeneration, request.generation)
  if (request.type !== 'snapshot') return

  const bodies = astronomyService.getBodies(new Date(request.utcMillis), request.observer)
  if (request.generation !== latestGeneration) return

  self.postMessage({
    type: 'snapshot',
    generation: request.generation,
    utcMillis: request.utcMillis,
    bodies,
    moonPhase: astronomyService.getMoonPhase(new Date(request.utcMillis)),
  })
}

export {}
