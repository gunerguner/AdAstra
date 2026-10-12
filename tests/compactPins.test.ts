import { describe, expect, it } from 'vitest'
import { exclusiveCompactPin } from '@/app/compactPins'

describe('窄屏面板互斥', () => {
  it('keeps quick nav when both sides are pinned on a compact viewport', () => {
    expect(exclusiveCompactPin(true, true, true)).toEqual({ navPinned: true, controlsPinned: false })
  })

  it('leaves a single pinned side alone', () => {
    expect(exclusiveCompactPin(true, false, true)).toEqual({ navPinned: false, controlsPinned: true })
    expect(exclusiveCompactPin(true, true, false)).toEqual({ navPinned: true, controlsPinned: false })
  })

  it('allows both sides on a wide viewport', () => {
    expect(exclusiveCompactPin(false, true, true)).toEqual({ navPinned: true, controlsPinned: true })
  })
})
