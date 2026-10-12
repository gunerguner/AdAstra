/**
 * 产品侧默认值：播放倍率、时间轴跨度、图层开关、快捷视角和快速导航目标。
 * 不含天文常数（那些在 engine/coordinates/astroConstants）。
 */
import type { LayerState } from '@/shared/types/sky'

/** 时间轴总跨度（小时）以及滑块 UI 刷新间隔。 */
export const TIMELINE_RANGE_HOURS = 8
export const TIMELINE_RANGE_MS = TIMELINE_RANGE_HOURS * 60 * 60 * 1000
export const TIMELINE_UI_INTERVAL_MS = 200

/** 回归年的平均秒数。1 年/秒 的播放倍率。 */
export const MEAN_YEAR_RATE = 31_556_952

/** 播放倍率：value 是相对墙钟的倍数，id 对 i18n `speed.*`。 */
export const playbackSpeeds = [
  { value: 1, id: 'realtime' },
  { value: 300, id: 'fiveMinute' },
  { value: 3600, id: 'hour' },
  { value: 86400, id: 'day' },
  { value: MEAN_YEAR_RATE, id: 'year' },
  { value: MEAN_YEAR_RATE * 10, id: 'decade' },
  { value: MEAN_YEAR_RATE * 100, id: 'century' },
] as const

/**
 * 单次前进/后退的步长。playRate 是换成该步长后的播放倍率（约一步每秒）。
 * 年、十年、百年按公历年数，不按固定毫秒。
 */
export const timeSteps = [
  { id: 'hour', years: 0, days: 0, minutes: 60, playRate: 3600 },
  { id: 'day', years: 0, days: 1, minutes: 0, playRate: 86400 },
  { id: 'year', years: 1, days: 0, minutes: 0, playRate: MEAN_YEAR_RATE },
  { id: 'decade', years: 10, days: 0, minutes: 0, playRate: MEAN_YEAR_RATE * 10 },
  { id: 'century', years: 100, days: 0, minutes: 0, playRate: MEAN_YEAR_RATE * 100 },
] as const

export type TimeStepId = (typeof timeSteps)[number]['id']

/** 打开时仍是 ±1 小时，和原来的步进一致。 */
export const defaultTimeStepId: TimeStepId = 'hour'

/** 默认 5 分钟/秒。 */
export const defaultPlaybackSpeed = 300

/** 快捷视角。azimuth 为 `'current'` 时只改仰角（天顶）。 */
export type QuickViewPreset = {
  id: 'east' | 'south' | 'west' | 'north' | 'zenith'
  azimuth: number | 'current'
  altitude: number
}

/** 东/南/西/北/天顶快捷视角。 */
export const quickViews = [
  { id: 'east', azimuth: 90, altitude: 0 },
  { id: 'south', azimuth: 180, altitude: 0 },
  { id: 'west', azimuth: 270, altitude: 0 },
  { id: 'north', azimuth: 0, altitude: 0 },
  { id: 'zenith', azimuth: 'current', altitude: 82 },
] satisfies QuickViewPreset[]

/** 首次进入时的图层开关。 */
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

/** 控制面板图层按钮：key 对 LayerState，variant 给黄道/天赤道着色。 */
export type LayerToggleDef = {
  key: keyof LayerState
  swatch?: string
  variant?: 'ecliptic' | 'equator'
}

/** 控制面板上的图层按钮列表。 */
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

/** 快速导航：太阳系天体顺序（与渲染序一致）。 */
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

/** 快速导航：最亮的 10 颗恒星（视星等升序）。 */
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
