import { describe, expect, it } from 'vitest'
import { bodyPointSize, bodyVisualScale, daylightFactor, starPointSize } from '../src/engine/render/bodyAppearance'

describe('天体视觉缩放', () => {
  it('太阳和月亮保持 1', () => {
    expect(bodyVisualScale('sun', -26)).toBe(1)
    expect(bodyVisualScale('moon', -12)).toBe(1)
  })

  it('行星按星等夹在合理范围', () => {
    expect(bodyVisualScale('mars', -5)).toBe(1.55)
    expect(bodyVisualScale('mercury', 4)).toBe(0.7)
  })

  it('昼夜因子在暮光区间插值', () => {
    expect(daylightFactor(-18, true)).toBe(0)
    expect(daylightFactor(6, true)).toBe(1)
    expect(daylightFactor(0, false)).toBe(0)
  })

  it('恒星点大小随亮度增加', () => {
    expect(starPointSize(-1.5)).toBeGreaterThan(starPointSize(5))
  })

  it('太阳月亮用屏幕点大小，避免边缘被投影拉成长条', () => {
    expect(bodyPointSize('sun', -26)).toBe(78)
    expect(bodyPointSize('moon', -12)).toBe(56)
    expect(bodyPointSize('venus', -4)).toBeGreaterThan(bodyPointSize('mercury', 2))
  })
})
