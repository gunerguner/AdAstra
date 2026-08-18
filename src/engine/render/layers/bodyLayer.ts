import { BufferAttribute, BufferGeometry, Color, Points, type ShaderMaterial } from 'three'
import type { BodySnapshot } from '@/engine/astronomy/astronomyService'
import { applyHorizonMatrixInto, equatorialUnit } from '@/engine/coordinates/skyMath'
import { bodyAppearance, bodyPointSize } from '@/engine/render/bodyAppearance'
import { makeBodyMaterial } from '@/engine/render/materials/bodyMaterial'
import type { LayerState } from '@/shared/types/sky'
import type { SkyProjectionUniforms, Vec3 } from '@/engine/render/skyContext'

const bodyIds = Object.keys(bodyAppearance)

export function createBodiesLayer(sky: SkyProjectionUniforms, pixelRatio: number) {
  const geometry = new BufferGeometry()
  const positions = new Float32Array(bodyIds.length * 3)
  const colors = new Float32Array(bodyIds.length * 3)
  const sizes = new Float32Array(bodyIds.length)
  const opacities = new Float32Array(bodyIds.length)
  const color = new Color()
  bodyIds.forEach((id, index) => {
    const appearance = bodyAppearance[id]
    if (!appearance) return
    color.set(appearance.color)
    colors.set([color.r, color.g, color.b], index * 3)
  })
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setAttribute('size', new BufferAttribute(sizes, 1))
  geometry.setAttribute('opacity', new BufferAttribute(opacities, 1))
  const material = makeBodyMaterial({ sky, pixelRatio })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 8
  return { points, geometry, material }
}

export function updateBodiesLayer(
  points: Points,
  snapshots: BodySnapshot[],
  layers: LayerState,
  horizonMat: Float32Array,
  horizonScratch: Vec3,
) {
  if (!layers.bodies) {
    points.visible = false
    return
  }
  const positions = points.geometry.getAttribute('position') as BufferAttribute
  const sizes = points.geometry.getAttribute('size') as BufferAttribute
  const opacities = points.geometry.getAttribute('opacity') as BufferAttribute
  const byId = new Map(snapshots.map((body) => [body.id, body]))
  bodyIds.forEach((id, index) => {
    const body = byId.get(id)
    if (!body) {
      sizes.setX(index, 0)
      opacities.setX(index, 0)
      return
    }
    applyHorizonMatrixInto(equatorialUnit(body.raHours, body.decDeg), horizonMat, horizonScratch)
    const show = horizonScratch.y >= -0.12 || layers.showBelowHorizon
    positions.setXYZ(index, horizonScratch.x, horizonScratch.y, horizonScratch.z)
    sizes.setX(index, show ? bodyPointSize(id, body.magnitude) : 0)
    opacities.setX(index, show ? (horizonScratch.y > 0 ? 1 : 0.28) : 0)
  })
  positions.needsUpdate = true
  sizes.needsUpdate = true
  opacities.needsUpdate = true
  points.visible = true
}

export function disposeBodiesLayer(points: Points) {
  points.geometry.dispose()
  ;(points.material as ShaderMaterial).dispose()
}
