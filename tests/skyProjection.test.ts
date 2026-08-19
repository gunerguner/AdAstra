import { describe, expect, it } from 'vitest'
import { Camera, Vector3 } from 'three'
import { SKY_HORIZON_LIFT, SKY_OUTSIDE_Z, projectSkyToNdc, skyOutsideMaskGlsl, skyProjectionGlsl, skyViewDirFromNdcGlsl, viewDirectionFromNdc } from '../src/engine/render/skyProjection'

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

  it('does not allocate a cloned view vector on each projection', () => {
    expect(projectSkyToNdc.toString()).not.toContain('clone')
  })

  it('does not fling off-sky vertices to huge NDC', () => {
    expect(skyProjectionGlsl).not.toContain('away * 8.0')
    expect(skyProjectionGlsl).toContain('projected.z')
    expect(skyProjectionGlsl).toContain(SKY_OUTSIDE_Z.toFixed(3))
    expect(skyProjectionGlsl).not.toContain('step(0.02, dir.z)')
  })

  it('reconstructs view direction from NDC with the same horizon lift', () => {
    expect(skyViewDirFromNdcGlsl).toContain('skyViewDirFromNdc')
    expect(skyViewDirFromNdcGlsl).toContain(SKY_HORIZON_LIFT.toFixed(3))
  })

  it('crops the stereographic disk at a shared outside threshold', () => {
    expect(skyOutsideMaskGlsl).toContain(SKY_OUTSIDE_Z.toFixed(3))
    expect(skyOutsideMaskGlsl).toContain('fwidth')
  })
})
