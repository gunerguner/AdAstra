import { describe, expect, it } from 'vitest'
import { brightestStarIds, solarQuickTargets } from '../src/config/quickTargets'
import { bodyRenderOrder } from '../src/engine/render/bodyAppearance'
import starCatalog from '../src/data/stars.yaml'

const catalogStars = (starCatalog as { stars: Array<{ id: string }> }).stars

describe('quickTargets', () => {
  it('lists the nine solar-system bodies in render order', () => {
    expect(solarQuickTargets.map((item) => item.id)).toEqual([...bodyRenderOrder])
    expect(solarQuickTargets).toHaveLength(9)
  })

  it('pins the ten brightest catalog stars by id', () => {
    expect(brightestStarIds).toHaveLength(10)
    expect([...brightestStarIds]).toEqual(catalogStars.slice(0, 10).map((star) => star.id))
  })
})
