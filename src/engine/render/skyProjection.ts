import type { Camera } from 'three'
import { Vector3 } from 'three'

export const SKY_FOV_DEG = 100
export const SKY_FOV_MIN = 38
export const SKY_FOV_MAX = 128
/** Shift the projected horizon down in NDC so a level look shows more sky. */
export const SKY_HORIZON_LIFT = 0.52

export function clampSkyFov(fovDeg: number) {
  return Math.min(SKY_FOV_MAX, Math.max(SKY_FOV_MIN, fovDeg))
}

export const skyOutsideViewGlsl = /* glsl */ `
float skyOutsideView(vec3 viewDir) {
  return step(0.08, normalize(viewDir).z);
}
`

export const skyProjectionUniformDeclsGlsl = /* glsl */ `
uniform float uFov;
uniform float uAspect;
`

export const skyProjectionGlsl = /* glsl */ `
vec3 skyViewDir(vec3 worldPos) {
  return normalize((modelViewMatrix * vec4(worldPos, 1.0)).xyz);
}

vec4 projectSkyDir(vec3 dir) {
  float tanQ = tan(uFov * 0.25);
  float denom = max(1.0 - dir.z, 1.0e-4);
  vec2 stereo = dir.xy / denom;
  vec2 ndc = vec2(stereo.x / (tanQ * uAspect), stereo.y / tanQ - ${SKY_HORIZON_LIFT.toFixed(3)});
  float invalid = step(0.08, dir.z);
  vec2 away = dir.xy;
  float awayLen = length(away);
  away = mix(vec2(1.0, 0.0), away / max(awayLen, 1.0e-6), step(1.0e-6, awayLen));
  ndc = mix(ndc, away * 8.0, invalid);
  return vec4(ndc, mix(0.51 + 0.49 * dir.z, 2.0, invalid), 1.0);
}

vec4 projectSky(vec3 worldPos) {
  return projectSkyDir(skyViewDir(worldPos));
}

${skyOutsideViewGlsl}
`

export function createSkyProjectionUniforms(fovDeg = SKY_FOV_DEG) {
  return {
    uFov: { value: (fovDeg * Math.PI) / 180 },
    uAspect: { value: 1 },
  }
}

export function viewDirectionFromNdc(ndcX: number, ndcY: number, fovDeg: number, aspect: number) {
  const tanQ = Math.tan((fovDeg * Math.PI) / 180 * 0.25)
  const sx = ndcX * aspect * tanQ
  const sy = (ndcY + SKY_HORIZON_LIFT) * tanQ
  const r2 = sx * sx + sy * sy
  const inv = 1 / (1 + r2)
  return new Vector3(2 * sx * inv, 2 * sy * inv, (r2 - 1) * inv)
}

export function projectSkyToNdc(world: Vector3, camera: Camera, fovDeg: number, aspect: number) {
  const view = world.clone().normalize().applyMatrix4(camera.matrixWorldInverse)
  if (view.z > 0.08) return null
  const tanQ = Math.tan((fovDeg * Math.PI) / 180 * 0.25)
  const denom = Math.max(1 - view.z, 1e-4)
  const x = view.x / denom / (tanQ * aspect)
  const y = view.y / denom / tanQ - SKY_HORIZON_LIFT
  if (Math.abs(x) > 1.12 || Math.abs(y) > 1.12) return null
  return { x, y, z: view.z }
}
