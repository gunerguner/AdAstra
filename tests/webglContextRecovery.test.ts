import { describe, expect, it } from 'vitest'
import { bindWebglContextRecovery } from '@/engine/render/webglContextRecovery'

describe('WebGL 上下文恢复', () => {
  it('丢失时阻止默认并停渲染，恢复后再重建', () => {
    const canvas = new EventTarget()
    const calls: string[] = []
    const unbind = bindWebglContextRecovery(canvas, {
      onLost: () => { calls.push('lost') },
      onRestored: () => { calls.push('restored') },
    })
    const lost = new Event('webglcontextlost', { cancelable: true })
    canvas.dispatchEvent(lost)
    expect(lost.defaultPrevented).toBe(true)
    canvas.dispatchEvent(new Event('webglcontextrestored'))
    unbind()
    canvas.dispatchEvent(new Event('webglcontextrestored'))
    expect(calls).toEqual(['lost', 'restored'])
  })
})
