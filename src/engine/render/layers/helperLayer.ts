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
  group.renderOrder = 9
  const groundMaterial = makeGroundMaterial(uniforms.sky)
  const ground = new Mesh(new SphereGeometry(1, 96, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), groundMaterial)
  ground.frustumCulled = false
  ground.renderOrder = 0
  const horizon = new LineLoop(
    new BufferGeometry().setFromPoints(Array.from({ length: 257 }, (_, index) => {
      const angle = (index / 256) * Math.PI * 2
      return new Vector3(Math.sin(angle), 0, Math.cos(angle))
    })),
    makeSkyLineMaterial('#f3e1b0', 1, false, uniforms),
  )
  const horizonGlow = new LineLoop(
    new BufferGeometry().setFromPoints(Array.from({ length: 257 }, (_, index) => {
      const angle = (index / 256) * Math.PI * 2
      return new Vector3(Math.sin(angle), 0.004, Math.cos(angle))
    })),
    makeSkyLineMaterial('#c9a15a', 0.45, false, uniforms),
  )
  group.add(ground, horizonGlow, horizon)

  const ecliptic = new Line(
    new BufferGeometry().setFromPoints(Array.from({ length: 145 }, (_, index) => toVector3(eclipticEquatorialUnit(index * 2.5)))),
    makeSkyLineMaterial('#f0a03a', 0.92, true, uniforms),
  )
  const equator = new Line(
    new BufferGeometry().setFromPoints(Array.from({ length: 145 }, (_, index) => toVector3(equatorialUnit((index / 144) * 24, 0)))),
    makeSkyLineMaterial('#4cc4e8', 0.88, true, uniforms),
  )
  group.add(ecliptic, equator)

  return { group, ground, groundMaterial, horizon, horizonGlow, ecliptic, equator }
}
