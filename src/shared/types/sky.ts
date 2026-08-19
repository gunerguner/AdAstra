import type { Observer } from './observer'

export type SelectedSkyObject = {
  id: string
  name: string
  type: 'star' | 'body'
  magnitude?: number
  constellation?: string
  altitude: number
  azimuth: number
  phaseFraction?: number
  phaseName?: string
}

export type LayerState = {
  stars: boolean
  constellationLines: boolean
  constellationNames: boolean
  bodies: boolean
  horizon: boolean
  landscape: boolean
  showBelowHorizon: boolean
  ecliptic: boolean
  celestialEquator: boolean
  equatorialGrid: boolean
  horizontalGrid: boolean
  milkyWay: boolean
  daylightEffect: boolean
}

export type SkySimulation = {
  utcMillis: number
  observer: Observer
  magnitudeLimit: number
  layers: LayerState
  azimuth: number
  altitude: number
  fov: number
  scrubbing?: boolean
  wake?: () => void
}

export type SkyView = {
  azimuth: number
  altitude: number
  fov: number
}
