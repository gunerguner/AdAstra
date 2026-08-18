import { describe, expect, it } from 'vitest'
import { buildConstellationAnchors, buildConstellationStars } from '../src/engine/astronomy/constellationData'
import type { RuntimeCatalog } from '../src/engine/catalog/catalogService'

describe('constellation data', () => {
  it('drops constellation references that are absent from the catalog', () => {
    const catalog = { starById: new Map() } as RuntimeCatalog
    const lines = buildConstellationStars(catalog)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.flatMap((line) => line.segments).every((segment) => segment.length === 0)).toBe(true)
  })

  it('normalizes each constellation label anchor', () => {
    const anchors = buildConstellationAnchors([{
      name: '测试星座',
      segments: [[
        { id: 'a', name: 'A', raHours: 0, decDeg: 0, magnitude: 1, constellation: '测试', color: '#fff' },
        { id: 'b', name: 'B', raHours: 6, decDeg: 0, magnitude: 1, constellation: '测试', color: '#fff' },
      ]],
    }])
    expect(Math.hypot(anchors[0].x, anchors[0].y, anchors[0].z)).toBeCloseTo(1, 6)
  })
})
