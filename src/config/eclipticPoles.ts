import { NORTH_ECLIPTIC_POLE, SOUTH_ECLIPTIC_POLE } from '@/engine/coordinates/astroConstants'

export const eclipticPoles = [
  { id: 'north', label: '黄北极', ...NORTH_ECLIPTIC_POLE },
  { id: 'south', label: '黄南极', ...SOUTH_ECLIPTIC_POLE },
] as const
