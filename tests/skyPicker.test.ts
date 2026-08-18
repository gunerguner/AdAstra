import { describe, expect, it } from 'vitest'
import { Camera, Vector3 } from 'three'
import { pickSkyObject } from '../src/engine/interaction/skyPicker'
import { defaultLayers } from '../src/config/defaultLayers'
import type { Star } from '../src/shared/types/star'
import type { BodySnapshot } from '../src/engine/astronomy/astronomyService'

const identityCamera = {
  matrixWorldInverse: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
} as Camera

const star: Star = {
  id: 'sirius',
  name: '天狼星',
  constellation: '大犬座',
  raHours: 12,
  decDeg: -90,
  magnitude: -1.46,
  color: '#fff',
}

const body: BodySnapshot = {
  id: 'jupiter',
  name: '木星',
  altitude: 0,
  azimuth: 0,
  raHours: 12,
  decDeg: -90,
  magnitude: -2,
  phaseAngle: 12,
  phaseFraction: 0.98,
}

function pick(overrides: Partial<Parameters<typeof pickSkyObject>[0]> = {}) {
  return pickSkyObject({
    ndcX: 0,
    ndcY: -0.52,
    minScreenSize: 800,
    pixelRatio: 1,
    camera: identityCamera,
    fov: 72,
    aspect: 1,
    layers: defaultLayers,
    magnitudeLimit: 6,
    stars: [star],
    countStarsThroughMagnitude: () => 1,
    bodies: [body],
    horizonMat: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    horizonScratch: { x: 0, y: 0, z: 0 },
    projected: new Vector3(),
    ...overrides,
  })
}

describe('skyPicker', () => {
  it('天体优先于恒星', () => {
    const hit = pick()
    expect(hit?.type).toBe('body')
    expect(hit?.id).toBe('jupiter')
  })

  it('关闭天体层后拾取恒星', () => {
    const hit = pick({ layers: { ...defaultLayers, bodies: false } })
    expect(hit?.type).toBe('star')
    expect(hit?.id).toBe('sirius')
  })

  it('地平线以下对象在默认图层中被裁掉', () => {
    const below: Star = { ...star, id: 'below', raHours: 0, decDeg: 90 }
    expect(pick({
      layers: { ...defaultLayers, bodies: false, showBelowHorizon: false },
      stars: [below],
    })).toBeNull()
  })
})
