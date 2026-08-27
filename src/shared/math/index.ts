export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function wrapDegrees(value: number) {
  return ((value % 360) + 360) % 360
}

export function lerpDegrees(from: number, to: number, t: number) {
  const delta = ((to - from + 540) % 360) - 180
  return wrapDegrees(from + delta * t)
}

export function degToRad(value: number) {
  return (value * Math.PI) / 180
}

export function radToDeg(value: number) {
  return (value * 180) / Math.PI
}
