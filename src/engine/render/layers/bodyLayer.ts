import { BufferAttribute, BufferGeometry, Points, type Camera, type ShaderMaterial, type Texture, Vector3 } from 'three'
import type { BodySnapshot } from '@/engine/astronomy/astronomyService'
import { applyHorizonMatrixInto, equatorialUnit } from '@/engine/coordinates/skyMath'
import { bodyAppearance, bodyPointSize, bodyRenderOrder } from '@/engine/render/bodyAppearance'
import { brightLimbAngle } from '@/engine/render/bodyLimb'
import { createBodyAtlasTexture } from '@/engine/render/createBodyAtlas'
import { makeBodyMaterial } from '@/engine/render/materials/bodyMaterial'
import { projectSkyToNdc } from '@/engine/render/skyProjection'
import type { LayerState } from '@/shared/types/sky'
import type { SkyProjectionUniforms, Vec3 } from '@/engine/render/skyContext'

const bodyIds = bodyRenderOrder
const sunView = new Vector3()
const bodyView = new Vector3()

export function createBodiesLayer(sky: SkyProjectionUniforms, pixelRatio: number) {
  const geometry = new BufferGeometry()
  const count = bodyIds.length
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('size', new BufferAttribute(new Float32Array(count), 1))
  geometry.setAttribute('opacity', new BufferAttribute(new Float32Array(count), 1))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(count * 3), 3))
  const atlas = createBodyAtlasTexture()
  const material = makeBodyMaterial({ sky, pixelRatio, atlas })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 10
  points.userData.atlas = atlas
  return { points, geometry, material }
}

export function updateBodiesLayer(
  points: Points,
  snapshots: BodySnapshot[],
  layers: LayerState,
  horizonMat: Float32Array,
  horizonScratch: Vec3,
  camera: Camera,
  fov: number,
  aspect: number,
  projected: Vector3,
) {
  if (!layers.bodies) {
    points.visible = false
    return
  }
  const positions = points.geometry.getAttribute('position') as BufferAttribute
  const sizes = points.geometry.getAttribute('size') as BufferAttribute
  const opacities = points.geometry.getAttribute('opacity') as BufferAttribute
  const colors = points.geometry.getAttribute('color') as BufferAttribute
  const byId = new Map(snapshots.map((body) => [body.id, body]))
  const sun = byId.get('sun')
  let hasSunView = false
  if (sun) {
    applyHorizonMatrixInto(equatorialUnit(sun.raHours, sun.decDeg), horizonMat, horizonScratch)
    sunView.set(horizonScratch.x, horizonScratch.y, horizonScratch.z).applyMatrix4(camera.matrixWorldInverse)
    hasSunView = true
  }
  bodyIds.forEach((id, index) => {
    const body = byId.get(id)
    const appearance = bodyAppearance[id]
    if (!body || !appearance) {
      sizes.setX(index, 0)
      opacities.setX(index, 0)
      return
    }
    applyHorizonMatrixInto(equatorialUnit(body.raHours, body.decDeg), horizonMat, horizonScratch)
    const ndc = projectSkyToNdc(
      projected.set(horizonScratch.x, horizonScratch.y, horizonScratch.z),
      camera,
      fov,
      aspect,
    )
    const onScreen = ndc != null && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1
    const above = horizonScratch.y >= -0.12 || layers.showBelowHorizon
    const show = above && onScreen
    positions.setXYZ(index, horizonScratch.x, horizonScratch.y, horizonScratch.z)
    sizes.setX(index, show ? bodyPointSize(id, body.magnitude) : 0)
    opacities.setX(index, show ? (horizonScratch.y > 0 ? 1 : 0.28) : 0)
    bodyView.set(horizonScratch.x, horizonScratch.y, horizonScratch.z).applyMatrix4(camera.matrixWorldInverse)
    const phase = id === 'sun' ? 0 : body.phaseAngle * Math.PI / 180
    const limb = id === 'sun' || !hasSunView ? 0 : brightLimbAngle(bodyView, sunView)
    colors.setXYZ(index, appearance.atlasIndex, phase, limb)
  })
  positions.needsUpdate = true
  sizes.needsUpdate = true
  opacities.needsUpdate = true
  colors.needsUpdate = true
  points.visible = true
}

export function disposeBodiesLayer(points: Points) {
  points.geometry.dispose()
  const atlas = points.userData.atlas as Texture | undefined
  atlas?.dispose()
  ;(points.material as ShaderMaterial).dispose()
}
