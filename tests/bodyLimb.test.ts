import { describe, expect, it } from 'vitest'
import { brightLimbAngle } from '../src/engine/render/bodyLimb'

describe('brightLimbAngle', () => {
  it('太阳在右侧时亮边朝右', () => {
    expect(brightLimbAngle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0)
  })

  it('太阳在上侧时亮边朝上', () => {
    expect(brightLimbAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2)
  })

  it('缺少投影时退回 0', () => {
    expect(brightLimbAngle(null, { x: 1, y: 0 })).toBe(0)
  })
})
