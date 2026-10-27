/**
 * 天球方向 → 屏幕 NDC，以及对应 GLSL。
 * 用球面立体投影把朝前半球摊到平面；SKY_HORIZON_LIFT 把地平往下挪，平视时多看到天空。
 * 圆盘外（view.z 太大）裁成虚空色，所以画面是「球」而不是透视盒子。
 */
import { clamp } from '@/shared/math'
import type { Camera } from 'three'
import { Vector3 } from 'three'

export const SKY_FOV_DEG = 100
export const SKY_FOV_MIN = 38
export const SKY_FOV_MAX = 128
/** 把地平往屏幕下方挪一点，平视时多露出天空。 */
export const SKY_HORIZON_LIFT = 0.52
/** view.z 大于此值表示已转到球的背面，必须裁掉。 */
export const SKY_OUTSIDE_Z = 0.08
/** 球外填充色，与页面背景一致。 */
export const SKY_VOID_HEX = 0x050817
export const SKY_VOID_RGB = [5 / 255, 8 / 255, 23 / 255] as const

/** 把视场夹在立体投影还能看清的范围。 */
export function clampSkyFov(fovDeg: number) {
  return clamp(fovDeg, SKY_FOV_MIN, SKY_FOV_MAX)
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

export const skyFullscreenVertexGlsl = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const applyHorizonGlsl = /* glsl */ `
uniform float uHorizon[9];
vec3 applyHorizon(vec3 p) {
  return vec3(
    uHorizon[0] * p.x + uHorizon[1] * p.y + uHorizon[2] * p.z,
    uHorizon[3] * p.x + uHorizon[4] * p.y + uHorizon[5] * p.z,
    uHorizon[6] * p.x + uHorizon[7] * p.y + uHorizon[8] * p.z
  );
}
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

/**
 * Kasten–Young（1989）大气质量 + 分波段透过率。输入地平向量的 y 分量（= sin 高度角）。
 * 消光系数按 R/G/B 波段给出（星等/大气质量），蓝光被吸收得更多，
 * 所以低空的恒星会自然变暗、变红——不需要再手工混色。
 */
export const atmosphereTransmitGlsl = /* glsl */ `
float skyAirmass(float sinAlt) {
  float altDeg = degrees(asin(clamp(sinAlt, 0.0, 1.0)));
  float am = 1.0 / (max(sinAlt, 0.0) + 0.50572 * pow(6.07995 + altDeg, -1.6364));
  return max(am, 1.0);
}
vec3 skyTransmit(float sinAlt) {
  float am = skyAirmass(sinAlt);
  vec3 k = vec3(0.105, 0.16, 0.26);
  return max(exp(-0.921035 * k * am), vec3(0.05));
}
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

/** 着色器共用的立体投影 uniforms（视场、画幅比）。 */
export function createSkyProjectionUniforms(fovDeg = SKY_FOV_DEG) {
  return {
    uFov: { value: (fovDeg * Math.PI) / 180 },
    uAspect: { value: 1 },
  }
}

const viewScratch = new Vector3()
const ndcScratch = { x: 0, y: 0, z: 0 }

/** 天球上一点 → 屏幕 NDC。在圆盘外返回 null（看不见）。 */
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
