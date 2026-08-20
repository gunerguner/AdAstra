/** 空闲降到约 4fps，拖拽/时间变化后短时满帧。 */
export const IDLE_FRAME_MS = 250
export const INTERACTION_HOLD_MS = 450

export type RenderScheduleInput = {
  hidden: boolean
  now: number
  lastWakeAt: number
  utcMillis: number
  lastUtcMillis: number
  viewChanged: boolean
  layersChanged: boolean
}

export function isFullRateFrame(input: RenderScheduleInput) {
  if (input.hidden) return false
  if (input.viewChanged || input.layersChanged) return true
  if (input.utcMillis !== input.lastUtcMillis) return true
  return input.now - input.lastWakeAt < INTERACTION_HOLD_MS
}

export function nextFrameDelayMs(fullRate: boolean) {
  return fullRate ? 0 : IDLE_FRAME_MS
}
