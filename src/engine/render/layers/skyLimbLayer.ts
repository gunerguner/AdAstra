import { Mesh, PlaneGeometry, type ShaderMaterial } from 'three'
import { makeSkyLimbMaterial } from '@/engine/render/materials/skyLimbMaterial'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function createSkyLimbLayer(sky: SkyProjectionUniforms) {
  const material = makeSkyLimbMaterial(sky)
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  mesh.renderOrder = 1
  return { mesh, material }
}

export function disposeSkyLimbLayer(mesh: Mesh) {
  mesh.geometry.dispose()
  ;(mesh.material as ShaderMaterial).dispose()
}
