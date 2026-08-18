import type { BodySnapshot } from '@/engine/astronomy/astronomyService'
import { applyHorizonMatrixInto, equatorialUnit, horizonAnglesFromVector } from '@/engine/coordinates/skyMath'
import type { Star } from '@/shared/types/star'

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
    applyHorizonMatrixInto(equatorialUnit(body.raHours, body.decDeg), options.horizonMat, options.horizonScratch)
    return horizonAnglesFromVector(options.horizonScratch)
  }
  const star = options.starById.get(item.id)
  if (!star) return null
  applyHorizonMatrixInto(equatorialUnit(star.raHours, star.decDeg), options.horizonMat, options.horizonScratch)
  return horizonAnglesFromVector(options.horizonScratch)
}
