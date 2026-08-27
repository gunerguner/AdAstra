import { NORTH_ECLIPTIC_POLE, SOUTH_ECLIPTIC_POLE } from '@/engine/coordinates/astroConstants'
import type { LayerState } from '@/shared/types/sky'

export const TIMELINE_RANGE_HOURS = 8
export const TIMELINE_RANGE_MS = TIMELINE_RANGE_HOURS * 60 * 60 * 1000
export const TIMELINE_UI_INTERVAL_MS = 200

export const cardinals = [
  { id: 'north', azimuth: 0 },
  { id: 'east', azimuth: 90 },
  { id: 'south', azimuth: 180 },
  { id: 'west', azimuth: 270 },
] as const

export const eclipticPoles = [
  { id: 'north', ...NORTH_ECLIPTIC_POLE },
  { id: 'south', ...SOUTH_ECLIPTIC_POLE },
] as const

export const playbackSpeeds = [
  { value: 1, id: 'realtime' },
  { value: 60, id: 'minute' },
  { value: 300, id: 'fiveMinute' },
  { value: 3600, id: 'hour' },
  { value: 86400, id: 'day' },
] as const

export const defaultPlaybackSpeed = 300

export type QuickViewPreset = {
  id: 'east' | 'south' | 'west' | 'north' | 'zenith'
  azimuth: number | 'current'
  altitude: number
}

export const quickViews = [
  { id: 'east', azimuth: 90, altitude: 0 },
  { id: 'south', azimuth: 180, altitude: 0 },
  { id: 'west', azimuth: 270, altitude: 0 },
  { id: 'north', azimuth: 0, altitude: 0 },
  { id: 'zenith', azimuth: 'current', altitude: 82 },
] satisfies QuickViewPreset[]

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

export const solarQuickTargets = [
  { id: 'sun' },
  { id: 'moon' },
  { id: 'mercury' },
  { id: 'venus' },
  { id: 'mars' },
  { id: 'jupiter' },
  { id: 'saturn' },
  { id: 'uranus' },
  { id: 'neptune' },
] as const

export const brightestStarIds = [
  'sirius',
  'canopus',
  'rigilKentaurus',
  'arcturus',
  'vega',
  'capella',
  'rigel',
  'procyon',
  'achernar',
  'betelgeuse',
] as const
