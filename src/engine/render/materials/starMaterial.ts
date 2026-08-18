import { AdditiveBlending, ShaderMaterial } from 'three'
import { skyProjectionGlsl, skyProjectionUniformDeclsGlsl } from '@/engine/render/skyProjection'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function makeStarMaterial(uniforms: {
  horizonMat: Float32Array
  sky: SkyProjectionUniforms
  showBelow: { value: number }
  daylight: { value: number }
  pixelRatio: number
}) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uHorizon: { value: uniforms.horizonMat },
      uPixelRatio: { value: uniforms.pixelRatio },
      uShowBelow: uniforms.showBelow,
      uDaylight: uniforms.daylight,
      uFov: uniforms.sky.uFov,
      uAspect: uniforms.sky.uAspect,
    },
    vertexShader: `
      attribute float size;
      attribute float brightness;
      attribute vec3 color;
      uniform float uHorizon[9];
      uniform float uPixelRatio;
      uniform float uShowBelow;
      uniform float uDaylight;
      ${skyProjectionUniformDeclsGlsl}
      varying vec3 vColor;
      varying float vBright;
      ${skyProjectionGlsl}
      void main() {
        vec3 h = vec3(
          uHorizon[0] * position.x + uHorizon[1] * position.y + uHorizon[2] * position.z,
          uHorizon[3] * position.x + uHorizon[4] * position.y + uHorizon[5] * position.z,
          uHorizon[6] * position.x + uHorizon[7] * position.y + uHorizon[8] * position.z
        );
        vec3 viewDir = skyViewDir(h);
        float visible = max(step(0.0, h.y), uShowBelow) * (1.0 - skyOutsideView(viewDir));
        float fade = mix(1.0, clamp((h.y + 0.08) * 5.2, 0.08, 1.0), uDaylight);
        vColor = color;
        vBright = brightness * visible * fade;
        gl_Position = projectSkyDir(viewDir);
        gl_PointSize = size * uPixelRatio * visible * step(gl_Position.z, 1.2) * clamp(1.22 / uFov, 0.52, 1.9);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vBright;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float rr = dot(q, q);
        if (rr > 1.0) discard;

        float core = exp(-rr * 42.0);
        float glow = exp(-rr * 9.0) * 0.42;
        float halo = exp(-rr * 2.6) * 0.16;

        float spike = 0.0;
        if (vBright > 0.22) {
          float sx = exp(-abs(q.x) * 26.0) * exp(-q.y * q.y * 110.0);
          float sy = exp(-abs(q.y) * 26.0) * exp(-q.x * q.x * 110.0);
          spike = (sx + sy) * smoothstep(0.22, 0.85, vBright) * 0.7;
        }

        float energy = (core * 1.55 + glow + halo + spike) * (0.28 + vBright * 1.15);
        vec3 hot = mix(vColor, vec3(1.0), clamp(core * 1.35, 0.0, 0.92));
        gl_FragColor = vec4(hot * energy, energy);
      }
    `,
  })
}
