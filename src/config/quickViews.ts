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
