export const playbackSpeeds = [
  { value: 1, label: '实时' },
  { value: 60, label: '1 分钟/秒' },
  { value: 240, label: '4 分钟/秒' },
  { value: 3600, label: '1 小时/秒' },
  { value: 86400, label: '1 天/秒' },
] as const

export const defaultPlaybackSpeed = 240
