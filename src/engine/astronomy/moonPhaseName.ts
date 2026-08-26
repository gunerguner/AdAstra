/** 月相：朔望角 → 稳定键。界面再按语言显示。 */
import { wrapDegrees } from '@/shared/math'

export const moonPhaseKeys = [
  'new',
  'waxingCrescent',
  'firstQuarter',
  'waxingGibbous',
  'full',
  'waningGibbous',
  'lastQuarter',
  'waningCrescent',
] as const

export type MoonPhaseKey = (typeof moonPhaseKeys)[number]

const MOON_PHASE_STEP_DEG = 360 / moonPhaseKeys.length

export function moonPhaseName(synodicDeg: number): MoonPhaseKey {
  const index = Math.round(wrapDegrees(synodicDeg) / MOON_PHASE_STEP_DEG) % moonPhaseKeys.length
  return moonPhaseKeys[index]
}
