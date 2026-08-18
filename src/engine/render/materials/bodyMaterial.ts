import { ShaderMaterial } from 'three'
import { skyProjectionGlsl, skyProjectionUniformDeclsGlsl } from '@/engine/render/skyProjection'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function makeBodyMaterial(uniforms: {
  sky: SkyProjectionUniforms
  pixelRatio: number
}) {
  return new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uPixelRatio: { value: uniforms.pixelRatio },
      uFov: uniforms.sky.uFov,
      uAspect: uniforms.sky.uAspect,
    },
    vertexShader: `
      attribute vec3 color;
      attribute float size;
      attribute float opacity;
      uniform float uPixelRatio;
      ${skyProjectionUniformDeclsGlsl}
      varying vec3 vColor;
      varying float vOpacity;
      ${skyProjectionGlsl}
      void main() {
        vec3 viewDir = skyViewDir(position);
        float visible = 1.0 - skyOutsideView(viewDir);
        vColor = color;
        vOpacity = opacity * visible;
        gl_Position = projectSkyDir(viewDir);
        gl_PointSize = size * uPixelRatio * visible * step(gl_Position.z, 1.2) * clamp(1.22 / uFov, 0.52, 1.9);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float rr = dot(q, q);
        if (rr > 1.0 || vOpacity < 0.01) discard;
        float limb = mix(0.78, 1.08, 1.0 - rr);
        gl_FragColor = vec4(vColor * limb, vOpacity);
      }
    `,
  })
}
