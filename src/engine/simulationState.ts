import type { Observer } from './skyMath'

export type LayerState = {
  stars: boolean
  constellationLines: boolean
  constellationNames: boolean
  bodies: boolean
  horizon: boolean
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
}
