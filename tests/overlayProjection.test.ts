import { describe, expect, it } from 'vitest'
import { overlayScreenPosition } from '../src/engine/interaction/overlayProjection'

describe('overlayScreenPosition', () => {
  it('把屏幕中心 NDC 映射到画布中心并加偏移', () => {
    const placement = overlayScreenPosition({ x: 0, y: 0 }, 800, 600, 14, -18)
    expect(placement.visible).toBe(true)
    expect(placement.x).toBe(414)
    expect(placement.y).toBe(282)
  })

  it('在视野边缘外隐藏', () => {
    expect(overlayScreenPosition({ x: 1.3, y: 0 }, 800, 600, 0, 0).visible).toBe(false)
    expect(overlayScreenPosition(null, 800, 600, 0, 0).visible).toBe(false)
  })

  it('按尺寸把卡片推回安全边距内', () => {
    const placement = overlayScreenPosition({ x: 0.9, y: 0.9 }, 400, 300, 18, -36, 1.18, { width: 228, height: 140 })
    expect(placement.visible).toBe(true)
    expect(placement.x).toBeGreaterThanOrEqual(12)
    expect(placement.x + 228).toBeLessThanOrEqual(400 - 12)
    expect(placement.y).toBeGreaterThanOrEqual(12)
    expect(placement.y + 140).toBeLessThanOrEqual(300 - 12)
  })
})
