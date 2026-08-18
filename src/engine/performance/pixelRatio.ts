export function decidePixelRatio(averageFrame: number, current: number, devicePixelRatio: number) {
  const high = Math.min(devicePixelRatio, 1.5)
  if (averageFrame > 24) return 1
  if (averageFrame < 16) return high
  return current
}
