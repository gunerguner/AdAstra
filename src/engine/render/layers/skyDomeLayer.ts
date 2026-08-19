import { Mesh, PlaneGeometry, type ShaderMaterial } from 'three'
import { makeSkyDomeMaterial } from '@/engine/render/materials/skyDomeMaterial'
import type { SharedSkyUniforms } from '@/engine/render/skyContext'

export function createSkyDomeLayer(uniforms: SharedSkyUniforms) {
  const material = makeSkyDomeMaterial(uniforms)
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  mesh.renderOrder = -1
  return { mesh, material }
}

export function disposeSkyDomeLayer(mesh: Mesh) {
  mesh.geometry.dispose()
  ;(mesh.material as ShaderMaterial).dispose()
}
