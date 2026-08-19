/** 模拟时钟：pausedAt + (performance.now - startedAt) * rate。按墙钟倍率推进 UTC，不按帧累加。 */
export class SimulationClock {
  private pausedAt = Date.now()
  private startedAt = performance.now()
  private running = false
  private rate = 1

  now() {
    const elapsed = this.running ? performance.now() - this.startedAt : 0
    return this.pausedAt + elapsed * this.rate
  }

  seek(utcMillis: number) {
    this.pausedAt = utcMillis
    this.startedAt = performance.now()
  }

  play(rate = this.rate) {
    this.pausedAt = this.now()
    this.startedAt = performance.now()
    this.rate = rate
    this.running = true
  }

  pause() {
    this.pausedAt = this.now()
    this.running = false
  }

  setRate(rate: number) {
    this.pausedAt = this.now()
    this.startedAt = performance.now()
    this.rate = rate
  }
}
