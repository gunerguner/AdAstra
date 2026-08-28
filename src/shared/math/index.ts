/** 通用数值：夹取、线性插值、角度换算。方位角走劣弧，避免跨 0° 时绕远路。 */

/** 把 value 夹到 [min, max]。 */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** 线性插值。t 不夹取，由调用方保证范围。 */
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** 把角度折到 [0, 360)。 */
export function wrapDegrees(value: number) {
  return ((value % 360) + 360) % 360
}

/** 沿劣弧插值方位角，结果仍在 [0, 360)。 */
export function lerpDegrees(from: number, to: number, t: number) {
  const delta = ((to - from + 540) % 360) - 180
  return wrapDegrees(from + delta * t)
}

/** 度 → 弧度。 */
export function degToRad(value: number) {
  return (value * Math.PI) / 180
}

/** 弧度 → 度。 */
export function radToDeg(value: number) {
  return (value * 180) / Math.PI
}
