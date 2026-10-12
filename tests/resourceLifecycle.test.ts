import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { releaseSkySession } from '@/features/sky-viewer/releaseSkySession'

describe('render resource lifecycle', () => {
  it('disposes body atlas with the rest of the sky scene', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../src/engine/render/createSkyScene.ts'), 'utf8')
    expect(source).toContain('disposeBodiesLayer(ctx.layers.bodyPoints)')
    expect(source).toContain('ctx.layers.skyDome')
    expect(source).toContain('.forEach(disposeMesh)')
  })

  it('按停帧、卸监听、释放 Worker、释放 GPU 的顺序卸载', () => {
    const order: string[] = []
    const mark = (name: string) => () => { order.push(name) }
    releaseSkySession({
      stopLoop: mark('stop'),
      disconnectResize: mark('resize'),
      unbindController: mark('unbind'),
      terminateWorker: mark('terminate'),
      disposeScene: mark('dispose'),
    })
    expect(order).toEqual(['stop', 'resize', 'unbind', 'terminate', 'dispose'])
  })

  it('keeps astronomy-engine out of the interpolation module', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../src/engine/astronomy/bodyInterpolation.ts'), 'utf8')
    expect(source).not.toMatch(/from ['"]astronomy-engine['"]/)
  })
})
