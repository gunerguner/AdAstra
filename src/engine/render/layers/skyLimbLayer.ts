import { Mesh, PlaneGeometry, type ShaderMaterial } from 'three'
import { makeSkyLimbMaterial } from '@/engine/render/materials/skyLimbMaterial'
import type { SharedSkyUniforms } from '@/engine/render/skyContext'

export function createSkyLimbLayer(uniforms: SharedSkyUniforms) {
  const material = makeSkyLimbMaterial(uniforms)
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  mesh.renderOrder = 20
  return { mesh, material }
}

export function disposeSkyLimbLayer(mesh: Mesh) {
  mesh.geometry.dispose()
  ;(mesh.material as ShaderMaterial).dispose()
}
