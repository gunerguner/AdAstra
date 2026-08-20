/** 滑动窗口帧时；开发环境写到 canvas dataset 方便看 GPU 压力。 */
export type FrameStatsSnapshot = {
  count: number
  lastMs: number
  averageMs: number
  p95Ms: number
}

export function createFrameStats(capacity = 45) {
  const samples = new Float64Array(Math.max(1, capacity))
  let cursor = 0
  let filled = 0
  let lastMs = 0

  return {
    push(frameMs: number) {
      lastMs = frameMs
      samples[cursor] = frameMs
      cursor = (cursor + 1) % samples.length
      if (filled < samples.length) filled += 1
    },
    snapshot(): FrameStatsSnapshot {
      if (filled === 0) return { count: 0, lastMs, averageMs: 0, p95Ms: 0 }
      const ordered = Array.from(samples.subarray(0, filled)).sort((a, b) => a - b)
      const sum = ordered.reduce((total, sample) => total + sample, 0)
      const p95Index = Math.min(filled - 1, Math.floor(filled * 0.95))
      return {
        count: filled,
        lastMs,
        averageMs: sum / filled,
        p95Ms: ordered[p95Index],
      }
    },
    get averageMs() {
      if (filled === 0) return 0
      return samples.subarray(0, filled).reduce((total, sample) => total + sample, 0) / filled
    },
    get filled() {
      return filled
    },
    get capacity() {
      return samples.length
    },
  }
}

export function publishFrameStats(
  target: { dataset: DOMStringMap },
  stats: FrameStatsSnapshot,
  memory?: { geometries: number; textures: number },
  calls?: number,
) {
  target.dataset.frameMs = stats.lastMs.toFixed(2)
  target.dataset.frameAvgMs = stats.averageMs.toFixed(2)
  target.dataset.frameP95Ms = stats.p95Ms.toFixed(2)
  if (memory) {
    target.dataset.geometries = String(memory.geometries)
    target.dataset.textures = String(memory.textures)
  }
  if (calls != null) target.dataset.drawCalls = String(calls)
}
