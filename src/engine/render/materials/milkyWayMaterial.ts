/** 银河带：银道坐标 + 真实纹理（可选）/程序噪声兜底，Kasten–Young 消光，加性混合，白天压暗。 */
import { AdditiveBlending, DoubleSide, ShaderMaterial, Vector3 } from 'three'
import { applyHorizonGlsl, atmosphereTransmitGlsl, skyOutsideViewGlsl, skyProjectionGlsl, skyProjectionUniformDeclsGlsl } from '@/engine/render/skyProjection'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function makeMilkyWayMaterial(
  galX: Vector3,
  galY: Vector3,
  galZ: Vector3,
  uniforms: {
    horizonMat: Float32Array
    sky: SkyProjectionUniforms
    showBelow: { value: number }
    daylight: { value: number }
  },
) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: {
      uHorizon: { value: uniforms.horizonMat },
      uShowBelow: uniforms.showBelow,
      uDaylight: uniforms.daylight,
      uGalX: { value: galX },
      uGalY: { value: galY },
      uGalZ: { value: galZ },
      uFov: uniforms.sky.uFov,
      uAspect: uniforms.sky.uAspect,
      uMap: { value: null },
      uHasMap: { value: 0 },
    },
    vertexShader: `
      uniform vec3 uGalX;
      uniform vec3 uGalY;
      uniform vec3 uGalZ;
      ${applyHorizonGlsl}
      ${atmosphereTransmitGlsl}
      ${skyProjectionUniformDeclsGlsl}
      varying vec3 vGal;
      varying float vAlt;
      varying vec3 vViewDir;
      ${skyProjectionGlsl}
      void main() {
        vec3 h = applyHorizon(position);
        vGal = vec3(dot(position, uGalX), dot(position, uGalY), dot(position, uGalZ));
        vAlt = h.y;
        vViewDir = skyViewDir(h);
        gl_Position = projectSkyDir(vViewDir);
      }
    `,
    fragmentShader: `
      uniform float uShowBelow;
      uniform float uDaylight;
      uniform sampler2D uMap;
      uniform float uHasMap;
      varying vec3 vGal;
      varying float vAlt;
      varying vec3 vViewDir;
      ${atmosphereTransmitGlsl}
      ${skyOutsideViewGlsl}
      float hash13(vec3 p) {
        p = fract(p * vec3(443.8975, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }
      float vnoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash13(i);
        float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash13(i + vec3(0.0, 0.0, 1.0));
        float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
        float nxy0 = mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y);
        float nxy1 = mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y);
        return mix(nxy0, nxy1, f.z);
      }
      float fbm(vec3 p) {
        float sum = 0.0;
        float amp = 0.52;
        for (int i = 0; i < 3; i++) {
          sum += amp * vnoise(p);
          p = p * 2.11 + vec3(0.17, 0.31, 0.13);
          amp *= 0.55;
        }
        return sum;
      }
      void main() {
        if (skyOutsideView(vViewDir) > 0.5) discard;
        float visible = max(step(-0.02, vAlt), uShowBelow);
        vec3 trans = skyTransmit(max(vAlt, 0.0));
        float fade = mix(1.0, clamp((vAlt + 0.06) * 4.4, 0.0, 1.0), uDaylight);
        if (visible * fade < 0.01) discard;

        vec3 g = normalize(vGal);
        float lat = abs(g.z);
        float towardCenter = clamp(g.x * 0.58 + 0.42, 0.0, 1.0);
        float clouds = fbm(g * 7.4);
        float wisps = fbm(g * 16.5 + 2.7);

        vec3 col;
        float glow;
        if (uHasMap > 0.5) {
          // 真实纹理：等距圆柱投影，u=银经（列 0 是 l=-180°），v=银纬（顶行 b=+90°）。
          vec2 uv = vec2(
            fract(atan(g.y, g.x) * 0.15915494 + 0.5),
            clamp(asin(clamp(g.z, -1.0, 1.0)), -1.57035, 1.57035) * 0.31830989 + 0.5
          );
          vec3 tex = texture2D(uMap, uv).rgb;
          float lum = max(dot(tex, vec3(0.2126, 0.7152, 0.0722)), 0.004);
          col = tex / lum;
          // fbm 只做细部调制，大尺度结构交给纹理；幂次压缩收窄两翼、突出亮带核心
          glow = pow(lum, 1.45) * 2.8 * (0.86 + clouds * 0.34 + wisps * 0.1);
        } else {
          float plane = exp(-lat * lat * 34.0);
          float halo = exp(-lat * lat * 7.5) * 0.42;
          float bulge = exp(-length(g - vec3(1.0, 0.0, 0.0)) * 2.15);
          float lanes = smoothstep(0.38, 0.78, fbm(g * 11.2 + vec3(4.1, 1.3, 2.0)));
          float dust = lanes * plane * (0.25 + 0.75 * towardCenter);

          glow = (plane * 0.72 + halo) * (0.28 + 0.85 * towardCenter);
          glow += bulge * 0.28;
          glow *= 0.42 + clouds * 0.55 + wisps * 0.18;
          glow *= 1.0 - dust * 0.78;

          vec3 cold = vec3(0.58, 0.66, 0.82);
          vec3 warm = vec3(0.78, 0.72, 0.62);
          vec3 lane = vec3(0.28, 0.22, 0.2);
          col = mix(cold, warm, clamp(bulge * 0.8 + towardCenter * 0.15, 0.0, 1.0));
          col = mix(col, lane, dust * 0.45);
          float sparkle = pow(vnoise(g * 92.0), 18.0) * plane * 0.12;
          col += vec3(0.9, 0.9, 1.0) * sparkle;
        }

        glow *= fade * visible * 0.32;
        col *= trans;

        gl_FragColor = vec4(col * glow, clamp(glow * 0.85, 0.0, 0.22));
      }
    `,
  })
}
