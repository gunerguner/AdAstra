import { describe, expect, it } from 'vitest'
import { buildConstellationAnchors } from '../src/engine/astronomy/constellationData'
import type { Star } from '../src/shared/types/star'

const star = (id: string, raHours: number, decDeg: number): Star => ({
  id,
  name: id,
  constellation: '猎户座',
  raHours,
  decDeg,
  magnitude: 1,
  color: '#fff',
})

describe('星座锚点', () => {
  it('空线段仍给出单位向量', () => {
    const [anchor] = buildConstellationAnchors([{ name: '空', segments: [] }])
    expect(anchor).toEqual({ name: '空', x: 0, y: 0, z: 0 })
  })

  it('对星点方向取平均并归一化', () => {
    const [anchor] = buildConstellationAnchors([{
      name: '猎户座',
      segments: [[star('a', 0, 0), star('b', 0, 0)]],
    }])
    expect(Math.hypot(anchor.x, anchor.y, anchor.z)).toBeCloseTo(1)
    expect(anchor.x).toBeCloseTo(1)
  })
})
