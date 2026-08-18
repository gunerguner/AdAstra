export function decidePixelRatio(averageFrame: number, current: number, devicePixelRatio: number) {
  if (averageFrame > 22) return 1
  if (averageFrame < 17) return Math.min(devicePixelRatio, 1.5)
  return current
}
