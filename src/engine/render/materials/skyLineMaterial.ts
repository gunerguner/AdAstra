import { Color, ShaderMaterial } from 'three'
import { skyOutsideViewGlsl, skyProjectionGlsl, skyProjectionUniformDeclsGlsl } from '@/engine/render/skyProjection'
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
      uniform float uHorizon[9];
      ${skyProjectionUniformDeclsGlsl}
      uniform float uUseHorizon;
      varying float vAlt;
      varying vec3 vViewDir;
      ${skyProjectionGlsl}
      void main() {
        vec3 h = position;
        if (uUseHorizon > 0.5) {
          h = vec3(
            uHorizon[0] * position.x + uHorizon[1] * position.y + uHorizon[2] * position.z,
            uHorizon[3] * position.x + uHorizon[4] * position.y + uHorizon[5] * position.z,
            uHorizon[6] * position.x + uHorizon[7] * position.y + uHorizon[8] * position.z
          );
        }
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
      varying float vAlt;
      varying vec3 vViewDir;
      ${skyOutsideViewGlsl}
      void main() {
        if (skyOutsideView(vViewDir) > 0.5) discard;
        float visible = max(step(-0.08, vAlt), uShowBelow);
        if (visible < 0.5) discard;
        float dayMix = smoothstep(0.22, 0.68, uDaylight);
        float lowAltitude = mix(1.0, clamp((vAlt + 0.06) * 4.0, 0.55, 1.0), dayMix);
        vec3 color = mix(uColor, uDayColor, dayMix);
        float opacity = mix(uOpacity, uDayOpacity, dayMix) * lowAltitude;
        gl_FragColor = vec4(color, opacity);
      }
    `,
  })
}
