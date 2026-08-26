export const playbackSpeeds = [
  { value: 1, id: 'realtime' },
  { value: 60, id: 'minute' },
  { value: 300, id: 'fiveMinute' },
  { value: 3600, id: 'hour' },
  { value: 86400, id: 'day' },
] as const

export const defaultPlaybackSpeed = 300
