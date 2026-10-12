import { describe, expect, it } from 'vitest'
import { syncReactView } from '@/app/hooks/syncReactView'

describe('React 视角写回 ref', () => {
  it('同一对象不覆盖拖拽中的方位', () => {
    const live = { azimuth: 180, altitude: 0, fov: 60 }
    const target = { ...live }
    const applied = { current: live }
    target.azimuth = 140
    syncReactView(target, applied, live)
    expect(target.azimuth).toBe(140)
  })

  it('新的视角对象会写回 ref', () => {
    const live = { azimuth: 180, altitude: 0, fov: 60 }
    const target = { ...live }
    const applied = { current: live }
    const next = { azimuth: 90, altitude: 12, fov: 40 }
    syncReactView(target, applied, next)
    expect(target).toEqual(next)
    expect(applied.current).toBe(next)
  })
})
