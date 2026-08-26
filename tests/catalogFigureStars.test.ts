import { describe, expect, it } from 'vitest'
import { constellationLines } from '../src/data/catalog'
import starCatalog from '../src/data/stars.yaml'

const stars = (starCatalog as { stars: Array<{ id: string; magnitude: number }> }).stars
const starById = new Map(stars.map((star) => [star.id, star]))
const preExpansionIds = new Set([
  'etaUmi', 'asellusBorealis', 'deltaCrB', 'mizarB', 'chara',
])

describe('catalog figure stars', () => {
  it('keeps 57 drawable constellations with resolvable references', () => {
    expect(constellationLines).toHaveLength(57)
    const missing = constellationLines.flatMap((line) =>
      line.segments.flatMap((segment) =>
        segment.flatMap((id) => (starById.has(id) ? [] : [`${line.name}:${id}`])),
      ),
    )
    expect(missing).toEqual([])
    const undrawable = constellationLines.filter((line) =>
      line.segments.every((segment) => segment.length < 2),
    ).map((line) => line.name)
    expect(undrawable).toEqual([])
  })

  it('does not add constellation-only stars above V 4.5', () => {
    const usedIds = new Set(constellationLines.flatMap((line) => line.segments.flat()))
    const offenders = [...usedIds].flatMap((id) => {
      const star = starById.get(id)
      if (!star || preExpansionIds.has(id) || star.magnitude <= 4.5) return []
      return [`${id}:${star.magnitude}`]
    })
    expect(offenders).toEqual([])
  })
})
