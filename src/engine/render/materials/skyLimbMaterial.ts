import { AdditiveBlending, DoubleSide, ShaderMaterial } from 'three'
import { skyProjectionUniformDeclsGlsl, skyViewDirFromNdcGlsl } from '@/engine/render/skyProjection'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

export function makeSkyLimbMaterial(sky: SkyProjectionUniforms) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: {
      uFov: sky.uFov,
      uAspect: sky.uAspect,
    },
    vertexShader: `
      varying vec2 vNdc;
      void main() {
        vNdc = position.xy;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      ${skyProjectionUniformDeclsGlsl}
      ${skyViewDirFromNdcGlsl}
      varying vec2 vNdc;
      void main() {
        float z = skyViewDirFromNdc(vNdc).z;
        float edgeAA = max(fwidth(z) * 1.5, 0.001);
        float edge = 1.0 - smoothstep(0.11 - edgeAA, 0.11 + edgeAA, z);
        float rim = 1.0 - smoothstep(0.0, 0.07, abs(z));
        float line = 1.0 - smoothstep(0.0, 0.016, abs(z - 0.018));
        float halo = 1.0 - smoothstep(0.02, 0.095, abs(z));
        float alpha = (rim * 0.42 + line * 0.95 + halo * 0.18) * edge;
        if (alpha < 0.03) discard;
        vec3 color = mix(vec3(0.42, 0.62, 0.92), vec3(0.98, 0.90, 0.68), clamp(line * 1.4, 0.0, 1.0));
        gl_FragColor = vec4(color * (0.55 + alpha), clamp(alpha, 0.0, 1.0));
      }
    `,
  })
}
