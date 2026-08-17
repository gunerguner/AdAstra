import { describe, expect, it } from 'vitest'
import { Camera, Vector3 } from 'three'
import { SKY_HORIZON_LIFT, projectSkyToNdc, viewDirectionFromNdc } from '../src/engine/skyProjection'

const identityCamera = {
  matrixWorldInverse: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
} as Camera

describe('skyProjection', () => {
  it('screen center looks above the camera axis', () => {
    const dir = viewDirectionFromNdc(0, 0, 72, 16 / 9)
    expect(dir.x).toBeCloseTo(0, 6)
    expect(dir.y).toBeGreaterThan(0.2)
    expect(dir.z).toBeLessThan(0)
  })

  it('stereographic roundtrip stays conformal at the edge', () => {
    const aspect = 16 / 9
    const original = viewDirectionFromNdc(0.92, 0.55, 72, aspect)
    const ndc = projectSkyToNdc(original, identityCamera, 72, aspect)
    expect(ndc).not.toBeNull()
    expect(ndc!.x).toBeCloseTo(0.92, 4)
    expect(ndc!.y).toBeCloseTo(0.55, 4)
  })

  it('level look direction sits on the lower horizon line', () => {
    const ndc = projectSkyToNdc(new Vector3(0, 0, -1), identityCamera, 72, 1)
    expect(ndc).not.toBeNull()
    expect(ndc!.x).toBeCloseTo(0, 6)
    expect(ndc!.y).toBeCloseTo(-SKY_HORIZON_LIFT, 6)
  })

  it('points behind the camera stay off-screen', () => {
    expect(projectSkyToNdc(new Vector3(0, 0, 1), identityCamera, 100, 16 / 9)).toBeNull()
    expect(projectSkyToNdc(new Vector3(0.2, 0.1, 0.97), identityCamera, 100, 16 / 9)).toBeNull()
  })
})
