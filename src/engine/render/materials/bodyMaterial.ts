import { ShaderMaterial, type Texture } from 'three'
import { SATURN_RING_SCALE, SUN_GLOW_SCALE } from '@/engine/render/bodyAppearance'
import { skyProjectionGlsl, skyProjectionUniformDeclsGlsl } from '@/engine/render/skyProjection'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function makeBodyMaterial(uniforms: {
  sky: SkyProjectionUniforms
  pixelRatio: number
  atlas: Texture
  daylight?: { value: number }
  twilight?: { value: number }
}) {
  return new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uPixelRatio: { value: uniforms.pixelRatio },
      uAtlas: { value: uniforms.atlas },
      uFov: uniforms.sky.uFov,
      uAspect: uniforms.sky.uAspect,
      uDaylight: uniforms.daylight ?? { value: 0 },
      uTwilight: uniforms.twilight ?? { value: 0 },
    },
    vertexShader: `
      attribute float size;
      attribute float opacity;
      attribute vec3 color;
      uniform float uPixelRatio;
      uniform float uDaylight;
      ${skyProjectionUniformDeclsGlsl}
      varying float vOpacity;
      varying float vAtlasIndex;
      varying float vPhase;
      varying float vLimb;
      varying float vSpriteScale;
      varying float vAlt;
      ${skyProjectionGlsl}
      void main() {
        vec3 viewDir = skyViewDir(position);
        float visible = 1.0 - skyOutsideView(viewDir);
        vAtlasIndex = color.x;
        float keepBright = step(vAtlasIndex, 1.45) + step(2.55, vAtlasIndex) * step(vAtlasIndex, 3.45);
        float dayMul = mix(mix(1.0, 0.16, uDaylight), 1.0, clamp(keepBright, 0.0, 1.0));
        vOpacity = opacity * visible * dayMul;
        vPhase = color.y;
        vLimb = color.z;
        vAlt = position.y;
        float dayMix = smoothstep(0.28, 0.78, uDaylight);
        vSpriteScale = vAtlasIndex < 0.5
          ? mix(${SUN_GLOW_SCALE.toFixed(2)}, 1.12, dayMix)
          : (vAtlasIndex > 5.5 && vAtlasIndex < 6.5 ? ${SATURN_RING_SCALE.toFixed(2)} : 1.0);
        gl_Position = projectSkyDir(viewDir);
        gl_PointSize = size * vSpriteScale * uPixelRatio * visible * step(gl_Position.z, 1.2) * clamp(1.22 / uFov, 0.52, 1.9);
      }
    `,
    fragmentShader: `
      uniform sampler2D uAtlas;
      uniform float uDaylight;
      uniform float uTwilight;
      varying float vOpacity;
      varying float vAtlasIndex;
      varying float vPhase;
      varying float vLimb;
      varying float vSpriteScale;
      varying float vAlt;
      void main() {
        vec2 q = vec2(gl_PointCoord.x * 2.0 - 1.0, 1.0 - gl_PointCoord.y * 2.0);
        float rr = dot(q, q);
        if (rr > 1.0 || vOpacity < 0.01) discard;

        bool isSun = vAtlasIndex < 0.5;
        bool isMoon = vAtlasIndex > 0.5 && vAtlasIndex < 1.5;
        float coreScale = 1.0 / vSpriteScale;
        vec2 s = q / coreScale;
        float sr = dot(s, s);
        vec3 color = vec3(0.0);
        float alpha = 0.0;

        if (isSun) {
          float r = sqrt(rr);
          float dayMix = smoothstep(0.28, 0.78, uDaylight);
          float core = exp(-r * r * mix(16.0, 22.0, dayMix));
          float mid = exp(-r * r * mix(6.4, 9.5, dayMix));
          float glow = exp(-r * r * mix(2.2, 4.8, dayMix));
          vec3 nightColor = vec3(1.0, 0.97, 0.78) * core * 1.35
            + vec3(1.0, 0.78, 0.28) * mid * 0.72
            + vec3(1.0, 0.52, 0.12) * glow * 0.28;
          vec3 dayColor = vec3(1.0, 0.99, 0.94) * core * 1.4
            + vec3(1.0, 0.95, 0.78) * mid * 0.22
            + vec3(1.0, 0.97, 0.88) * glow * 0.08;
          color = mix(nightColor, dayColor, dayMix);
          vec3 halo = vec3(1.0, 0.54, 0.12) * glow * 0.18 * (1.0 - dayMix);
          color += halo;
          alpha = vOpacity * clamp(core + mid * mix(0.55, 0.22, dayMix) + glow * mix(0.22, 0.06, dayMix), 0.0, 1.0);
        } else if (sr <= 1.0) {
          vec2 local = clamp(s * 0.5 + 0.5, 0.0, 1.0);
          float col = floor(vAtlasIndex + 0.01);
          float row = floor(col / 3.0);
          col = mod(col, 3.0);
          vec3 albedo = texture2D(uAtlas, (local + vec2(col, row)) / 3.0).rgb;
          float z = sqrt(max(0.0, 1.0 - sr));
          float lit = mix(0.62, 1.08, z);
          float moonLight = 1.0;
          if (isMoon) {
            vec3 n = vec3(s.x, s.y, z);
            float ca = cos(vLimb);
            float sa = sin(vLimb);
            vec3 nr = vec3(n.x * ca - n.y * sa, n.x * sa + n.y * ca, n.z);
            float ndotl = dot(nr, vec3(sin(vPhase), 0.0, cos(vPhase)));
            moonLight = smoothstep(-0.1, 0.22, ndotl);
            lit = mix(0.08, 1.05, moonLight);
          }
          color = albedo * lit;
          float edge = 1.0 - smoothstep(0.9, 1.0, sr);
          alpha = vOpacity * edge;
          if (isMoon) {
            float dayMix = smoothstep(0.28, 0.78, uDaylight);
            float haze = (1.0 - smoothstep(0.04, 0.22, vAlt)) * 0.38;
            vec3 nightMoon = albedo * mix(0.07, 1.04, moonLight);
            vec3 dayLit = mix(vec3(0.97, 0.98, 0.99), albedo, 0.18);
            vec3 dayDark = vec3(0.66, 0.76, 0.88);
            vec3 dayMoon = mix(dayDark, dayLit, moonLight);
            color = mix(nightMoon, dayMoon, dayMix);
            float nightAlpha = mix(0.2, 1.0, moonLight);
            float dayAlpha = mix(0.03, 0.4, pow(moonLight, 0.85));
            alpha *= mix(nightAlpha, dayAlpha, dayMix);
            color = mix(color, vec3(0.72, 0.82, 1.0), haze * (1.0 - dayMix));
            alpha *= 1.0 - haze * 0.18 * (1.0 - dayMix);
          }
        }

        if (vSpriteScale > 1.4 && vAtlasIndex > 5.5) {
          vec2 e = vec2(q.x, q.y / 0.32);
          float er = length(e);
          float ring = smoothstep(0.48, 0.54, er) * (1.0 - smoothstep(0.88, 0.98, er));
          ring *= 1.0 - smoothstep(0.66, 0.69, er) * (1.0 - smoothstep(0.74, 0.77, er));
          if (sr > 1.0) {
            color = vec3(0.9, 0.82, 0.62) * (0.35 + ring * 0.65);
            alpha = vOpacity * ring * 0.9;
          }
        }

        if (alpha < 0.01) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
}
