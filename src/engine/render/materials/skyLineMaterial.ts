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
  },
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
      uOpacity: { value: opacity },
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
      uniform float uOpacity;
      uniform float uShowBelow;
      varying float vAlt;
      varying vec3 vViewDir;
      ${skyOutsideViewGlsl}
      void main() {
        if (skyOutsideView(vViewDir) > 0.5) discard;
        float visible = max(step(-0.08, vAlt), uShowBelow);
        if (visible < 0.5) discard;
        gl_FragColor = vec4(uColor, uOpacity);
      }
    `,
  })
}
