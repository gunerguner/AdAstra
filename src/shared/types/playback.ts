/** 时间输入框与年份标签的实时 DOM ref，播放循环直接写值避免每帧重渲染。 */
import type { RefObject } from 'react'
import type { TimeStepId } from '@/config'

export type LiveClockRefs = {
  datetimeInput: RefObject<HTMLInputElement | null>
  yearLabel: RefObject<HTMLElement | null>
}

/** usePlayback 暴露给播放器 UI（TimeDeck 等）的时间控制契约。 */
export type Playback = {
  /** 当前模拟时刻。 */
  currentTime: Date
  isPlaying: boolean
  speed: number
  setSpeed: (value: number) => void
  /** 前进/后退按钮的步长。 */
  timeStep: TimeStepId
  setTimeStep: (id: TimeStepId) => void
  /** 时间轴拖动偏移（毫秒），相对时间轴锚点。 */
  timelineOffset: number
  commitTime: (utcMillis: number, resetTimeline?: boolean) => void
  pausePlayback: () => void
  togglePlay: () => void
  /** 按当前步长前进或后退，并暂停播放。 */
  stepTime: (direction: -1 | 1) => void
  beginTimelineScrub: (offset?: number) => void
  scrubTimeline: (offset: number) => void
  endTimelineScrub: () => void
}
