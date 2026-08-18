import { DoubleSide, ShaderMaterial } from 'three'
import { skyOutsideViewGlsl, skyProjectionGlsl, skyProjectionUniformDeclsGlsl } from '@/engine/render/skyProjection'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function makeGroundMaterial(sky: SkyProjectionUniforms) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    uniforms: {
      uFov: sky.uFov,
      uAspect: sky.uAspect,
    },
    vertexShader: `
      ${skyProjectionUniformDeclsGlsl}
      varying vec3 vViewDir;
      ${skyProjectionGlsl}
      void main() {
        vViewDir = skyViewDir(position);
        gl_Position = projectSkyDir(vViewDir);
      }
    `,
    fragmentShader: `
      varying vec3 vViewDir;
      ${skyOutsideViewGlsl}
      void main() {
        if (skyOutsideView(vViewDir) > 0.5) discard;
        gl_FragColor = vec4(0.015, 0.02, 0.035, 0.88);
      }
    `,
  })
}
