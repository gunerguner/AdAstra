/** 根据平均帧时在 1× 与设备 DPR 上限之间切换，带滞回避免抖动。 */
export const PIXEL_RATIO_CAP = 1.5
export const PIXEL_RATIO_SLOW_MS = 24
export const PIXEL_RATIO_FAST_MS = 16

export function decidePixelRatio(averageFrame: number, current: number, devicePixelRatio: number) {
  const high = Math.min(devicePixelRatio, PIXEL_RATIO_CAP)
  if (averageFrame > PIXEL_RATIO_SLOW_MS) return 1
  if (averageFrame < PIXEL_RATIO_FAST_MS) return high
  return current
}
