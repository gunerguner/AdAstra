import { describe, expect, it } from 'vitest'
import { decidePixelRatio } from '../src/engine/performance/pixelRatio'

describe('decidePixelRatio', () => {
  it('帧时间过长时降到 1', () => {
    expect(decidePixelRatio(23, 1.5, 2)).toBe(1)
  })

  it('帧时间足够时升到设备像素比上限', () => {
    expect(decidePixelRatio(16, 1, 2)).toBe(1.5)
  })

  it('中间区间保持当前值', () => {
    expect(decidePixelRatio(19, 1.25, 2)).toBe(1.25)
  })
})
