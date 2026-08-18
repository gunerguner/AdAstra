import { describe, expect, it } from 'vitest'
import { createSkyLimbLayer } from '../src/engine/render/layers/skyLimbLayer'
import { decidePixelRatio } from '../src/engine/performance/pixelRatio'
import { createSkyProjectionUniforms } from '../src/engine/render/skyProjection'

describe('gpu quality', () => {
  it('draws the sky limb with a clip-space quad instead of a dense sphere', () => {
    const limb = createSkyLimbLayer(createSkyProjectionUniforms())
    expect(limb.mesh.geometry.getAttribute('position').count).toBeLessThanOrEqual(4)
    expect(limb.material.fragmentShader).toContain('skyViewDirFromNdc')
    limb.mesh.geometry.dispose()
    limb.material.dispose()
  })

  it('uses a hysteresis band so pixel ratio does not chatter', () => {
    expect(decidePixelRatio(23, 1.5, 2)).toBe(1.5)
    expect(decidePixelRatio(25, 1.5, 2)).toBe(1)
    expect(decidePixelRatio(17, 1, 2)).toBe(1)
    expect(decidePixelRatio(15, 1, 2)).toBe(1.5)
  })
})
