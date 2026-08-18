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
