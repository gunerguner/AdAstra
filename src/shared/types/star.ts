/** 恒星目录类型。坐标是 J2000 赤道，运行时再转到当地地平。 */

/** 一颗恒星。构建期打进二进制星表，启动时由 catalogService 载入。 */
export type Star = {
  /** 星表主键，如 `HIP 32349`。星座连线也用这个 id 引用。 */
  id: string
  /** 显示名，优先常用中文名。 */
  name: string
  /** 所属星座名。 */
  constellation: string
  /** J2000 赤经（时）。24 时 = 360°，1 时 = 15°。 */
  raHours: number
  /** J2000 赤纬（度）。天赤道为 0，北天极为 +90。 */
  decDeg: number
  /** 视星等，越小越亮。目录按此字段升序，便于按上限截断。 */
  magnitude: number
  /** 点精灵颜色，CSS 色值。 */
  color: string
}

/** 一条星座连线：名称 + 若干段，每段是按顺序连接的恒星 id。 */
export type ConstellationLine = {
  /** 星座名。 */
  name: string
  /** 线段列表。每段是恒星 id 数组，运行时用 `starById` 取坐标。 */
  segments: string[][]
}

/** 已按视星等升序的目录里，不暗于 `limit` 的恒星数量（左闭右开上界）。 */
export function countStarsThroughMagnitude(stars: readonly { magnitude: number }[], limit: number) {
  let low = 0
  let high = stars.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (stars[mid].magnitude <= limit) low = mid + 1
    else high = mid
  }
  return low
}
