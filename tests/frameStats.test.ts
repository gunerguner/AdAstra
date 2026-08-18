import { describe, expect, it } from 'vitest'
import { createFrameStats, publishFrameStats } from '../src/engine/performance/frameStats'

describe('frameStats', () => {
  it('uses a bounded window and reports average and p95', () => {
    const stats = createFrameStats(4)
    stats.push(10)
    stats.push(12)
    stats.push(20)
    stats.push(30)
    stats.push(11)
    expect(stats.filled).toBe(4)
    const snapshot = stats.snapshot()
    expect(snapshot.count).toBe(4)
    expect(snapshot.lastMs).toBe(11)
    expect(snapshot.averageMs).toBeCloseTo((12 + 20 + 30 + 11) / 4, 5)
    expect(snapshot.p95Ms).toBeGreaterThanOrEqual(20)
  })

  it('writes debug dataset fields for long-running checks', () => {
    const target = { dataset: {} as DOMStringMap }
    publishFrameStats(target, { count: 45, lastMs: 16.4, averageMs: 16.8, p95Ms: 18.2 }, { geometries: 12, textures: 3 }, 8)
    expect(target.dataset.frameAvgMs).toBe('16.80')
    expect(target.dataset.geometries).toBe('12')
    expect(target.dataset.drawCalls).toBe('8')
  })
})
