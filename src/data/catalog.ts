/** 构建期星座 YAML：解析成连线几何，并附带南天座等 YAML 里没有的双语名。 */
import { AppError } from '@/shared/errors/appError'
import type { LocalizedName } from '@/shared/types/star'
import constellationCatalog from './constellations.yaml'
import type { ConstellationLine } from '@/shared/types/star'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** YAML 里没有名字的南天座，启动时并进 constellationById。 */
const EXTRA_CONSTELLATION_NAMES: Record<string, LocalizedName> = {
  Tuc: { zh: '杜鹃座', en: 'Tucana' },
  Hyi: { zh: '水蛇座', en: 'Hydrus' },
  Mus: { zh: '苍蝇座', en: 'Musca' },
}

/** 校验 YAML 形状后抽出 id / 双语名 / 连线段。 */
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

/** YAML 解析后的星座连线。 */
export const constellationLines: ConstellationLine[] = readConstellations(constellationCatalog)

/** IAU 代码 → 双语名；含 YAML 条目和 EXTRA_CONSTELLATION_NAMES。 */
export const constellationById = new Map<string, LocalizedName>([
  ...constellationLines.map((line) => [line.id, line.names] as const),
  ...Object.entries(EXTRA_CONSTELLATION_NAMES),
])
