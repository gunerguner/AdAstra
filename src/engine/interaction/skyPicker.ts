import type { Camera, Vector3 } from 'three'
import type { BodySnapshot } from '@/engine/astronomy/astronomyService'
import { applyHorizonMatrixInto, equatorialUnit, horizonAnglesFromVector } from '@/engine/coordinates/skyMath'
import { projectSkyToNdc } from '@/engine/render/skyProjection'
import { moonPhaseName } from '@/engine/astronomy/moonPhaseName'
import { bodyAppearance, bodyPickSize, starPointSize } from '@/engine/render/bodyAppearance'
import type { SelectedSkyObject } from '@/shared/types/sky'
import type { Star } from '@/shared/types/star'
import type { LayerState } from '@/shared/types/sky'
import { ndcRadiusForPixels } from './overlayProjection'

export type PickInput = {
  ndcX: number
  ndcY: number
  minScreenSize: number
  pixelRatio: number
  camera: Camera
  fov: number
  aspect: number
  layers: LayerState
  magnitudeLimit: number
  stars: Star[]
  countStarsThroughMagnitude: (limit: number) => number
  bodies: BodySnapshot[]
  horizonMat: Float32Array
  horizonScratch: { x: number; y: number; z: number }
  projected: Vector3
}

function pickBody(input: PickInput): SelectedSkyObject | null {
  if (!input.layers.bodies) return null
  let best: {
    id: string
    name: string
    magnitude: number
    altitude: number
    azimuth: number
    distance: number
    priority: number
    phaseFraction?: number
    synodicDeg?: number
  } | null = null
  for (const item of input.bodies) {
    const appearance = bodyAppearance[item.id]
    applyHorizonMatrixInto(equatorialUnit(item.raHours, item.decDeg), input.horizonMat, input.horizonScratch)
    if (!input.layers.showBelowHorizon && input.horizonScratch.y < -0.05) continue
    const ndc = projectSkyToNdc(
      input.projected.set(input.horizonScratch.x, input.horizonScratch.y, input.horizonScratch.z),
      input.camera,
      input.fov,
      input.aspect,
    )
    if (!ndc) continue
    const distance = Math.hypot(ndc.x - input.ndcX, ndc.y - input.ndcY)
    const radius = ndcRadiusForPixels(bodyPickSize(item.id, item.magnitude) * 0.85 + 16, input.minScreenSize)
    if (distance > radius) continue
    const priority = appearance?.priority ?? 10
    if (best && (priority < best.priority || (priority === best.priority && distance >= best.distance))) continue
    best = {
      ...item,
      distance,
      priority,
      ...horizonAnglesFromVector(input.horizonScratch),
    }
  }
  if (!best) return null
  return {
    id: best.id,
    name: best.name,
    type: 'body',
    magnitude: best.magnitude,
    altitude: best.altitude,
    azimuth: best.azimuth,
    phaseFraction: best.phaseFraction,
    phaseName: best.id === 'moon' && best.synodicDeg != null ? moonPhaseName(best.synodicDeg) : undefined,
  }
}

function pickStar(input: PickInput): SelectedSkyObject | null {
  const limit = input.countStarsThroughMagnitude(input.magnitudeLimit)
  let best: { star: Star; altitude: number; azimuth: number; distance: number } | null = null
  for (let index = 0; index < limit; index += 1) {
    const star = input.stars[index]
    const horizonDir = applyHorizonMatrixInto(equatorialUnit(star.raHours, star.decDeg), input.horizonMat, input.horizonScratch)
    if (!input.layers.showBelowHorizon && horizonDir.y < -0.05) continue
    const ndc = projectSkyToNdc(input.projected.set(horizonDir.x, horizonDir.y, horizonDir.z), input.camera, input.fov, input.aspect)
    if (!ndc) continue
    const distance = Math.hypot(ndc.x - input.ndcX, ndc.y - input.ndcY)
    const size = starPointSize(star.magnitude)
    const radius = ndcRadiusForPixels(size * input.pixelRatio * 0.65 + 8, input.minScreenSize)
    if (distance > radius || (best && distance >= best.distance)) continue
    best = {
      star,
      ...horizonAnglesFromVector(horizonDir),
      distance,
    }
  }
  if (!best) return null
  return {
    id: best.star.id,
    name: best.star.name,
    type: 'star',
    magnitude: best.star.magnitude,
    constellation: best.star.constellation,
    altitude: best.altitude,
    azimuth: best.azimuth,
  }
}

export function pickSkyObject(input: PickInput): SelectedSkyObject | null {
  const bodyHit = pickBody(input)
  if (bodyHit || !input.layers.stars) return bodyHit
  return pickStar(input)
}
