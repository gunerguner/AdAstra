import { ShaderMaterial, type Texture } from 'three'
import { SATURN_RING_SCALE, SUN_GLOW_SCALE } from '@/engine/render/bodyAppearance'
import { skyProjectionGlsl, skyProjectionUniformDeclsGlsl } from '@/engine/render/skyProjection'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function makeBodyMaterial(uniforms: {
  sky: SkyProjectionUniforms
  pixelRatio: number
  atlas: Texture
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
    },
    vertexShader: `
      attribute float size;
      attribute float opacity;
      attribute vec3 color;
      uniform float uPixelRatio;
      ${skyProjectionUniformDeclsGlsl}
      varying float vOpacity;
      varying float vAtlasIndex;
      varying float vPhase;
      varying float vLimb;
      varying float vSpriteScale;
      ${skyProjectionGlsl}
      void main() {
        vec3 viewDir = skyViewDir(position);
        float visible = 1.0 - skyOutsideView(viewDir);
        vOpacity = opacity * visible;
        vAtlasIndex = color.x;
        vPhase = color.y;
        vLimb = color.z;
        vSpriteScale = vAtlasIndex < 0.5 ? ${SUN_GLOW_SCALE.toFixed(2)} : (vAtlasIndex > 5.5 && vAtlasIndex < 6.5 ? ${SATURN_RING_SCALE.toFixed(2)} : 1.0);
        gl_Position = projectSkyDir(viewDir);
        gl_PointSize = size * vSpriteScale * uPixelRatio * visible * step(gl_Position.z, 1.2) * clamp(1.22 / uFov, 0.52, 1.9);
      }
    `,
    fragmentShader: `
      uniform sampler2D uAtlas;
      varying float vOpacity;
      varying float vAtlasIndex;
      varying float vPhase;
      varying float vLimb;
      varying float vSpriteScale;
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
          vec3 core = vec3(1.0, 0.98, 0.80) * exp(-r * r * 18.0) * 1.32;
          vec3 mid = vec3(1.0, 0.88, 0.40) * exp(-r * r * 7.0) * 0.82;
          vec3 halo = vec3(1.0, 0.62, 0.18) * exp(-r * r * 2.6) * 0.30;
          color = core + mid + halo;
          alpha = vOpacity * clamp(core.r + mid.g + halo.r, 0.0, 1.0);
        } else if (sr <= 1.0) {
          vec2 local = clamp(s * 0.5 + 0.5, 0.0, 1.0);
          float col = floor(vAtlasIndex + 0.01);
          float row = floor(col / 3.0);
          col = mod(col, 3.0);
          vec3 albedo = texture2D(uAtlas, (local + vec2(col, row)) / 3.0).rgb;
          float z = sqrt(max(0.0, 1.0 - sr));
          float lit = mix(0.62, 1.08, z);
          if (isMoon) {
            vec3 n = vec3(s.x, s.y, z);
            float ca = cos(vLimb);
            float sa = sin(vLimb);
            vec3 nr = vec3(n.x * ca - n.y * sa, n.x * sa + n.y * ca, n.z);
            float ndotl = dot(nr, vec3(sin(vPhase), 0.0, cos(vPhase)));
            lit = mix(0.04, 1.05, smoothstep(-0.08, 0.16, ndotl));
          }
          color = albedo * lit;
          alpha = vOpacity;
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
