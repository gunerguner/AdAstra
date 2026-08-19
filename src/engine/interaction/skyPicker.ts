/** 点击拾取：天体按屏幕半径，恒星走网格再线性精修。 */
import type { Camera, Vector3 } from 'three'
import type { BodySnapshot } from '@/engine/astronomy/bodyInterpolation'
import { applyHorizonMatrixInto, equatorialUnitInto, horizonAnglesFromVector } from '@/engine/coordinates/skyMath'
import { projectSkyToNdc } from '@/engine/render/skyProjection'
import { moonPhaseName } from '@/engine/astronomy/moonPhaseName'
import { bodyAppearance, bodyPickSize, starPointSize } from '@/engine/render/bodyAppearance'
import type { SelectedSkyObject } from '@/shared/types/sky'
import type { Star } from '@/shared/types/star'
import type { LayerState } from '@/shared/types/sky'
import { ndcRadiusForPixels } from './overlayProjection'
import {
  addStarToPickGrid,
  clearStarPickGrid,
  createStarPickGrid,
  queryStarPickGrid,
  type StarPickGrid,
} from './starPickGrid'

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
  starGrid?: StarPickGrid
  starGridKey?: { current: string }
}

const unitScratch = { x: 0, y: 0, z: 0 }
const ndcScratch = { x: 0, y: 0, z: 0 }
const candidateScratch: number[] = []
const LINEAR_PICK_LIMIT = 400

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
    applyHorizonMatrixInto(equatorialUnitInto(item.raHours, item.decDeg, unitScratch), input.horizonMat, input.horizonScratch)
    if (!input.layers.showBelowHorizon && input.horizonScratch.y < -0.05) continue
    const ndc = projectSkyToNdc(
      input.projected.set(input.horizonScratch.x, input.horizonScratch.y, input.horizonScratch.z),
      input.camera,
      input.fov,
      input.aspect,
      ndcScratch,
    )
    if (!ndc) continue
    const distance = Math.hypot(ndc.x - input.ndcX, ndc.y - input.ndcY)
    const radius = ndcRadiusForPixels(bodyPickSize(item.id, item.magnitude), input.minScreenSize)
    if (distance > radius) continue
    const priority = appearance?.priority ?? 10
    if (best && (distance > best.distance || (distance === best.distance && priority < best.priority))) continue
    best = {
      id: item.id,
      name: item.name,
      magnitude: item.magnitude,
      phaseFraction: item.phaseFraction,
      synodicDeg: item.synodicDeg,
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

function considerStar(input: PickInput, index: number, best: { star: Star; altitude: number; azimuth: number; distance: number } | null) {
  const star = input.stars[index]
  const horizonDir = applyHorizonMatrixInto(
    equatorialUnitInto(star.raHours, star.decDeg, unitScratch),
    input.horizonMat,
    input.horizonScratch,
  )
  if (!input.layers.showBelowHorizon && horizonDir.y < -0.05) return best
  const ndc = projectSkyToNdc(
    input.projected.set(horizonDir.x, horizonDir.y, horizonDir.z),
    input.camera,
    input.fov,
    input.aspect,
    ndcScratch,
  )
  if (!ndc) return best
  const distance = Math.hypot(ndc.x - input.ndcX, ndc.y - input.ndcY)
  const size = starPointSize(star.magnitude)
  const radius = ndcRadiusForPixels(size * input.pixelRatio * 0.65 + 8, input.minScreenSize)
  if (distance > radius || (best && distance >= best.distance)) return best
  return {
    star,
    ...horizonAnglesFromVector(horizonDir),
    distance,
  }
}

function maxStarPickRadius(input: PickInput) {
  return ndcRadiusForPixels(starPointSize(-1.5) * input.pixelRatio * 0.65 + 8, input.minScreenSize)
}

function fillStarGrid(input: PickInput, grid: StarPickGrid, limit: number) {
  clearStarPickGrid(grid)
  for (let index = 0; index < limit; index += 1) {
    const star = input.stars[index]
    const horizonDir = applyHorizonMatrixInto(
      equatorialUnitInto(star.raHours, star.decDeg, unitScratch),
      input.horizonMat,
      input.horizonScratch,
    )
    if (!input.layers.showBelowHorizon && horizonDir.y < -0.05) continue
    const ndc = projectSkyToNdc(
      input.projected.set(horizonDir.x, horizonDir.y, horizonDir.z),
      input.camera,
      input.fov,
      input.aspect,
      ndcScratch,
    )
    if (!ndc) continue
    addStarToPickGrid(grid, index, ndc.x, ndc.y)
  }
}

function pickStar(input: PickInput): SelectedSkyObject | null {
  const limit = input.countStarsThroughMagnitude(input.magnitudeLimit)
  let best: { star: Star; altitude: number; azimuth: number; distance: number } | null = null
  if (limit <= LINEAR_PICK_LIMIT || !input.starGrid) {
    for (let index = 0; index < limit; index += 1) best = considerStar(input, index, best)
  } else {
    const m = input.camera.matrixWorldInverse.elements
    const key = `${m[0]}:${m[2]}:${m[8]}:${m[10]}:${input.fov}:${input.aspect}:${input.magnitudeLimit}:${input.layers.showBelowHorizon}:${limit}`
    if (!input.starGridKey || input.starGridKey.current !== key) {
      fillStarGrid(input, input.starGrid, limit)
      if (input.starGridKey) input.starGridKey.current = key
    }
    queryStarPickGrid(input.starGrid, input.ndcX, input.ndcY, maxStarPickRadius(input), candidateScratch)
    for (const index of candidateScratch) best = considerStar(input, index, best)
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

export function createPickerStarGrid() {
  return createStarPickGrid()
}
