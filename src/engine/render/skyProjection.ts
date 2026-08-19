import type { Camera } from 'three'
import { Vector3 } from 'three'

export const SKY_FOV_DEG = 100
export const SKY_FOV_MIN = 38
export const SKY_FOV_MAX = 128
/** Shift the projected horizon down in NDC so a level look shows more sky. */
export const SKY_HORIZON_LIFT = 0.52
/** View-space z above this is behind the stereographic disk and must be cropped. */
export const SKY_OUTSIDE_Z = 0.08
/** Canvas/page color used to crop pixels outside the celestial sphere. */
export const SKY_VOID_HEX = 0x050817
export const SKY_VOID_RGB = [5 / 255, 8 / 255, 23 / 255] as const

export function clampSkyFov(fovDeg: number) {
  return Math.min(SKY_FOV_MAX, Math.max(SKY_FOV_MIN, fovDeg))
}

export const skyVoidColorGlsl = /* glsl */ `
#define skyVoidColor vec3(${SKY_VOID_RGB[0].toFixed(4)}, ${SKY_VOID_RGB[1].toFixed(4)}, ${SKY_VOID_RGB[2].toFixed(4)})
`

export const skyOutsideViewGlsl = /* glsl */ `
float skyOutsideView(vec3 viewDir) {
  return step(${SKY_OUTSIDE_Z.toFixed(3)}, normalize(viewDir).z);
}
`

export const skyOutsideMaskGlsl = /* glsl */ `
float skyOutsideMask(float z) {
  float aa = max(fwidth(z) * 1.5, 0.001);
  return smoothstep(${SKY_OUTSIDE_Z.toFixed(3)} - aa, ${SKY_OUTSIDE_Z.toFixed(3)} + aa, z);
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
  dir = normalize(dir);
  float tanQ = tan(uFov * 0.25);
  vec3 projected = dir;
  float outside = step(${SKY_OUTSIDE_Z.toFixed(3)}, dir.z);
  if (outside > 0.5) {
    float awayLen = length(dir.xy);
    float rimXy = sqrt(max(0.0, 1.0 - ${SKY_OUTSIDE_Z.toFixed(3)} * ${SKY_OUTSIDE_Z.toFixed(3)}));
    vec2 rim = mix(vec2(rimXy, 0.0), dir.xy / max(awayLen, 1.0e-6) * rimXy, step(1.0e-6, awayLen));
    projected = vec3(rim, ${SKY_OUTSIDE_Z.toFixed(3)});
  }
  float denom = max(1.0 - projected.z, 1.0e-4);
  vec2 stereo = projected.xy / denom;
  vec2 ndc = vec2(stereo.x / (tanQ * uAspect), stereo.y / tanQ - ${SKY_HORIZON_LIFT.toFixed(3)});
  return vec4(ndc, mix(0.51 + 0.49 * dir.z, 0.99, outside), 1.0);
}

vec4 projectSky(vec3 worldPos) {
  return projectSkyDir(skyViewDir(worldPos));
}

${skyOutsideViewGlsl}
`

export const skyViewDirFromNdcGlsl = /* glsl */ `
vec3 skyViewDirFromNdc(vec2 ndc) {
  float tanQ = tan(uFov * 0.25);
  float sx = ndc.x * uAspect * tanQ;
  float sy = (ndc.y + ${SKY_HORIZON_LIFT.toFixed(3)}) * tanQ;
  float r2 = sx * sx + sy * sy;
  float inv = 1.0 / (1.0 + r2);
  return vec3(2.0 * sx * inv, 2.0 * sy * inv, (r2 - 1.0) * inv);
}
`

export function createSkyProjectionUniforms(fovDeg = SKY_FOV_DEG) {
  return {
    uFov: { value: (fovDeg * Math.PI) / 180 },
    uAspect: { value: 1 },
  }
}

const viewScratch = new Vector3()
const ndcScratch = { x: 0, y: 0, z: 0 }

export function viewDirectionFromNdc(ndcX: number, ndcY: number, fovDeg: number, aspect: number, out = new Vector3()) {
  const tanQ = Math.tan((fovDeg * Math.PI) / 180 * 0.25)
  const sx = ndcX * aspect * tanQ
  const sy = (ndcY + SKY_HORIZON_LIFT) * tanQ
  const r2 = sx * sx + sy * sy
  const inv = 1 / (1 + r2)
  return out.set(2 * sx * inv, 2 * sy * inv, (r2 - 1) * inv)
}

export function projectSkyToNdc(
  world: Vector3,
  camera: Camera,
  fovDeg: number,
  aspect: number,
  out = ndcScratch,
) {
  viewScratch.copy(world).normalize().applyMatrix4(camera.matrixWorldInverse)
  if (viewScratch.z > SKY_OUTSIDE_Z) return null
  const tanQ = Math.tan((fovDeg * Math.PI) / 180 * 0.25)
  const denom = Math.max(1 - viewScratch.z, 1e-4)
  const x = viewScratch.x / denom / (tanQ * aspect)
  const y = viewScratch.y / denom / tanQ - SKY_HORIZON_LIFT
  if (Math.abs(x) > 1.12 || Math.abs(y) > 1.12) return null
  out.x = x
  out.y = y
  out.z = viewScratch.z
  return out
}
