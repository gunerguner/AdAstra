/** 引擎和界面共用的可变槽，不依赖 React 的 RefObject。 */
export type Slot<T> = {
  current: T
}

/** 信息卡上由渲染循环直接改写的数字。 */
export type ObjectCardStats = {
  altitude: HTMLElement | null
  azimuth: HTMLElement | null
  magnitude: HTMLElement | null
}
