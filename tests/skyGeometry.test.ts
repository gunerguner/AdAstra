import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { densifyGreatCircle } from '../src/engine/coordinates/skyGeometry'

describe('skyGeometry', () => {
  it('在大圆弧上插入中间点', () => {
    const points = densifyGreatCircle([
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
    ], Math.PI / 6)
    expect(points.length).toBeGreaterThan(2)
    expect(points[0].x).toBeCloseTo(1)
    expect(points.at(-1)?.y).toBeCloseTo(1)
  })
})
