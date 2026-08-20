/** 选中对象此刻的方位/高度：恒星走岁差后的地平矩阵，行星走日期赤道地平矩阵。 */
import type { BodySnapshot } from '@/engine/astronomy/bodyInterpolation'
import { applyHorizonMatrixInto, equatorialUnitInto, horizonAnglesFromVector } from '@/engine/coordinates/skyMath'
import type { Star } from '@/shared/types/star'

const unitScratch = { x: 0, y: 0, z: 0 }

function poseFromEquatorial(
  raHours: number,
  decDeg: number,
  horizonMat: Float32Array,
  horizonScratch: { x: number; y: number; z: number },
) {
  applyHorizonMatrixInto(equatorialUnitInto(raHours, decDeg, unitScratch), horizonMat, horizonScratch)
  return horizonAnglesFromVector(horizonScratch)
}

export function poseOfSkyObject(
  item: { id: string; type: 'star' | 'body' },
  options: {
    bodies: BodySnapshot[]
    starById: Map<string, Star>
    horizonMat: Float32Array
    eqjHorizonMat: Float32Array
    horizonScratch: { x: number; y: number; z: number }
  },
) {
  if (item.type === 'body') {
    const body = options.bodies.find((entry) => entry.id === item.id)
    if (!body) return null
    return poseFromEquatorial(body.raHours, body.decDeg, options.horizonMat, options.horizonScratch)
  }
  const star = options.starById.get(item.id)
  if (!star) return null
  return poseFromEquatorial(star.raHours, star.decDeg, options.eqjHorizonMat, options.horizonScratch)
}
