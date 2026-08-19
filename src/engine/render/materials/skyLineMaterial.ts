/** 辅助折线（星座/网格/黄道）：同一套投影，昼夜各一套颜色。 */
import { Color, ShaderMaterial } from 'three'
import { applyHorizonGlsl, skyOutsideViewGlsl, skyProjectionGlsl, skyProjectionUniformDeclsGlsl } from '@/engine/render/skyProjection'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function makeSkyLineMaterial(
  color: string,
  opacity: number,
  useHorizon: boolean,
  uniforms: {
    horizonMat: Float32Array
    sky: SkyProjectionUniforms
    showBelow: { value: number }
    daylight?: { value: number }
  },
  dayStyle: {
    color?: string
    opacity?: number
  } = {},
) {
  return new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uHorizon: { value: uniforms.horizonMat },
      uFov: uniforms.sky.uFov,
      uAspect: uniforms.sky.uAspect,
      uUseHorizon: { value: useHorizon ? 1 : 0 },
      uShowBelow: uniforms.showBelow,
      uColor: { value: new Color(color) },
      uDayColor: { value: new Color(dayStyle.color ?? color) },
      uOpacity: { value: opacity },
      uDayOpacity: { value: dayStyle.opacity ?? opacity },
      uDaylight: uniforms.daylight ?? { value: 0 },
    },
    vertexShader: `
      ${applyHorizonGlsl}
      ${skyProjectionUniformDeclsGlsl}
      uniform float uUseHorizon;
      varying float vAlt;
      varying vec3 vViewDir;
      ${skyProjectionGlsl}
      void main() {
        vec3 h = uUseHorizon > 0.5 ? applyHorizon(position) : position;
        vAlt = h.y;
        vViewDir = skyViewDir(h);
        gl_Position = projectSkyDir(vViewDir);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uDayColor;
      uniform float uOpacity;
      uniform float uDayOpacity;
      uniform float uShowBelow;
      uniform float uDaylight;
      uniform float uUseHorizon;
      varying float vAlt;
      varying vec3 vViewDir;
      ${skyOutsideViewGlsl}
      void main() {
        if (skyOutsideView(vViewDir) > 0.5) discard;
        float aboveHorizon = mix(1.0, smoothstep(-0.002, 0.016, vAlt), uUseHorizon);
        if (uShowBelow < 0.5 && aboveHorizon < 0.02) discard;
        float dayMix = smoothstep(0.22, 0.68, uDaylight);
        vec3 color = mix(uColor, uDayColor, dayMix);
        float opacity = mix(uOpacity, uDayOpacity, dayMix) * mix(aboveHorizon, 1.0, uShowBelow);
        gl_FragColor = vec4(color, opacity);
      }
    `,
  })
}
