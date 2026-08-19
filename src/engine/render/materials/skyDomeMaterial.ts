import { ShaderMaterial } from 'three'
import { skyProjectionUniformDeclsGlsl, skyViewDirFromNdcGlsl } from '@/engine/render/skyProjection'
import type { SharedSkyUniforms } from '@/engine/render/skyContext'

export function makeSkyDomeMaterial(uniforms: SharedSkyUniforms) {
  return new ShaderMaterial({
    transparent: false,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uFov: uniforms.sky.uFov,
      uAspect: uniforms.sky.uAspect,
      uDaylight: uniforms.daylight,
      uTwilight: uniforms.twilight,
      uSunDir: uniforms.sunDir,
      uViewToHorizon: uniforms.viewToHorizon,
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
      uniform float uDaylight;
      uniform float uTwilight;
      uniform vec3 uSunDir;
      uniform mat3 uViewToHorizon;
      ${skyViewDirFromNdcGlsl}
      varying vec2 vNdc;
      void main() {
        vec3 dir = normalize(uViewToHorizon * skyViewDirFromNdc(vNdc));

        float alt = dir.y;
        float horiz = 1.0 - smoothstep(0.0, 0.42, max(alt, 0.0));
        float zenith = smoothstep(0.12, 0.78, alt);
        vec3 sun = normalize(uSunDir);
        float sunDot = clamp(dot(dir, sun), -1.0, 1.0);
        float sunFacing = pow(max(0.0, sunDot), 4.0);
        float solarAureole = pow(max(0.0, sunDot), 18.0);
        float sunHorizon = sunFacing * horiz;

        vec3 nightZenith = vec3(0.004, 0.012, 0.038);
        vec3 nightHorizon = vec3(0.016, 0.03, 0.07);
        vec3 dayZenith = vec3(0.18, 0.46, 0.86);
        vec3 dayHorizon = vec3(0.62, 0.78, 0.94);
        vec3 twilightZenith = vec3(0.07, 0.05, 0.16);
        vec3 twilightCold = vec3(0.12, 0.18, 0.38);
        vec3 twilightWarm = vec3(0.92, 0.42, 0.16);
        vec3 twilightRose = vec3(0.78, 0.28, 0.38);

        vec3 base = mix(mix(nightZenith, nightHorizon, horiz), mix(dayZenith, dayHorizon, horiz), uDaylight);
        vec3 twilight = mix(twilightZenith, twilightCold, horiz);
        twilight = mix(twilight, mix(twilightRose, twilightWarm, sunFacing), sunHorizon);
        vec3 color = mix(base, twilight, uTwilight * (0.55 + 0.45 * horiz));
        vec3 aureoleColor = mix(vec3(1.0, 0.64, 0.26), vec3(1.0, 0.96, 0.88), uDaylight);
        color += aureoleColor * solarAureole * mix(0.05, 0.1, uDaylight);
        color += vec3(0.55, 0.72, 1.0) * zenith * uDaylight * 0.08;
        color = mix(color, vec3(0.006, 0.011, 0.022), 1.0 - smoothstep(-0.48, -0.04, alt));

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
}
