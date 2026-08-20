/** 地面剪影、地平圈、黄道、天赤道。 */
import { BufferGeometry, Group, Line, LineLoop, Vector3 } from 'three'
import { eclipticEquatorialUnit, equatorialUnit } from '@/engine/coordinates/skyMath'
import { HOURS_PER_DAY } from '@/engine/coordinates/astroConstants'
import { densifyGreatCircle, toVector3 } from '@/engine/coordinates/skyGeometry'
import { makeGroundMaterial } from '@/engine/render/materials/groundMaterial'
import { makeSkyLineMaterial } from '@/engine/render/materials/skyLineMaterial'
import { createFullscreenLayer } from '@/engine/render/layers/fullscreenLayer'
import type { SharedSkyUniforms } from '@/engine/render/skyContext'

function horizonCircle(y: number) {
  return Array.from({ length: 361 }, (_, index) => {
    const angle = (index / 360) * Math.PI * 2
    return new Vector3(Math.sin(angle), y, Math.cos(angle))
  })
}

export function createHelperLayer(uniforms: SharedSkyUniforms) {
  const group = new Group()
  const { mesh: ground, material: groundMaterial } = createFullscreenLayer(makeGroundMaterial(uniforms), 5)
  const horizon = new LineLoop(
    new BufferGeometry().setFromPoints(horizonCircle(0)),
    makeSkyLineMaterial('#f8e6b8', 1, false, uniforms, {
      color: '#435c65',
      opacity: 0.5,
    }),
  )
  const horizonGlow = new LineLoop(
    new BufferGeometry().setFromPoints(horizonCircle(0.006)),
    makeSkyLineMaterial('#e0b56a', 0.72, false, uniforms, {
      color: '#76909a',
      opacity: 0.16,
    }),
  )
  horizon.renderOrder = 6
  horizonGlow.renderOrder = 6
  group.add(ground, horizonGlow, horizon)

  const j2000Uniforms = { ...uniforms, horizonMat: uniforms.eqjHorizonMat }
  const ecliptic = new Line(
    new BufferGeometry().setFromPoints(densifyGreatCircle(
      Array.from({ length: 361 }, (_, index) => toVector3(eclipticEquatorialUnit(index))),
    )),
    makeSkyLineMaterial('#f0a03a', 0.92, true, j2000Uniforms, {
      color: '#d35400',
      opacity: 0.9,
    }),
  )
  const equator = new Line(
    new BufferGeometry().setFromPoints(densifyGreatCircle(
      Array.from({ length: 361 }, (_, index) => toVector3(equatorialUnit((index / 360) * HOURS_PER_DAY, 0))),
    )),
    makeSkyLineMaterial('#4cc4e8', 0.88, true, j2000Uniforms, {
      color: '#0b5f8a',
      opacity: 0.9,
    }),
  )
  ecliptic.renderOrder = 4
  equator.renderOrder = 4
  group.add(ecliptic, equator)

  return { group, ground, groundMaterial, horizon, horizonGlow, ecliptic, equator }
}
