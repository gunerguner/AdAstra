/** 快速导航：把天体此刻的地平坐标换成相机朝向。优先水平转向，地平下不转。 */
import type { BodySnapshot } from '@/engine/astronomy/bodyInterpolation'
import { moonPhaseName } from '@/engine/astronomy/moonPhaseName'
import { fillEqjHorizonMatrices } from '@/engine/coordinates/skyMath'
import { clampViewAltitude } from '@/engine/interaction/viewConstraints'
import { poseOfSkyObject } from '@/engine/interaction/skyPose'
import type { Observer } from '@/shared/types/observer'
import type { SelectedSkyObject, SkyView } from '@/shared/types/sky'
import type { Star } from '@/shared/types/star'

export type LocateSkyTargetInput = {
  id: string
  type: 'star' | 'body'
  bodies: BodySnapshot[]
  starById: Map<string, Star>
  utcMillis: number
  observer: Observer
  view: SkyView
}

export type LocateSkyTargetResult = {
  azimuth: number
  altitude: number
  targetAltitude: number
  belowHorizon: boolean
  selected: SelectedSkyObject
}

/** 立体投影上半屏比下半屏多露出天空，所以向上容差更大。 */
const VIEW_HALF_UP = 0.68
const VIEW_HALF_DOWN = 0.35
const VIEW_NUDGE = 0.85

function selectedFromTarget(
  input: LocateSkyTargetInput,
  pose: { azimuth: number; altitude: number },
): SelectedSkyObject | null {
  if (input.type === 'body') {
    const body = input.bodies.find((entry) => entry.id === input.id)
    if (!body) return null
    return {
      id: body.id,
      name: body.name,
      type: 'body',
      magnitude: body.magnitude,
      altitude: pose.altitude,
      azimuth: pose.azimuth,
      phaseFraction: body.phaseFraction,
      phaseName: body.id === 'moon' && body.synodicDeg != null ? moonPhaseName(body.synodicDeg) : undefined,
    }
  }
  const star = input.starById.get(input.id)
  if (!star) return null
  return {
    id: star.id,
    name: star.name,
    type: 'star',
    magnitude: star.magnitude,
    constellation: star.constellation,
    altitude: pose.altitude,
    azimuth: pose.azimuth,
  }
}

export function aimSkyView(view: SkyView, target: { azimuth: number; altitude: number }) {
  if (target.altitude < 0) {
    return { azimuth: view.azimuth, altitude: view.altitude, belowHorizon: true }
  }
  const halfUp = view.fov * VIEW_HALF_UP
  const halfDown = view.fov * VIEW_HALF_DOWN
  let altitude = view.altitude
  if (target.altitude > view.altitude + halfUp) {
    altitude = clampViewAltitude(target.altitude - halfUp * VIEW_NUDGE)
  } else if (target.altitude < view.altitude - halfDown) {
    altitude = clampViewAltitude(target.altitude + halfDown * VIEW_NUDGE)
  }
  return { azimuth: target.azimuth, altitude, belowHorizon: false }
}

export function locateSkyTarget(input: LocateSkyTargetInput): LocateSkyTargetResult | null {
  const horizonMat = new Float32Array(9)
  const eqjHorizonMat = new Float32Array(9)
  fillEqjHorizonMatrices(input.utcMillis, input.observer, horizonMat, eqjHorizonMat)
  const pose = poseOfSkyObject(
    { id: input.id, type: input.type },
    {
      bodies: input.bodies,
      starById: input.starById,
      horizonMat,
      eqjHorizonMat,
      horizonScratch: { x: 0, y: 0, z: 0 },
    },
  )
  if (!pose) return null
  const selected = selectedFromTarget(input, pose)
  if (!selected) return null
  const aimed = aimSkyView(input.view, pose)
  return {
    azimuth: aimed.azimuth,
    altitude: aimed.altitude,
    targetAltitude: pose.altitude,
    belowHorizon: aimed.belowHorizon,
    selected,
  }
}
