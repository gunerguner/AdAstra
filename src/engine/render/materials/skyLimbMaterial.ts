/** 天球圆盘边缘的一圈光晕，把球外裁切藏进装饰线。 */
import { ShaderMaterial } from 'three'
import {
  SKY_OUTSIDE_Z,
  skyFullscreenVertexGlsl,
  skyOutsideMaskGlsl,
  skyProjectionUniformDeclsGlsl,
  skyViewDirFromNdcGlsl,
  skyVoidColorGlsl,
} from '@/engine/render/skyProjection'
import type { SharedSkyUniforms } from '@/engine/render/skyContext'

export function makeSkyLimbMaterial(uniforms: SharedSkyUniforms) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uFov: uniforms.sky.uFov,
      uAspect: uniforms.sky.uAspect,
      uDaylight: uniforms.daylight,
      uTwilight: uniforms.twilight,
      uWarmth: uniforms.warmth,
    },
    vertexShader: skyFullscreenVertexGlsl,
    fragmentShader: `
      ${skyProjectionUniformDeclsGlsl}
      uniform float uDaylight;
      uniform float uTwilight;
      uniform float uWarmth;
      ${skyVoidColorGlsl}
      ${skyViewDirFromNdcGlsl}
      ${skyOutsideMaskGlsl}
      varying vec2 vNdc;
      void main() {
        float z = skyViewDirFromNdc(vNdc).z;
        float outside = skyOutsideMask(z);
        float edgeAA = max(fwidth(z) * 1.5, 0.001);
        float limb = z - ${SKY_OUTSIDE_Z.toFixed(3)};
        float line = 1.0 - smoothstep(0.0, 0.01 + edgeAA, abs(limb));
        float halo = 1.0 - smoothstep(0.0, 0.038, abs(limb));
        float dayMix = smoothstep(0.28, 0.78, uDaylight);
        float deco = line * 0.95 + halo * 0.32;
        deco *= mix(0.55, 1.0, uTwilight) * mix(1.0, 0.7, dayMix);
        if (outside < 0.002 && deco < 0.02) discard;

        vec3 cool = vec3(0.42, 0.62, 0.92);
        vec3 warm = vec3(0.98, 0.72, 0.38);
        vec3 decoColor = mix(cool, warm, clamp(line * 1.4 * (0.25 + uWarmth), 0.0, 1.0));
        decoColor = mix(decoColor, vec3(0.82, 0.90, 1.0), dayMix * 0.45);
        vec3 color = mix(decoColor * (0.55 + deco), skyVoidColor, outside);
        gl_FragColor = vec4(color, max(outside, deco));
      }
    `,
  })
}
