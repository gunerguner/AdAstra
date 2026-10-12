import { describe, expect, it } from 'vitest'
import { admitBodySnapshot, createBodySnapshotGate } from '@/engine/astronomy/attachAstroWorker'

const place = { latitude: 31, longitude: 121 }

describe('太阳系快照请求门闩', () => {
  it('时间变了才发，间隔内不连发', () => {
    const gate = createBodySnapshotGate()
    expect(admitBodySnapshot(gate, { now: 0, utcMillis: 1_000, ...place, hidden: false, scrubbing: false })).toBe(true)
    expect(admitBodySnapshot(gate, { now: 50, utcMillis: 2_000, ...place, hidden: false, scrubbing: false })).toBe(false)
    expect(admitBodySnapshot(gate, { now: 120, utcMillis: 1_000, ...place, hidden: false, scrubbing: false })).toBe(false)
    expect(admitBodySnapshot(gate, { now: 120, utcMillis: 3_000, ...place, hidden: false, scrubbing: false })).toBe(true)
  })

  it('页面隐藏时不发', () => {
    const gate = createBodySnapshotGate()
    expect(admitBodySnapshot(gate, { now: 0, utcMillis: 1_000, ...place, hidden: true, scrubbing: false })).toBe(false)
  })

  it('拖时间轴时不发，松手后立刻要终点窗口', () => {
    const gate = createBodySnapshotGate()
    expect(admitBodySnapshot(gate, { now: 0, utcMillis: 1_000, ...place, hidden: false, scrubbing: false })).toBe(true)
    expect(admitBodySnapshot(gate, { now: 200, utcMillis: 4_000, ...place, hidden: false, scrubbing: true })).toBe(false)
    expect(admitBodySnapshot(gate, { now: 260, utcMillis: 9_000, ...place, hidden: false, scrubbing: true })).toBe(false)
    expect(gate.last?.utcMillis).toBe(1_000)
    expect(admitBodySnapshot(gate, { now: 280, utcMillis: 9_000, ...place, hidden: false, scrubbing: false })).toBe(true)
    expect(gate.last?.utcMillis).toBe(9_000)
  })
})
