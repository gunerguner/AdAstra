import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { densifyGreatCircle, horizontalVector, skyCameraUpInto } from '../src/engine/coordinates/skyGeometry'
import { horizonAnglesFromVector } from '../src/engine/coordinates/skyMath'

describe('skyGeometry', () => {
  it('maps zenith to the horizontal up axis', () => {
    const zenith = horizontalVector(90, 0)
    expect(zenith.x).toBeCloseTo(0, 6)
    expect(zenith.y).toBeCloseTo(1, 6)
    expect(zenith.z).toBeCloseTo(0, 6)
  })

  it('puts east on -X so facing south is left-east right-west', () => {
    const east = horizontalVector(0, 90)
    const west = horizontalVector(0, 270)
    const south = horizontalVector(0, 180)
    expect(south.z).toBeCloseTo(-1, 6)
    expect(east.x).toBeCloseTo(-1, 6)
    expect(west.x).toBeCloseTo(1, 6)
    expect(horizonAnglesFromVector(east).azimuth).toBeCloseTo(90, 5)
    expect(horizonAnglesFromVector(west).azimuth).toBeCloseTo(270, 5)
  })

  it('keeps camera up perpendicular to the look direction near zenith', () => {
    const look = horizontalVector(89, 0)
    const up = skyCameraUpInto(89, 0, look, new Vector3())
    expect(up.dot(look)).toBeCloseTo(0, 5)
    expect(Math.abs(up.y)).toBeLessThan(0.2)
  })

  it('uses north as camera up when looking straight at zenith', () => {
    const look = horizontalVector(90, 0)
    const up = skyCameraUpInto(90, 0, look, new Vector3())
    expect(up.dot(look)).toBeCloseTo(0, 5)
    expect(up.z).toBeGreaterThan(0.9)
  })

  it('densifies long arcs without moving their endpoints', () => {
    const points = densifyGreatCircle([new Vector3(1, 0, 0), new Vector3(0, 1, 0)], Math.PI / 8)
    expect(points).toHaveLength(5)
    expect(points[0].x).toBeCloseTo(1, 6)
    expect(points.at(-1)?.y).toBeCloseTo(1, 6)
  })
})
