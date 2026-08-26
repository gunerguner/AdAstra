import { describe, expect, it } from 'vitest'
import brightChecklist from '../scripts/catalog/bright-stars-v3.yaml'
import starCatalog from '../src/data/stars.yaml'

const checklist = (brightChecklist as { stars: Array<{ id: string; magnitude: number }> }).stars
const catalogIds = new Set(
  (starCatalog as { stars: Array<{ id: string; magnitude: number }> }).stars.map((star) => star.id),
)

describe('bright star coverage', () => {
  it('includes every worldwide V<=3.0 reference star in the catalog', () => {
    const missing = checklist
      .filter((star) => star.magnitude <= 3)
      .flatMap((star) => (catalogIds.has(star.id) ? [] : [star.id]))
    expect(missing).toEqual([])
  })
})
