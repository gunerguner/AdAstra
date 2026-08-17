export type TimeQuality = 'modern-utc' | 'utc-like-historical' | 'utc-like-future'

export type AstroTime = {
  utcMillis: number
  quality: TimeQuality
}

export const getTimeQuality = (utcMillis: number): TimeQuality => {
  const year = new Date(utcMillis).getUTCFullYear()
  if (year < 1961) return 'utc-like-historical'
  if (year > 2035) return 'utc-like-future'
  return 'modern-utc'
}

export class SimulationClock {
  private pausedAt = Date.now()
  private startedAt = performance.now()
  private running = false
  private rate = 1

  now(): AstroTime {
    const elapsed = this.running ? performance.now() - this.startedAt : 0
    const utcMillis = this.pausedAt + elapsed * this.rate
    return { utcMillis, quality: getTimeQuality(utcMillis) }
  }

  seek(utcMillis: number) {
    this.pausedAt = utcMillis
    this.startedAt = performance.now()
  }

  play(rate = this.rate) {
    this.pausedAt = this.now().utcMillis
    this.startedAt = performance.now()
    this.rate = rate
    this.running = true
  }

  pause() {
    this.pausedAt = this.now().utcMillis
    this.running = false
  }

  setRate(rate: number) {
    this.pausedAt = this.now().utcMillis
    this.startedAt = performance.now()
    this.rate = rate
  }
}
