import { describe, expect, it } from 'vitest'
import { IDLE_FRAME_MS, isFullRateFrame, nextFrameDelayMs } from '../src/engine/performance/renderScheduler'

describe('renderScheduler', () => {
  it('pauses completely while the document is hidden', () => {
    expect(isFullRateFrame({
      hidden: true,
      now: 1000,
      lastWakeAt: 1000,
      utcMillis: 1,
      lastUtcMillis: 2,
      viewChanged: true,
      layersChanged: true,
    })).toBe(false)
  })

  it('keeps full rate while playing or interacting', () => {
    expect(isFullRateFrame({
      hidden: false,
      now: 1000,
      lastWakeAt: 0,
      utcMillis: 20,
      lastUtcMillis: 10,
      viewChanged: false,
      layersChanged: false,
    })).toBe(true)
    expect(isFullRateFrame({
      hidden: false,
      now: 400,
      lastWakeAt: 0,
      utcMillis: 10,
      lastUtcMillis: 10,
      viewChanged: false,
      layersChanged: false,
    })).toBe(true)
    expect(nextFrameDelayMs(true)).toBe(0)
  })

  it('drops to idle delay after interaction hold expires', () => {
    expect(isFullRateFrame({
      hidden: false,
      now: 2000,
      lastWakeAt: 0,
      utcMillis: 10,
      lastUtcMillis: 10,
      viewChanged: false,
      layersChanged: false,
    })).toBe(false)
    expect(nextFrameDelayMs(false)).toBe(IDLE_FRAME_MS)
  })
})
