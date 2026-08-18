import { BufferGeometry, Group, Line, LineLoop, Mesh, SphereGeometry, Vector3 } from 'three'
import { eclipticEquatorialUnit, equatorialUnit } from '@/engine/coordinates/skyMath'
import { toVector3 } from '@/engine/coordinates/skyGeometry'
import { makeGroundMaterial } from '@/engine/render/materials/groundMaterial'
import { makeSkyLineMaterial } from '@/engine/render/materials/skyLineMaterial'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function createHelperLayer(uniforms: {
  horizonMat: Float32Array
  sky: SkyProjectionUniforms
  showBelow: { value: number }
}) {
  const group = new Group()
  const groundMaterial = makeGroundMaterial(uniforms.sky)
  const ground = new Mesh(new SphereGeometry(1, 64, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), groundMaterial)
  ground.frustumCulled = false
  ground.renderOrder = 0
  const horizon = new LineLoop(
    new BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, index) => {
      const angle = (index / 360) * Math.PI * 2
      return new Vector3(Math.sin(angle), 0, Math.cos(angle))
    })),
    makeSkyLineMaterial('#f8e6b8', 1, false, uniforms),
  )
  const horizonGlow = new LineLoop(
    new BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, index) => {
      const angle = (index / 360) * Math.PI * 2
      return new Vector3(Math.sin(angle), 0.006, Math.cos(angle))
    })),
    makeSkyLineMaterial('#e0b56a', 0.72, false, uniforms),
  )
  horizon.renderOrder = 6
  horizonGlow.renderOrder = 6
  group.add(ground, horizonGlow, horizon)

  const ecliptic = new Line(
    new BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, index) => toVector3(eclipticEquatorialUnit(index)))),
    makeSkyLineMaterial('#f0a03a', 0.92, true, uniforms),
  )
  const equator = new Line(
    new BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, index) => toVector3(equatorialUnit((index / 360) * 24, 0)))),
    makeSkyLineMaterial('#4cc4e8', 0.88, true, uniforms),
  )
  ecliptic.renderOrder = 7
  equator.renderOrder = 7
  group.add(ecliptic, equator)

  return { group, ground, groundMaterial, horizon, horizonGlow, ecliptic, equator }
}
