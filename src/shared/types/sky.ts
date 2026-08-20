/** 运行时核心状态：选中对象、图层开关、每帧共享的 SkySimulation。 */
import type { Observer } from './observer'

/** 当前选中或悬停的天空对象（恒星或太阳系天体）。方位/高度为地平坐标，单位度。 */
export type SelectedSkyObject = {
  /** 星表 id 或天体 id，如 `HIP 32349`、`moon`。 */
  id: string
  /** 界面显示名。 */
  name: string
  /** `star` 来自静态星表；`body` 来自太阳系快照。 */
  type: 'star' | 'body'
  /** 视星等，越小越亮。 */
  magnitude?: number
  /** 所属星座名；仅恒星有。 */
  constellation?: string
  /** 高度角（度）：0 在地平，90 在天顶，负值在地下。 */
  altitude: number
  /** 方位角（度）：0 北，90 东，180 南，270 西。 */
  azimuth: number
  /** 被照亮比例 0–1；月亮用于月相，行星也可有。 */
  phaseFraction?: number
  /** 月相中文名，如「满月」；仅月亮有。 */
  phaseName?: string
}

/** 各图层显隐。由控制面板写入，渲染循环每帧读取。 */
export type LayerState = {
  /** 恒星点。 */
  stars: boolean
  /** 星座连线与星座名。 */
  constellationLines: boolean
  /** 太阳、月亮和行星。 */
  bodies: boolean
  /** 地平圈。 */
  horizon: boolean
  /** 地面剪影。 */
  landscape: boolean
  /** 是否画出地平线以下的天体（半透明）。 */
  showBelowHorizon: boolean
  /** 黄道。 */
  ecliptic: boolean
  /** 天赤道。 */
  celestialEquator: boolean
  /** 赤经赤纬网。 */
  equatorialGrid: boolean
  /** 方位高度网。 */
  horizontalGrid: boolean
  /** 银河带。 */
  milkyWay: boolean
  /** 按太阳高度压暗星空、混合天空颜色。 */
  daylightEffect: boolean
}

/** 相机朝向：方位、仰角、视场。高频交互只改这份数据。 */
export type SkyView = {
  /** 视线方位角（度）：0 北，90 东。 */
  azimuth: number
  /** 视线高度角（度）：0 地平，90 天顶。 */
  altitude: number
  /** 垂直视场角（度）。 */
  fov: number
}

/**
 * 每帧共享的模拟状态，存在 ref 里，不经 React 每帧重渲染。
 * 视角嵌 SkyView，与时间、观测点、图层同一份可变对象。
 */
export type SkySimulation = {
  /** 当前模拟时刻（UTC 毫秒）。 */
  utcMillis: number
  /** 观测点纬经度。 */
  observer: Observer
  /** 视星等上限：只显示不暗于此值的恒星。 */
  magnitudeLimit: number
  /** 图层开关。 */
  layers: LayerState
  /** 相机朝向。 */
  view: SkyView
  /** 正在拖动时间轴：暂停精确采样，避免请求风暴。 */
  scrubbing?: boolean
  /** 唤醒渲染循环（拖拽/时间变化后从低帧率拉回满帧）。 */
  wake?: () => void
}
