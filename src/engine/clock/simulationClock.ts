/** 模拟时钟：pausedAt + (performance.now - startedAt) * rate。按墙钟倍率推进 UTC，不按帧累加。 */
export class SimulationClock {
  private pausedAt = Date.now()
  private startedAt = performance.now()
  private running = false
  private rate = 1

  /** 当前模拟 UTC 毫秒。播放中按墙钟 × rate 推进。 */
  now() {
    const elapsed = this.running ? performance.now() - this.startedAt : 0
    return this.pausedAt + elapsed * this.rate
  }

  /** 跳到指定 UTC，不改变播放/暂停状态。 */
  seek(utcMillis: number) {
    this.pausedAt = utcMillis
    this.startedAt = performance.now()
  }

  /** 从当前时刻开始按 rate 播放。 */
  play(rate = this.rate) {
    this.pausedAt = this.now()
    this.startedAt = performance.now()
    this.rate = rate
    this.running = true
  }

  /** 停在当前模拟时刻。 */
  pause() {
    this.pausedAt = this.now()
    this.running = false
  }

  /** 改倍率时先把 now() 固化，避免跳变。 */
  setRate(rate: number) {
    this.pausedAt = this.now()
    this.startedAt = performance.now()
    this.rate = rate
  }
}
