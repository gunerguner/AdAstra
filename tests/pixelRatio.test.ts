import { describe, expect, it } from 'vitest'
import { PIXEL_RATIO_CAP, PIXEL_RATIO_FAST_MS, PIXEL_RATIO_SLOW_MS, decidePixelRatio } from '../src/engine/performance/pixelRatio'

describe('decidePixelRatio', () => {
  it('帧时间过长时降到 1', () => {
    expect(decidePixelRatio(PIXEL_RATIO_SLOW_MS + 1, PIXEL_RATIO_CAP, 2)).toBe(1)
  })

  it('帧时间足够时升到设备像素比上限', () => {
    expect(decidePixelRatio(PIXEL_RATIO_FAST_MS - 1, 1, 2)).toBe(PIXEL_RATIO_CAP)
  })

  it('中间区间保持当前值', () => {
    expect(decidePixelRatio(19, 1.25, 2)).toBe(1.25)
  })
})
