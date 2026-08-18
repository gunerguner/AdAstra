import { Mesh, SphereGeometry, type ShaderMaterial } from 'three'
import { makeSkyLimbMaterial } from '@/engine/render/materials/skyLimbMaterial'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function createSkyLimbLayer(sky: SkyProjectionUniforms) {
  const material = makeSkyLimbMaterial(sky)
  const mesh = new Mesh(new SphereGeometry(1, 256, 128), material)
  mesh.frustumCulled = false
  mesh.renderOrder = 1
  return { mesh, material }
}

export function disposeSkyLimbLayer(mesh: Mesh) {
  mesh.geometry.dispose()
  ;(mesh.material as ShaderMaterial).dispose()
}
