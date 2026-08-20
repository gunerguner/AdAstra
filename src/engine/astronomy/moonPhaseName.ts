/** 月相：朔望角 → 中文名。 */
import { wrapDegrees } from '@/shared/math'

const phaseNames = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'] as const

export type MoonPhaseName = (typeof phaseNames)[number]

const MOON_PHASE_STEP_DEG = 360 / phaseNames.length

export function moonPhaseName(synodicDeg: number): MoonPhaseName {
  const index = Math.round(wrapDegrees(synodicDeg) / MOON_PHASE_STEP_DEG) % phaseNames.length
  return phaseNames[index]
}
