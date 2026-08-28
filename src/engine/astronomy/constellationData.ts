/** 把 YAML 星座连线接到运行时星表：线段几何 + 名称锚点（所用恒星方向的平均）。 */
import { equatorialUnit } from '@/engine/coordinates/skyMath'
import { constellationLines } from '@/data/catalog'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import type { LocalizedName, Star } from '@/shared/types/star'

export type ConstellationStars = {
  id: string
  names: LocalizedName
  segments: Star[][]
}

export type ConstellationAnchor = {
  id: string
  x: number
  y: number
  z: number
}

/** 星座连线：把 YAML 里的恒星 id 换成运行时 Star。缺星则丢掉该点。 */
export function buildConstellationStars(catalog: RuntimeCatalog): ConstellationStars[] {
  return constellationLines.map((line) => ({
    id: line.id,
    names: line.names,
    segments: line.segments.map((segment) =>
      segment.flatMap((id) => {
        const star = catalog.starById.get(id)
        return star ? [star] : []
      }),
    ),
  }))
}

/** 星座名锚点：所属恒星赤道方向的平均，归一化后天球单位向量。 */
export function buildConstellationAnchors(constellationStars: ConstellationStars[]): ConstellationAnchor[] {
  return constellationStars.map((line) => {
    const { x, y, z } = line.segments.flat().reduce(
      (sum, star) => {
        const vector = equatorialUnit(star.raHours, star.decDeg)
        sum.x += vector.x
        sum.y += vector.y
        sum.z += vector.z
        return sum
      },
      { x: 0, y: 0, z: 0 },
    )
    const length = Math.hypot(x, y, z) || 1
    return { id: line.id, x: x / length, y: y / length, z: z / length }
  })
}
