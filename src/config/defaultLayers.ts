import type { LayerState } from '@/shared/types/sky'

export const defaultLayers = {
  stars: true,
  constellationLines: true,
  bodies: true,
  horizon: true,
  landscape: true,
  showBelowHorizon: false,
  ecliptic: true,
  celestialEquator: true,
  equatorialGrid: false,
  horizontalGrid: false,
  milkyWay: true,
  daylightEffect: true,
} satisfies LayerState
