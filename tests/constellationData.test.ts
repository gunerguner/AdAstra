import { describe, expect, it } from 'vitest'
import { buildConstellationAnchors, buildConstellationStars } from '../src/engine/astronomy/constellationData'
import { constellationLines } from '../src/data/catalog'
import starCatalog from '../src/data/stars.yaml'
import type { RuntimeCatalog } from '../src/engine/catalog/catalogService'

const starIds = new Set(
  (starCatalog as { stars: Array<{ id: string }> }).stars.map((star) => star.id),
)

describe('constellation data', () => {
  it('drops constellation references that are absent from the catalog', () => {
    const catalog = { starById: new Map() } as RuntimeCatalog
    const lines = buildConstellationStars(catalog)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.flatMap((line) => line.segments).every((segment) => segment.length === 0)).toBe(true)
  })

  it('normalizes each constellation label anchor', () => {
    const anchors = buildConstellationAnchors([{
      name: '测试星座',
      segments: [[
        { id: 'a', name: 'A', raHours: 0, decDeg: 0, magnitude: 1, constellation: '测试', color: '#fff' },
        { id: 'b', name: 'B', raHours: 6, decDeg: 0, magnitude: 1, constellation: '测试', color: '#fff' },
      ]],
    }])
    expect(Math.hypot(anchors[0].x, anchors[0].y, anchors[0].z)).toBeCloseTo(1, 6)
  })

  it('covers the planned constellation set with drawable segments', () => {
    expect(constellationLines).toHaveLength(57)
    const missing = constellationLines.flatMap((line) =>
      line.segments.flatMap((segment) =>
        segment.flatMap((id) => (starIds.has(id) ? [] : [`${line.name}:${id}`])),
      ),
    )
    expect(missing).toEqual([])
    const undrawable = constellationLines.filter((line) =>
      line.segments.every((segment) => segment.length < 2),
    ).map((line) => line.name)
    expect(undrawable).toEqual([])
  })

  it('uses common stick-figure edges instead of crossing chords', () => {
    const edgesOf = (name: string) => {
      const line = constellationLines.find((item) => item.name === name)
      if (!line) throw new Error(name)
      const edges = new Set<string>()
      for (const segment of line.segments) {
        for (let index = 0; index < segment.length - 1; index += 1) {
          const [a, b] = [segment[index], segment[index + 1]].sort()
          edges.add(`${a}|${b}`)
        }
      }
      return edges
    }

    const taurus = edgesOf('金牛座')
    expect(taurus.has('ain|elnath')).toBe(true)
    expect(taurus.has('ain|aldebaran')).toBe(true)
    expect(taurus.has('aldebaran|zetaTau')).toBe(true)
    expect(taurus.has('aldebaran|elnath')).toBe(false)

    const auriga = edgesOf('御夫座')
    expect(auriga.has('elnath|hassaleh')).toBe(true)
    expect(auriga.has('elnath|mahasim')).toBe(true)
    expect(auriga.has('hassaleh|mahasim')).toBe(false)

    const orion = edgesOf('猎户座')
    expect(orion.has('bellatrix|betelgeuse')).toBe(false)
    expect(orion.has('bellatrix|pi3Ori')).toBe(true)
    expect(orion.has('pi3Ori|pi4Ori')).toBe(true)
    expect(orion.has('pi4Ori|pi5Ori')).toBe(true)
    expect(orion.has('alnilam|iotaOri')).toBe(true)
    expect(orion.has('alnitak|etaOri')).toBe(false)
    expect(orion.has('betelgeuse|muOri')).toBe(true)
    expect(orion.has('alnilam|alnitak')).toBe(true)
    expect(orion.has('alnitak|betelgeuse')).toBe(true)

    const ursaMajor = edgesOf('大熊座')
    expect(ursaMajor.has('dubhe|merak')).toBe(true)
    expect(ursaMajor.has('megrez|phecda')).toBe(true)
    expect(ursaMajor.has('alkaid|mizar')).toBe(true)
    expect(ursaMajor.has('dubhe|megrez')).toBe(true)
    expect(ursaMajor.has('dubhe|iotaUma')).toBe(false)

    const ursaMinor = edgesOf('小熊座')
    expect(ursaMinor.has('polaris|yildun')).toBe(true)
    expect(ursaMinor.has('epsUmi|zetaUmi')).toBe(true)
    expect(ursaMinor.has('kochab|zetaUmi')).toBe(true)
    expect(ursaMinor.has('kochab|pherkad')).toBe(true)
    expect(ursaMinor.has('etaUmi|pherkad')).toBe(true)
    expect(ursaMinor.has('etaUmi|kochab')).toBe(false)

    const leo = edgesOf('狮子座')
    expect(leo.has('thetaLeo|zosma')).toBe(true)

    const draco = edgesOf('天龙座')
    expect(draco.has('grumium|zetaDra')).toBe(true)
    expect(draco.has('rastaban|zetaDra')).toBe(false)
    expect(draco.has('etaDra|zetaDra')).toBe(true)

    const hydra = edgesOf('长蛇座')
    expect(hydra.has('alphard|lambdaHya')).toBe(true)
    expect(hydra.has('lambdaHya|nuHya')).toBe(true)
    expect(hydra.has('gammaHya|nuHya')).toBe(false)

    const cepheus = edgesOf('仙王座')
    expect(cepheus.has('alderamin|alfirk')).toBe(true)
    expect(cepheus.has('errai|zetaCep')).toBe(false)

    const grus = edgesOf('天鹤座')
    expect(grus.has('alnair|gammaGru')).toBe(true)
    expect(grus.has('alnair|betaGru')).toBe(true)
    expect(grus.has('betaGru|gammaGru')).toBe(false)
  })
})
