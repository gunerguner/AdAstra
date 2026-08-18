import { describe, expect, it } from 'vitest'
import { shouldRequestBodySnapshot } from '../src/engine/astronomy/bodySnapshotRequest'

const observer = { latitude: 31, longitude: 121 }

describe('bodySnapshotRequest', () => {
  it('skips hidden documents, throttles, and ignores unchanged observer time', () => {
    expect(shouldRequestBodySnapshot(100, 1, observer, null, true)).toBe(false)
    expect(shouldRequestBodySnapshot(100, 1, observer, null, false)).toBe(true)
    const last = { at: 100, utcMillis: 1, latitude: 31, longitude: 121 }
    expect(shouldRequestBodySnapshot(150, 2, observer, last, false)).toBe(false)
    expect(shouldRequestBodySnapshot(250, 1, observer, last, false)).toBe(false)
    expect(shouldRequestBodySnapshot(250, 2, observer, last, false)).toBe(true)
  })
})
