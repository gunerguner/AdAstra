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
      varying float vGroundY;
      ${skyProjectionGlsl}
      void main() {
        vViewDir = skyViewDir(position);
        vGroundY = position.y;
        gl_Position = projectSkyDir(vViewDir);
      }
    `,
    fragmentShader: `
      varying vec3 vViewDir;
      varying float vGroundY;
      ${skyOutsideViewGlsl}
      void main() {
        if (skyOutsideView(vViewDir) > 0.5) discard;
        float rim = 1.0 - smoothstep(0.0, 0.055, abs(vGroundY));
        vec3 soil = vec3(0.018, 0.024, 0.04);
        vec3 edge = vec3(0.42, 0.34, 0.2);
        gl_FragColor = vec4(mix(soil, edge, rim * 0.9), 0.9);
      }
    `,
  })
}
