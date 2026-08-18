import { Mesh, SphereGeometry, Vector3 } from 'three'
import { equatorialUnit } from '@/engine/coordinates/skyMath'
import { makeMilkyWayMaterial } from '@/engine/render/materials/milkyWayMaterial'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function createMilkyWayLayer(uniforms: {
  horizonMat: Float32Array
  sky: SkyProjectionUniforms
  showBelow: { value: number }
  daylight: { value: number }
}) {
  const ngp = equatorialUnit(12.857298, 27.12825)
  const gc = equatorialUnit(17.760333, -28.936175)
  const galZ = new Vector3(ngp.x, ngp.y, ngp.z).normalize()
  const galX = new Vector3(gc.x, gc.y, gc.z)
  galX.sub(galZ.clone().multiplyScalar(galX.dot(galZ))).normalize()
  const galY = new Vector3().crossVectors(galZ, galX).normalize()
  const material = makeMilkyWayMaterial(galX, galY, galZ, uniforms)
  const mesh = new Mesh(new SphereGeometry(1, 96, 48), material)
  mesh.frustumCulled = false
  mesh.renderOrder = 0
  return { mesh, material }
}
