/** 全屏 NDC 四边形：天穹、天球边缘、地面都用这块，只换材质和 renderOrder。 */
import { Mesh, PlaneGeometry, type Material, type ShaderMaterial } from 'three'

export function createFullscreenLayer(material: ShaderMaterial, renderOrder: number) {
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  mesh.renderOrder = renderOrder
  return { mesh, material }
}

export function disposeMesh(mesh: { geometry: { dispose: () => void }; material: Material | Material[] }) {
  mesh.geometry.dispose()
  const material = mesh.material
  if (Array.isArray(material)) material.forEach((item) => item.dispose())
  else material.dispose()
}
