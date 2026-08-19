/** 天空颜色：按视线方向和太阳位置混合夜空/曙暮/白昼。 */
import { ShaderMaterial } from 'three'
import {
  skyFullscreenVertexGlsl,
  skyOutsideMaskGlsl,
  skyProjectionUniformDeclsGlsl,
  skyViewDirFromNdcGlsl,
  skyVoidColorGlsl,
} from '@/engine/render/skyProjection'
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
    vertexShader: skyFullscreenVertexGlsl,
    fragmentShader: `
      ${skyProjectionUniformDeclsGlsl}
      uniform float uDaylight;
      uniform float uTwilight;
      uniform vec3 uSunDir;
      uniform mat3 uViewToHorizon;
      ${skyVoidColorGlsl}
      ${skyViewDirFromNdcGlsl}
      ${skyOutsideMaskGlsl}
      varying vec2 vNdc;
      void main() {
        vec3 viewDir = skyViewDirFromNdc(vNdc);
        float outside = skyOutsideMask(viewDir.z);
        if (outside > 0.998) {
          gl_FragColor = vec4(skyVoidColor, 1.0);
          return;
        }
        vec3 dir = normalize(uViewToHorizon * viewDir);

        float alt = dir.y;
        float horiz = pow(1.0 - smoothstep(0.0, 0.95, max(alt, 0.0)), 1.25);
        float zenith = smoothstep(0.18, 0.88, alt);
        vec3 sun = normalize(uSunDir);
        float sunDot = clamp(dot(dir, sun), -1.0, 1.0);
        float sunFacing = pow(max(0.0, sunDot), 4.0);
        float sunAway = 1.0 - sunDot;
        float aureole = exp(-sunAway * mix(14.0, 6.2, uDaylight));
        float haze = exp(-sunAway * mix(4.8, 1.9, uDaylight));
        float sunHorizon = sunFacing * horiz;

        vec3 nightZenith = vec3(0.004, 0.012, 0.038);
        vec3 nightHorizon = vec3(0.016, 0.03, 0.07);
        vec3 dayZenith = vec3(0.20, 0.50, 0.88);
        vec3 dayHorizon = vec3(0.36, 0.58, 0.86);
        vec3 twilightZenith = vec3(0.07, 0.05, 0.16);
        vec3 twilightCold = vec3(0.12, 0.18, 0.38);
        vec3 twilightWarm = vec3(0.92, 0.42, 0.16);
        vec3 twilightRose = vec3(0.78, 0.28, 0.38);

        vec3 base = mix(mix(nightZenith, nightHorizon, horiz), mix(dayZenith, dayHorizon, horiz), uDaylight);
        vec3 twilight = mix(twilightZenith, twilightCold, horiz);
        twilight = mix(twilight, mix(twilightRose, twilightWarm, sunFacing), sunHorizon);
        vec3 color = mix(base, twilight, uTwilight * (0.55 + 0.45 * horiz));
        vec3 aureoleColor = mix(vec3(1.0, 0.64, 0.26), vec3(1.0, 0.97, 0.88), uDaylight);
        color += aureoleColor * aureole * mix(0.08, 0.2, uDaylight);
        color += vec3(1.0, 0.96, 0.9) * haze * mix(0.03, 0.08, uDaylight);
        color += vec3(0.55, 0.72, 1.0) * zenith * uDaylight * 0.05;
        color = mix(color, vec3(0.006, 0.011, 0.022), 1.0 - smoothstep(-0.48, -0.04, alt));

        gl_FragColor = vec4(mix(color, skyVoidColor, outside), 1.0);
      }
    `,
  })
}
