import { ShaderMaterial } from 'three'
import { skyProjectionUniformDeclsGlsl, skyViewDirFromNdcGlsl } from '@/engine/render/skyProjection'
import type { SharedSkyUniforms } from '@/engine/render/skyContext'

export function makeGroundMaterial(uniforms: SharedSkyUniforms) {
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
      uGroundLight: uniforms.groundLight,
      uSunDir: uniforms.sunDir,
      uViewToHorizon: uniforms.viewToHorizon,
    },
    vertexShader: `
      varying vec2 vNdc;
      void main() {
        vNdc = position.xy;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      ${skyProjectionUniformDeclsGlsl}
      uniform float uDaylight;
      uniform float uTwilight;
      uniform float uWarmth;
      uniform float uGroundLight;
      uniform vec3 uSunDir;
      uniform mat3 uViewToHorizon;
      ${skyViewDirFromNdcGlsl}
      varying vec2 vNdc;
      float hash11(float n) {
        return fract(sin(n) * 43758.5453123);
      }
      float vnoise1(float x) {
        float i = floor(x);
        float f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(hash11(i), hash11(i + 1.0), f);
      }
      void main() {
        vec3 dir = normalize(uViewToHorizon * skyViewDirFromNdc(vNdc));
        float az = atan(dir.x, dir.z);
        float ridge = 0.01 + 0.036 * vnoise1(az * 1.65 + 2.4);
        ridge += 0.016 * vnoise1(az * 4.2 + 9.1);
        ridge *= 0.62 + 0.38 * vnoise1(az * 0.55);
        float edgeAA = max(fwidth(dir.y) * 1.4, 0.0015);
        float mountain = 1.0 - smoothstep(ridge - edgeAA, ridge + edgeAA, dir.y);
        if (mountain < 0.002) discard;

        float nadir = clamp(-dir.y, 0.0, 1.0);
        float rim = 1.0 - smoothstep(0.0, 0.08, abs(dir.y));
        float sunFacing = max(0.0, dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))));

        vec3 soil = mix(vec3(0.018, 0.024, 0.04), vec3(0.13, 0.15, 0.11), uGroundLight);
        soil = mix(soil, vec3(0.09, 0.05, 0.035), uWarmth * 0.7);
        vec3 edge = mix(vec3(0.28, 0.22, 0.12), vec3(0.46, 0.5, 0.36), uGroundLight);
        edge = mix(edge, vec3(0.62, 0.34, 0.14), uWarmth);
        vec3 peak = mix(vec3(0.03, 0.036, 0.05), vec3(0.17, 0.19, 0.16), uGroundLight);
        peak = mix(peak, vec3(0.14, 0.07, 0.05), uWarmth);

        vec3 color = mix(soil, peak, mountain * (1.0 - nadir * 0.65));
        color = mix(color, edge, rim * (0.45 + 0.4 * uWarmth + 0.2 * uDaylight));
        color += vec3(0.07, 0.05, 0.02) * sunFacing * (0.18 + 0.55 * uWarmth + 0.22 * uGroundLight);
        float fog = exp(-abs(dir.y) * 12.0) * (0.2 + 0.5 * uGroundLight + 0.35 * uTwilight);
        vec3 fogColor = mix(vec3(0.08, 0.12, 0.2), vec3(0.72, 0.8, 0.9), uDaylight);
        fogColor = mix(fogColor, vec3(0.86, 0.48, 0.22), uWarmth);
        color = mix(color, fogColor, fog * 0.62);

        float alpha = mix(0.98, 0.82, smoothstep(0.0, 0.75, nadir));
        alpha *= mountain;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
}
