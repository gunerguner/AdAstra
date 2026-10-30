import { describe, expect, it } from 'vitest'
import { createBodiesLayer } from '@/engine/render/layers/bodyLayer'
import { createHelperLayer } from '@/engine/render/layers/helperLayer'
import { createFullscreenLayer } from '@/engine/render/layers/fullscreenLayer'
import { makeSkyDomeMaterial } from '@/engine/render/materials/skyDomeMaterial'
import { makeSkyLimbMaterial } from '@/engine/render/materials/skyLimbMaterial'
import { testSkyUniforms } from './testSkyUniforms'

describe('layer render order', () => {
  it('draws bodies above the ecliptic overlay', () => {
    const uniforms = testSkyUniforms()
    const helpers = createHelperLayer(uniforms)
    const bodies = createBodiesLayer(uniforms.sky, 1, {
      daylight: uniforms.daylight,
      twilight: uniforms.twilight,
    })
    expect(bodies.points.renderOrder).toBeGreaterThan(helpers.ecliptic.renderOrder)
    expect(helpers.group.renderOrder).toBeLessThanOrEqual(bodies.points.renderOrder)
  })

  it('keeps the sky dome behind landscape and the landscape behind bodies', () => {
    const uniforms = testSkyUniforms()
    const dome = createFullscreenLayer(makeSkyDomeMaterial(uniforms), -1)
    const helpers = createHelperLayer(uniforms)
    const bodies = createBodiesLayer(uniforms.sky, 1)
    expect(dome.mesh.renderOrder).toBeLessThan(helpers.ground.renderOrder)
    expect(helpers.ecliptic.renderOrder).toBeLessThan(helpers.ground.renderOrder)
    expect(helpers.equator.renderOrder).toBeLessThan(helpers.ground.renderOrder)
    expect(helpers.ground.renderOrder).toBeLessThan(bodies.points.renderOrder)
    // 地平圈/辉光画在天体之上：低垂的月亮/行星被山脊挡住，日盘靠自身压暗+天色混合。
    expect(helpers.horizon.renderOrder).toBeGreaterThan(bodies.points.renderOrder)
    expect(helpers.horizonGlow.renderOrder).toBeGreaterThan(bodies.points.renderOrder)
  })

  it('crops the celestial sphere after all sky content', () => {
    const uniforms = testSkyUniforms()
    const helpers = createHelperLayer(uniforms)
    const bodies = createBodiesLayer(uniforms.sky, 1)
    const limb = createFullscreenLayer(makeSkyLimbMaterial(uniforms), 20)
    expect(limb.mesh.renderOrder).toBeGreaterThan(bodies.points.renderOrder)
    expect(limb.mesh.renderOrder).toBeGreaterThan(helpers.ground.renderOrder)
  })
})
