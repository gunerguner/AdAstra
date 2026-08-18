const phaseNames = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'] as const

export type MoonPhaseName = (typeof phaseNames)[number]

export function wrapDegrees(value: number) {
  return ((value % 360) + 360) % 360
}

export function lerpDegrees(from: number, to: number, t: number) {
  const delta = ((to - from + 540) % 360) - 180
  return wrapDegrees(from + delta * t)
}

export function moonPhaseName(synodicDeg: number): MoonPhaseName {
  const index = Math.round(wrapDegrees(synodicDeg) / 45) % 8
  return phaseNames[index]
}
