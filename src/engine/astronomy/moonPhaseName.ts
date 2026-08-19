/** 月相：朔望角 → 中文名；lerpDegrees 走劣弧，避免 359°→1° 绕远路。 */
const phaseNames = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'] as const

export type MoonPhaseName = (typeof phaseNames)[number]

const MOON_PHASE_STEP_DEG = 360 / phaseNames.length

export function wrapDegrees(value: number) {
  return ((value % 360) + 360) % 360
}

export function lerpDegrees(from: number, to: number, t: number) {
  const delta = ((to - from + 540) % 360) - 180
  return wrapDegrees(from + delta * t)
}

export function moonPhaseName(synodicDeg: number): MoonPhaseName {
  const index = Math.round(wrapDegrees(synodicDeg) / MOON_PHASE_STEP_DEG) % phaseNames.length
  return phaseNames[index]
}
