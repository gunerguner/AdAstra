import { describe, expect, it } from 'vitest'
import { createSkyProjectionUniforms } from '../src/engine/render/skyProjection'
import { createBodiesLayer } from '../src/engine/render/layers/bodyLayer'
import { createHelperLayer } from '../src/engine/render/layers/helperLayer'

describe('layer render order', () => {
  it('draws bodies above the ecliptic overlay', () => {
    const sky = createSkyProjectionUniforms()
    const helpers = createHelperLayer({
      horizonMat: new Float32Array(9),
      sky,
      showBelow: { value: 1 },
    })
    const bodies = createBodiesLayer(sky, 1)
    expect(bodies.points.renderOrder).toBeGreaterThan(helpers.ecliptic.renderOrder)
    expect(helpers.group.renderOrder).toBeLessThanOrEqual(bodies.points.renderOrder)
  })
})
