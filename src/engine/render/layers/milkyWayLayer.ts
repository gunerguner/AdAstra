/** 银河：银道坐标系下的球体，噪声着色器画带状亮带。 */
import { Mesh, SphereGeometry, Vector3 } from 'three'
import { equatorialUnit } from '@/engine/coordinates/skyMath'
import { GALACTIC_CENTER, NORTH_GALACTIC_POLE } from '@/engine/coordinates/astroConstants'
import { makeMilkyWayMaterial } from '@/engine/render/materials/milkyWayMaterial'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function createMilkyWayLayer(uniforms: {
  horizonMat: Float32Array
  sky: SkyProjectionUniforms
  showBelow: { value: number }
  daylight: { value: number }
}) {
  const ngp = equatorialUnit(NORTH_GALACTIC_POLE.raHours, NORTH_GALACTIC_POLE.decDeg)
  const gc = equatorialUnit(GALACTIC_CENTER.raHours, GALACTIC_CENTER.decDeg)
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
