import { AppError } from '@/shared/errors/appError'
import type { LocalizedName } from '@/shared/types/star'
import constellationCatalog from './constellations.yaml'
import type { ConstellationLine } from '@/shared/types/star'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const EXTRA_CONSTELLATION_NAMES: Record<string, LocalizedName> = {
  Tuc: { zh: '杜鹃座', en: 'Tucana' },
  Hyi: { zh: '水蛇座', en: 'Hydrus' },
  Mus: { zh: '苍蝇座', en: 'Musca' },
}

function readConstellations(value: unknown): ConstellationLine[] {
  if (!isRecord(value) || !Array.isArray(value.constellations)) {
    throw new AppError('catalog', 'error.catalog.constellationFormat')
  }
  return value.constellations.map((item) => {
    if (!isRecord(item) || !Array.isArray(item.segments) || !item.id) {
      throw new AppError('catalog', 'error.catalog.constellationRecord')
    }
    return {
      id: String(item.id),
      names: { zh: String(item.name), en: String(item.nameEn) },
      segments: item.segments.map((segment) => {
        if (!Array.isArray(segment)) {
          throw new AppError('catalog', 'error.catalog.constellationSegment', { params: { name: String(item.id) } })
        }
        return segment.map((id) => String(id))
      }),
    }
  })
}

export const constellationLines: ConstellationLine[] = readConstellations(constellationCatalog)

export const constellationById = new Map<string, LocalizedName>([
  ...constellationLines.map((line) => [line.id, line.names] as const),
  ...Object.entries(EXTRA_CONSTELLATION_NAMES),
])
