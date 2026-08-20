/**
 * 地平角度 ↔ Three 向量，以及网格用的大圆弧细分。
 * 相机始终对着天球，look 是视线，up 尽量朝天顶。
 */
import { Vector3 } from 'three'
import { GREAT_CIRCLE_STEP_RAD } from './astroConstants'
import { degToRad } from '@/shared/math'

export const toVector3 = (point: { x: number; y: number; z: number }) =>
  new Vector3(point.x, point.y, point.z)

/** 高度角/方位角（度）→ 地平单位向量。0° 正北、90° 正东；+X 为西，面朝南时左东右西。 */
export function horizontalVectorInto(altitude: number, azimuth: number, out: Vector3) {
  const alt = degToRad(altitude)
  const az = degToRad(azimuth)
  return out.set(
    -Math.cos(alt) * Math.sin(az),
    Math.sin(alt),
    Math.cos(alt) * Math.cos(az),
  )
}

export function horizontalVector(altitude: number, azimuth: number) {
  return horizontalVectorInto(altitude, azimuth, new Vector3())
}

/** 屏幕「上」：尽量朝天顶；仰望天顶时改朝北，避免相机翻滚。 */
export function skyCameraUpInto(_altitudeDeg: number, azimuthDeg: number, look: Vector3, out: Vector3) {
  out.set(0, 1, 0).addScaledVector(look, -look.y)
  if (out.lengthSq() < 1e-8) {
    const azimuth = degToRad(azimuthDeg)
    out.set(-Math.sin(azimuth), 0, Math.cos(azimuth))
  }
  return out.normalize()
}

/** 在天球大圆弧上加密顶点，避免黄道/网格画成折线。默认约每 2° 一点。 */
export function densifyGreatCircle(points: Vector3[], maxStepRad = GREAT_CIRCLE_STEP_RAD) {
  if (points.length < 2) return points
  const out: Vector3[] = [points[0].clone().normalize()]
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index].clone().normalize()
    const b = points[index + 1].clone().normalize()
    const omega = a.angleTo(b)
    const steps = Math.max(1, Math.ceil(omega / maxStepRad))
    const sine = Math.sin(omega)
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps
      out.push(
        sine < 1e-5
          ? b.clone()
          : a.clone()
            .multiplyScalar(Math.sin((1 - t) * omega) / sine)
            .add(b.clone().multiplyScalar(Math.sin(t * omega) / sine)),
      )
    }
  }
  return out
}
