/** 把 YAML 星座连线接到运行时星表：线段几何 + 名称锚点（所用恒星方向的平均）。 */
import { equatorialUnit } from '@/engine/coordinates/skyMath'
import { constellationLines } from '@/data/catalog'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import type { Star } from '@/shared/types/star'

export type ConstellationStars = {
  name: string
  segments: Star[][]
}

export type ConstellationAnchor = {
  name: string
  x: number
  y: number
  z: number
}

export function buildConstellationStars(catalog: RuntimeCatalog): ConstellationStars[] {
  return constellationLines.map((line) => ({
    name: line.name,
    segments: line.segments.map((segment) =>
      segment.map((id) => catalog.starById.get(id)).filter((star): star is Star => Boolean(star)),
    ),
  }))
}

export function buildConstellationAnchors(constellationStars: ConstellationStars[]): ConstellationAnchor[] {
  return constellationStars.map((line) => {
    let x = 0
    let y = 0
    let z = 0
    line.segments.forEach((segment) => {
      segment.forEach((star) => {
        const vector = equatorialUnit(star.raHours, star.decDeg)
        x += vector.x
        y += vector.y
        z += vector.z
      })
    })
    const length = Math.hypot(x, y, z) || 1
    return { name: line.name, x: x / length, y: y / length, z: z / length }
  })
}
