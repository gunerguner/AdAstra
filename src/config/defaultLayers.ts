import type { LayerState } from '@/shared/types/sky'

export const defaultLayers: LayerState = {
  stars: true,
  constellationLines: true,
  constellationNames: true,
  bodies: true,
  horizon: true,
  showBelowHorizon: false,
  ecliptic: true,
  celestialEquator: true,
  equatorialGrid: false,
  horizontalGrid: false,
  milkyWay: true,
  daylightEffect: true,
}
