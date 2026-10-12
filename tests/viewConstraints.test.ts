import { describe, expect, it } from 'vitest'
import { clampViewAltitude, formatViewBearing, nudgeView, panView, zoomView } from '@/engine/interaction/viewConstraints'
import { SKY_FOV_MAX, SKY_FOV_MIN } from '@/engine/render/skyProjection'

const view = { azimuth: 10, altitude: 0, fov: 100 }

describe('视角约束', () => {
  it('夹紧高度角', () => {
    expect(clampViewAltitude(120)).toBe(89)
    expect(clampViewAltitude(-40)).toBe(-30)
  })

  it('拖拽按原系数平移并环绕方位角', () => {
    const next = panView({ azimuth: 10, altitude: 0, fov: 100 }, 100, 50)
    expect(next.azimuth).toBe((10 + 22) % 360)
    expect(next.altitude).toBe(8)
  })

  it('放大后同样的像素拖动转过更小的角度', () => {
    const next = panView({ azimuth: 10, altitude: 0, fov: 50 }, 100, 50)
    expect(next.azimuth).toBe((10 + 11) % 360)
    expect(next.altitude).toBe(4)
  })

  it('缩放夹在视场范围', () => {
    expect(zoomView(view, 0.1).fov).toBe(SKY_FOV_MIN)
    expect(zoomView(view, 10).fov).toBe(SKY_FOV_MAX)
  })

  it('方位读数四舍五入到整度', () => {
    expect(formatViewBearing({ azimuth: 180.6, altitude: -0.6, fov: 60 })).toBe('181° · -1°')
  })

  it('方向键微调视角', () => {
    expect(nudgeView(view, 'ArrowLeft')?.azimuth).toBe(4)
    expect(nudgeView(view, 'ArrowUp')?.altitude).toBe(4)
    expect(nudgeView(view, 'x')).toBeNull()
  })
})
