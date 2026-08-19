import { describe, expect, it } from 'vitest'
import { createFullscreenLayer } from '../src/engine/render/layers/fullscreenLayer'
import { makeSkyLimbMaterial } from '../src/engine/render/materials/skyLimbMaterial'
import { testSkyUniforms } from './testSkyUniforms'

describe('gpu quality', () => {
  it('draws the sky limb with a clip-space quad instead of a dense sphere', () => {
    const limb = createFullscreenLayer(makeSkyLimbMaterial(testSkyUniforms()), 20)
    expect(limb.mesh.geometry.getAttribute('position').count).toBeLessThanOrEqual(4)
    expect(limb.material.fragmentShader).toContain('skyViewDirFromNdc')
    expect(limb.material.fragmentShader).toContain('skyOutsideMask')
    limb.mesh.geometry.dispose()
    limb.material.dispose()
  })
})
