import { Vector3 } from 'three'

export const toVector3 = (point: { x: number; y: number; z: number }) =>
  new Vector3(point.x, point.y, point.z)

export function horizontalVectorInto(altitude: number, azimuth: number, out: Vector3) {
  const alt = altitude * Math.PI / 180
  const az = azimuth * Math.PI / 180
  return out.set(
    Math.cos(alt) * Math.sin(az),
    Math.sin(alt),
    Math.cos(alt) * Math.cos(az),
  )
}

export function horizontalVector(altitude: number, azimuth: number) {
  return horizontalVectorInto(altitude, azimuth, new Vector3())
}

/** Screen-up for a zenith-locked camera. Near the zenith, falls back to north along the current azimuth. */
export function skyCameraUpInto(altitudeDeg: number, azimuthDeg: number, look: Vector3, out: Vector3) {
  out.set(0, 1, 0).addScaledVector(look, -look.y)
  if (out.lengthSq() < 1e-8) {
    const azimuth = azimuthDeg * Math.PI / 180
    out.set(Math.sin(azimuth), 0, Math.cos(azimuth))
  }
  return out.normalize()
}

export function densifyGreatCircle(points: Vector3[], maxStepRad = Math.PI / 90) {
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
