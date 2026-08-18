import type { BodySnapshot } from '@/engine/astronomy/bodyInterpolation'
import { applyHorizonMatrixInto, equatorialUnitInto, horizonAnglesFromVector } from '@/engine/coordinates/skyMath'
import type { Star } from '@/shared/types/star'

const unitScratch = { x: 0, y: 0, z: 0 }

export function poseOfSkyObject(
  item: { id: string; type: 'star' | 'body' },
  options: {
    bodies: BodySnapshot[]
    starById: Map<string, Star>
    horizonMat: Float32Array
    horizonScratch: { x: number; y: number; z: number }
  },
) {
  if (item.type === 'body') {
    const body = options.bodies.find((entry) => entry.id === item.id)
    if (!body) return null
    applyHorizonMatrixInto(equatorialUnitInto(body.raHours, body.decDeg, unitScratch), options.horizonMat, options.horizonScratch)
    return horizonAnglesFromVector(options.horizonScratch)
  }
  const star = options.starById.get(item.id)
  if (!star) return null
  applyHorizonMatrixInto(equatorialUnitInto(star.raHours, star.decDeg, unitScratch), options.horizonMat, options.horizonScratch)
  return horizonAnglesFromVector(options.horizonScratch)
}
