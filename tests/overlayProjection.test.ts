import { describe, expect, it } from 'vitest'
import { applyOverlayPlacement, overlayScreenPosition } from '../src/engine/interaction/overlayProjection'

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

  it('skips redundant DOM writes', () => {
    const writes: string[] = []
    const style = {
      display: '',
      transform: '',
    }
    const node = {
      style: new Proxy(style, {
        set(target, key, value) {
          writes.push(`${String(key)}:${String(value)}`)
          target[key as 'display' | 'transform'] = value
          return true
        },
      }),
    } as HTMLElement
    const placement = overlayScreenPosition({ x: 0, y: 0 }, 800, 600, 14, -18)
    applyOverlayPlacement(node, placement)
    applyOverlayPlacement(node, placement)
    expect(writes.filter((entry) => entry.startsWith('transform:')).length).toBe(1)
    applyOverlayPlacement(node, { visible: false, x: 0, y: 0 })
    applyOverlayPlacement(node, { visible: false, x: 0, y: 0 })
    expect(writes.filter((entry) => entry === 'display:none').length).toBe(1)
  })
})
