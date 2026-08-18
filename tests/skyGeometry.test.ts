import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { densifyGreatCircle, horizontalVector } from '../src/engine/coordinates/skyGeometry'

describe('skyGeometry', () => {
  it('maps zenith to the horizontal up axis', () => {
    const zenith = horizontalVector(90, 0)
    expect(zenith.x).toBeCloseTo(0, 6)
    expect(zenith.y).toBeCloseTo(1, 6)
    expect(zenith.z).toBeCloseTo(0, 6)
  })

  it('densifies long arcs without moving their endpoints', () => {
    const points = densifyGreatCircle([new Vector3(1, 0, 0), new Vector3(0, 1, 0)], Math.PI / 8)
    expect(points).toHaveLength(5)
    expect(points[0].x).toBeCloseTo(1, 6)
    expect(points.at(-1)?.y).toBeCloseTo(1, 6)
  })
})
