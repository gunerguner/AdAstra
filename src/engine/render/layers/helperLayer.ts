import { BufferGeometry, Group, Line, LineLoop, Mesh, PlaneGeometry, Vector3 } from 'three'
import { eclipticEquatorialUnit, equatorialUnit } from '@/engine/coordinates/skyMath'
import { toVector3 } from '@/engine/coordinates/skyGeometry'
import { makeGroundMaterial } from '@/engine/render/materials/groundMaterial'
import { makeSkyLineMaterial } from '@/engine/render/materials/skyLineMaterial'
import type { SharedSkyUniforms } from '@/engine/render/skyContext'

export function createHelperLayer(uniforms: SharedSkyUniforms) {
  const group = new Group()
  const groundMaterial = makeGroundMaterial(uniforms)
  const ground = new Mesh(new PlaneGeometry(2, 2), groundMaterial)
  ground.frustumCulled = false
  ground.renderOrder = 5
  const horizon = new LineLoop(
    new BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, index) => {
      const angle = (index / 360) * Math.PI * 2
      return new Vector3(Math.sin(angle), 0, Math.cos(angle))
    })),
    makeSkyLineMaterial('#f8e6b8', 1, false, uniforms, {
      color: '#435c65',
      opacity: 0.5,
    }),
  )
  const horizonGlow = new LineLoop(
    new BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, index) => {
      const angle = (index / 360) * Math.PI * 2
      return new Vector3(Math.sin(angle), 0.006, Math.cos(angle))
    })),
    makeSkyLineMaterial('#e0b56a', 0.72, false, uniforms, {
      color: '#76909a',
      opacity: 0.16,
    }),
  )
  horizon.renderOrder = 6
  horizonGlow.renderOrder = 6
  group.add(ground, horizonGlow, horizon)

  const ecliptic = new Line(
    new BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, index) => toVector3(eclipticEquatorialUnit(index)))),
    makeSkyLineMaterial('#f0a03a', 0.92, true, uniforms, {
      color: '#d35400',
      opacity: 0.9,
    }),
  )
  const equator = new Line(
    new BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, index) => toVector3(equatorialUnit((index / 360) * 24, 0)))),
    makeSkyLineMaterial('#4cc4e8', 0.88, true, uniforms, {
      color: '#0b5f8a',
      opacity: 0.9,
    }),
  )
  ecliptic.renderOrder = 7
  equator.renderOrder = 7
  group.add(ecliptic, equator)

  return { group, ground, groundMaterial, horizon, horizonGlow, ecliptic, equator }
}
