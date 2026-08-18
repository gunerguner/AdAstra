import { AppError } from '@/shared/errors/appError'
import constellationCatalog from './constellations.yaml'
import type { ConstellationLine } from '@/shared/types/star'

export type { Star, ConstellationLine } from '@/shared/types/star'
export { countStarsThroughMagnitude } from '@/shared/types/star'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function readConstellations(value: unknown): ConstellationLine[] {
  if (!isRecord(value) || !Array.isArray(value.constellations)) {
    throw new AppError('catalog', '星座数据格式无效')
  }
  return value.constellations.map((item) => {
    if (!isRecord(item) || !Array.isArray(item.segments)) {
      throw new AppError('catalog', '星座数据含有无效记录')
    }
    return {
      name: String(item.name),
      segments: item.segments.map((segment) => {
        if (!Array.isArray(segment)) throw new AppError('catalog', `星座线段无效: ${item.name}`)
        return segment.map((id) => String(id))
      }),
    }
  })
}

export const constellationLines: ConstellationLine[] = readConstellations(constellationCatalog)
