import { AppError } from '../engine/appError'
import constellationCatalog from './constellations.yaml'

export type Star = {
  id: string
  name: string
  constellation: string
  raHours: number
  decDeg: number
  magnitude: number
  color: string
}

export type ConstellationLine = {
  name: string
  segments: string[][]
}

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

export function countStarsThroughMagnitude(stars: readonly Star[], limit: number) {
  let low = 0
  let high = stars.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (stars[mid].magnitude <= limit) low = mid + 1
    else high = mid
  }
  return low
}

export const constellationLines: ConstellationLine[] = readConstellations(constellationCatalog)
