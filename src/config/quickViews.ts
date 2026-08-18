export type QuickViewPreset = {
  label: string
  azimuth: number | 'current'
  altitude: number
}

export const quickViews: QuickViewPreset[] = [
  { label: '东', azimuth: 90, altitude: 0 },
  { label: '南', azimuth: 180, altitude: 0 },
  { label: '西', azimuth: 270, altitude: 0 },
  { label: '北', azimuth: 0, altitude: 0 },
  { label: '天顶', azimuth: 'current', altitude: 82 },
]
