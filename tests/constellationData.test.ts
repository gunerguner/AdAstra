import { describe, expect, it } from 'vitest'
import { buildConstellationAnchors, buildConstellationStars } from '../src/engine/astronomy/constellationData'
import { constellationLines } from '../src/data/catalog'
import starCatalog from '../data/stars.yaml'
import type { RuntimeCatalog } from '../src/engine/catalog/catalogService'

const stars = (starCatalog as { stars: Array<{ id: string; magnitude: number }> }).stars
const starIds = new Set(stars.map((star) => star.id))
const starById = new Map(stars.map((star) => [star.id, star]))
const preExpansionIds = new Set(['etaUmi', 'asellusBorealis', 'deltaCrB', 'mizarB', 'chara'])

describe('constellation data', () => {
  it('drops constellation references that are absent from the catalog', () => {
    const catalog = { starById: new Map() } as RuntimeCatalog
    const lines = buildConstellationStars(catalog)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.flatMap((line) => line.segments).every((segment) => segment.length === 0)).toBe(true)
  })

  it('normalizes each constellation label anchor', () => {
    const anchors = buildConstellationAnchors([{
      id: 'Tes',
      names: { zh: '测试星座', en: 'Test' },
      segments: [[
        { id: 'a', names: { zh: 'A', en: 'A' }, raHours: 0, decDeg: 0, magnitude: 1, constellationId: 'Tes', color: '#fff' },
        { id: 'b', names: { zh: 'B', en: 'B' }, raHours: 6, decDeg: 0, magnitude: 1, constellationId: 'Tes', color: '#fff' },
      ]],
    }])
    expect(Math.hypot(anchors[0].x, anchors[0].y, anchors[0].z)).toBeCloseTo(1, 6)
  })

  it('covers the planned constellation set with drawable segments', () => {
    expect(constellationLines).toHaveLength(57)
    const missing = constellationLines.flatMap((line) =>
      line.segments.flatMap((segment) =>
        segment.flatMap((id) => (starIds.has(id) ? [] : [`${line.id}:${id}`])),
      ),
    )
    expect(missing).toEqual([])
    const undrawable = constellationLines.filter((line) =>
      line.segments.every((segment) => segment.length < 2),
    ).map((line) => line.id)
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

  it('uses common stick-figure edges instead of crossing chords', () => {
    const edgesOf = (id: string) => {
      const line = constellationLines.find((item) => item.id === id)
      if (!line) throw new Error(id)
      const edges = new Set<string>()
      for (const segment of line.segments) {
        for (let index = 0; index < segment.length - 1; index += 1) {
          const [a, b] = [segment[index], segment[index + 1]].sort()
          edges.add(`${a}|${b}`)
        }
      }
      return edges
    }

    const taurus = edgesOf('Tau')
    expect(taurus.has('ain|elnath')).toBe(true)
    expect(taurus.has('ain|aldebaran')).toBe(true)
    expect(taurus.has('aldebaran|zetaTau')).toBe(true)
    expect(taurus.has('aldebaran|elnath')).toBe(false)

    const auriga = edgesOf('Aur')
    expect(auriga.has('elnath|hassaleh')).toBe(true)
    expect(auriga.has('elnath|mahasim')).toBe(true)
    expect(auriga.has('hassaleh|mahasim')).toBe(false)

    const orion = edgesOf('Ori')
    expect(orion.has('bellatrix|betelgeuse')).toBe(false)
    expect(orion.has('bellatrix|pi3Ori')).toBe(true)
    expect(orion.has('pi3Ori|pi4Ori')).toBe(true)
    expect(orion.has('pi4Ori|pi5Ori')).toBe(true)
    expect(orion.has('alnilam|iotaOri')).toBe(true)
    expect(orion.has('alnitak|etaOri')).toBe(false)
    expect(orion.has('betelgeuse|muOri')).toBe(true)
    expect(orion.has('alnilam|alnitak')).toBe(true)
    expect(orion.has('alnitak|betelgeuse')).toBe(true)

    const ursaMajor = edgesOf('UMa')
    expect(ursaMajor.has('dubhe|merak')).toBe(true)
    expect(ursaMajor.has('megrez|phecda')).toBe(true)
    expect(ursaMajor.has('alkaid|mizar')).toBe(true)
    expect(ursaMajor.has('dubhe|megrez')).toBe(true)
    expect(ursaMajor.has('dubhe|iotaUma')).toBe(false)

    const ursaMinor = edgesOf('UMi')
    expect(ursaMinor.has('polaris|yildun')).toBe(true)
    expect(ursaMinor.has('epsUmi|zetaUmi')).toBe(true)
    expect(ursaMinor.has('kochab|zetaUmi')).toBe(true)
    expect(ursaMinor.has('kochab|pherkad')).toBe(true)
    expect(ursaMinor.has('etaUmi|pherkad')).toBe(true)
    expect(ursaMinor.has('etaUmi|kochab')).toBe(false)

    const leo = edgesOf('Leo')
    expect(leo.has('thetaLeo|zosma')).toBe(true)

    const draco = edgesOf('Dra')
    expect(draco.has('grumium|zetaDra')).toBe(true)
    expect(draco.has('rastaban|zetaDra')).toBe(false)
    expect(draco.has('etaDra|zetaDra')).toBe(true)

    const hydra = edgesOf('Hya')
    expect(hydra.has('alphard|lambdaHya')).toBe(true)
    expect(hydra.has('lambdaHya|nuHya')).toBe(true)
    expect(hydra.has('gammaHya|nuHya')).toBe(false)

    const cepheus = edgesOf('Cep')
    expect(cepheus.has('alderamin|alfirk')).toBe(true)
    expect(cepheus.has('errai|zetaCep')).toBe(false)

    const grus = edgesOf('Gru')
    expect(grus.has('alnair|gammaGru')).toBe(true)
    expect(grus.has('alnair|betaGru')).toBe(true)
    expect(grus.has('betaGru|gammaGru')).toBe(false)
  })
})
