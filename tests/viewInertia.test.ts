import { describe, expect, it } from 'vitest'
import { releaseViewInertia, stepViewInertia } from '@/engine/interaction/viewInertia'

describe('拖拽惯性', () => {
  it('松手前已停住或拖得很慢时不滑行', () => {
    const slow = [
      { t: 0, x: 0, y: 0 },
      { t: 200, x: 20, y: 0 },
    ]
    expect(releaseViewInertia(slow, 200)).toBeNull()
    const rested = [
      { t: 0, x: 0, y: 0 },
      { t: 30, x: 40, y: 0 },
    ]
    expect(releaseViewInertia(rested, 100)).toBeNull()
  })

  it('快拖给出有上限的速度，并在一帧后衰减', () => {
    const velocity = releaseViewInertia([
      { t: 0, x: 0, y: 0 },
      { t: 20, x: 40, y: 0 },
    ], 20)
    expect(velocity?.vx).toBeGreaterThan(0)
    expect(velocity?.vx).toBeLessThanOrEqual(0.55)
    const stepped = stepViewInertia(
      { azimuth: 180, altitude: 0, fov: 60 },
      velocity ?? { vx: 0, vy: 0 },
      16,
      16,
    )
    expect(stepped.view.azimuth).toBeGreaterThan(180)
    expect(Math.abs(stepped.velocity.vx)).toBeLessThan(velocity?.vx ?? 0)
    expect(stepped.done).toBe(false)
  })

  it('超过最长滑行时间后停止', () => {
    const stepped = stepViewInertia({ azimuth: 10, altitude: 0, fov: 60 }, { vx: 0.4, vy: 0 }, 16, 320)
    expect(stepped.done).toBe(true)
    expect(stepped.view.azimuth).toBe(10)
  })
})
