import { describe, expect, it } from 'vitest'
import { cities } from '../src/data/cities'
import { resolveObserver } from '../src/app/hooks/useObserver'
import { countStarsThroughMagnitude } from '../src/shared/types/star'
import { layerToggles } from '../src/config/layerToggles'
import { playbackSpeeds } from '../src/config/playbackSpeeds'

describe('观测者与配置', () => {
  it('手动坐标覆盖城市名称', () => {
    const observer = resolveObserver(cities[0], { latitude: 1, longitude: 2 })
    expect(observer.name).toBe('自定义坐标')
    expect(observer.latitude).toBe(1)
    expect(observer.timeZone).toBe(cities[0].timeZone)
  })

  it('星表按视星等二分计数', () => {
    const stars = [
      { magnitude: -1 },
      { magnitude: 1 },
      { magnitude: 3 },
    ]
    expect(countStarsThroughMagnitude(stars, 1)).toBe(2)
    expect(countStarsThroughMagnitude(stars, -2)).toBe(0)
  })

  it('图层开关与播放速度配置齐全', () => {
    expect(layerToggles.some((item) => item.key === 'ecliptic')).toBe(true)
    expect(playbackSpeeds.map((item) => item.value)).toContain(240)
  })
})
