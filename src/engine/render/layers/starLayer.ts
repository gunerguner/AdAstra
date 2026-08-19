/** 恒星点精灵批次：把星表写成 GPU buffer（位置/颜色/大小/亮度）。 */
import { BufferAttribute, BufferGeometry, Color, Points } from 'three'
import { equatorialUnit } from '@/engine/coordinates/skyMath'
import { starBrightness, starPointSize } from '@/engine/render/bodyAppearance'
import { makeStarMaterial } from '@/engine/render/materials/starMaterial'
import type { Star } from '@/shared/types/star'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function createStarLayer(
  stars: Star[],
  uniforms: {
    horizonMat: Float32Array
    sky: SkyProjectionUniforms
    showBelow: { value: number }
    daylight: { value: number }
    pixelRatio: number
  },
) {
  const geometry = new BufferGeometry()
  const starPositions = new Float32Array(stars.length * 3)
  const starColors = new Float32Array(stars.length * 3)
  const starSizes = new Float32Array(stars.length)
  const starBrightnessValues = new Float32Array(stars.length)
  const color = new Color()
  stars.forEach((star, index) => {
    const vector = equatorialUnit(star.raHours, star.decDeg)
    starPositions.set([vector.x, vector.y, vector.z], index * 3)
    color.set(star.color)
    starColors.set([color.r, color.g, color.b], index * 3)
    const brightness = starBrightness(star.magnitude)
    starBrightnessValues[index] = brightness
    starSizes[index] = starPointSize(star.magnitude)
  })
  geometry.setAttribute('position', new BufferAttribute(starPositions, 3))
  geometry.setAttribute('color', new BufferAttribute(starColors, 3))
  geometry.setAttribute('size', new BufferAttribute(starSizes, 1))
  geometry.setAttribute('brightness', new BufferAttribute(starBrightnessValues, 1))

  const material = makeStarMaterial(uniforms)
  const points = new Points(geometry, material)
  points.renderOrder = 1
  points.frustumCulled = false
  return { geometry, material, points }
}
