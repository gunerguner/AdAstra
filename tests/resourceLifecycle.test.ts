import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'

describe('render resource lifecycle', () => {
  it('disposes body atlas with the rest of the sky scene', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../src/engine/render/createSkyScene.ts'), 'utf8')
    expect(source).toContain('disposeBodiesLayer(ctx.layers.bodyPoints)')
    expect(source).toContain('disposeMesh(ctx.layers.skyDome)')
  })

  it('stops the render loop, observers, worker and scene together', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../src/features/sky-viewer/SkyViewport.tsx'), 'utf8')
    expect(source).toContain('loop.stop()')
    expect(source).toContain('resizeObserver.disconnect()')
    expect(source).toContain('controller.unbind()')
    expect(source).toContain('worker.terminate()')
    expect(source).toContain('disposeSkyScene(ctx)')
  })

  it('keeps astronomy-engine out of the interpolation module', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../src/engine/astronomy/bodyInterpolation.ts'), 'utf8')
    expect(source).not.toMatch(/from ['"]astronomy-engine['"]/)
  })
})
