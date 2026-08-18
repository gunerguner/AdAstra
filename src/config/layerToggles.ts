import type { LayerState } from '@/shared/types/sky'

export type LayerToggleDef = {
  key: keyof LayerState
  label: string
  swatch?: string
  variant?: 'ecliptic' | 'equator'
}

export const layerToggles: LayerToggleDef[] = [
  { key: 'stars', label: '恒星' },
  { key: 'milkyWay', label: '银河' },
  { key: 'constellationLines', label: '星座' },
  { key: 'bodies', label: '行星' },
  { key: 'horizon', label: '地平' },
  { key: 'showBelowHorizon', label: '地平以下' },
  { key: 'daylightEffect', label: '昼夜影响' },
  { key: 'ecliptic', label: '黄道', swatch: '#f0a03a', variant: 'ecliptic' },
  { key: 'celestialEquator', label: '天赤道', swatch: '#4cc4e8', variant: 'equator' },
  { key: 'equatorialGrid', label: '赤道网' },
  { key: 'horizontalGrid', label: '地平网' },
]
