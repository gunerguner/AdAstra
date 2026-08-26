import type { LayerState } from '@/shared/types/sky'

export type LayerToggleDef = {
  key: keyof LayerState
  swatch?: string
  variant?: 'ecliptic' | 'equator'
}

export const layerToggles = [
  { key: 'stars' },
  { key: 'milkyWay' },
  { key: 'constellationLines' },
  { key: 'bodies' },
  { key: 'horizon' },
  { key: 'landscape' },
  { key: 'showBelowHorizon' },
  { key: 'daylightEffect' },
  { key: 'ecliptic', swatch: '#f0a03a', variant: 'ecliptic' },
  { key: 'celestialEquator', swatch: '#4cc4e8', variant: 'equator' },
  { key: 'equatorialGrid' },
  { key: 'horizontalGrid' },
] satisfies LayerToggleDef[]
