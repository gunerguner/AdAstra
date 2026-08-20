/** 太阳系天体点精灵：每帧把插值后的方位写进 buffer，并带月相/亮边。 */
import { BufferAttribute, BufferGeometry, Points, type Camera, type ShaderMaterial, type Texture, Vector3 } from 'three'
import type { BodySnapshot } from '@/engine/astronomy/bodyInterpolation'
import { applyHorizonMatrixInto, equatorialUnitInto } from '@/engine/coordinates/skyMath'
import { bodyAppearance, bodyPointSize, bodyRenderOrder } from '@/engine/render/bodyAppearance'
import { brightLimbAngle } from '@/engine/render/bodyLimb'
import { createBodyAtlasTexture } from '@/engine/render/createBodyAtlas'
import { makeBodyMaterial } from '@/engine/render/materials/bodyMaterial'
import { projectSkyToNdc } from '@/engine/render/skyProjection'
import { degToRad } from '@/shared/math'
import type { LayerState } from '@/shared/types/sky'
import type { SkyProjectionUniforms, Vec3 } from '@/engine/render/skyContext'

const bodyIds = bodyRenderOrder
const sunView = new Vector3()
const bodyView = new Vector3()
const unitScratch = { x: 0, y: 0, z: 0 }
const ndcScratch = { x: 0, y: 0, z: 0 }
const snapshotById: Record<string, BodySnapshot | undefined> = Object.create(null)

export function createBodiesLayer(
  sky: SkyProjectionUniforms,
  pixelRatio: number,
  atmosphere?: { daylight: { value: number }; twilight: { value: number } },
) {
  const geometry = new BufferGeometry()
  const count = bodyIds.length
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('size', new BufferAttribute(new Float32Array(count), 1))
  geometry.setAttribute('opacity', new BufferAttribute(new Float32Array(count), 1))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(count * 3), 3))
  const atlas = createBodyAtlasTexture()
  const material = makeBodyMaterial({
    sky,
    pixelRatio,
    atlas,
    daylight: atmosphere?.daylight,
    twilight: atmosphere?.twilight,
  })
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
  for (const id of bodyIds) snapshotById[id] = undefined
  for (const body of snapshots) snapshotById[body.id] = body
  const sun = snapshotById.sun
  let hasSunView = false
  if (sun) {
    applyHorizonMatrixInto(equatorialUnitInto(sun.raHours, sun.decDeg, unitScratch), horizonMat, horizonScratch)
    sunView.set(horizonScratch.x, horizonScratch.y, horizonScratch.z).applyMatrix4(camera.matrixWorldInverse)
    hasSunView = true
  }
  bodyIds.forEach((id, index) => {
    const body = snapshotById[id]
    const appearance = bodyAppearance[id]
    if (!body || !appearance) {
      sizes.setX(index, 0)
      opacities.setX(index, 0)
      return
    }
    applyHorizonMatrixInto(equatorialUnitInto(body.raHours, body.decDeg, unitScratch), horizonMat, horizonScratch)
    const ndc = projectSkyToNdc(
      projected.set(horizonScratch.x, horizonScratch.y, horizonScratch.z),
      camera,
      fov,
      aspect,
      ndcScratch,
    )
    const onScreen = ndc != null && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1
    const above = horizonScratch.y >= -0.12 || layers.showBelowHorizon
    const show = above && onScreen
    positions.setXYZ(index, horizonScratch.x, horizonScratch.y, horizonScratch.z)
    sizes.setX(index, show ? bodyPointSize(id, body.magnitude) : 0)
    opacities.setX(index, show ? (horizonScratch.y > 0 ? 1 : 0.28) : 0)
    bodyView.set(horizonScratch.x, horizonScratch.y, horizonScratch.z).applyMatrix4(camera.matrixWorldInverse)
    const phase = id === 'sun' ? 0 : degToRad(body.phaseAngle)
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
  points.userData.atlas = undefined
  ;(points.material as ShaderMaterial).dispose()
}
