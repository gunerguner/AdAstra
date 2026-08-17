export type RenderCapabilities = {
  webgl2: boolean
  offscreenCanvas: boolean
  workerWebglCandidate: boolean
  preferredBackend: 'offscreen-worker' | 'main-thread-webgl2' | 'canvas2d'
  activeFallback: 'main-thread-webgl2' | 'canvas2d'
}

export function detectRenderCapabilities(): RenderCapabilities {
  const canvas = document.createElement('canvas')
  const webgl2 = Boolean(canvas.getContext('webgl2'))
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined'
  const workerWebglCandidate = offscreenCanvas && typeof Worker !== 'undefined'
  return {
    webgl2,
    offscreenCanvas,
    workerWebglCandidate,
    preferredBackend: workerWebglCandidate ? 'offscreen-worker' : webgl2 ? 'main-thread-webgl2' : 'canvas2d',
    // Astronomy sampling already runs in a Worker. The scene intentionally
    // stays on the main thread until the OffscreenCanvas visual parity suite
    // is available, avoiding a browser-dependent feature fork.
    activeFallback: webgl2 ? 'main-thread-webgl2' : 'canvas2d',
  }
}
