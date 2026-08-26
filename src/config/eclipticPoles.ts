import { NORTH_ECLIPTIC_POLE, SOUTH_ECLIPTIC_POLE } from '@/engine/coordinates/astroConstants'

export const eclipticPoles = [
  { id: 'north', ...NORTH_ECLIPTIC_POLE },
  { id: 'south', ...SOUTH_ECLIPTIC_POLE },
] as const
