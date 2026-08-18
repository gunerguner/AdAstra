import { describe, expect, it } from 'vitest'
import { MeshBasicMaterial, Vector3 } from 'three'
import { makeBodyMaterial } from '../src/engine/render/materials/bodyMaterial'
import { makeGroundMaterial } from '../src/engine/render/materials/groundMaterial'
import { makeMilkyWayMaterial } from '../src/engine/render/materials/milkyWayMaterial'
import { makeSkyLineMaterial } from '../src/engine/render/materials/skyLineMaterial'
import { makeStarMaterial } from '../src/engine/render/materials/starMaterial'
import {
  createSkyProjectionUniforms,
  fragmentDeclaresUnusedSkyProjectionUniforms,
  patchSkyProjection,
  shaderDeclaresSkyProjectionUniforms,
  shaderUsesSkyProjection,
} from '../src/engine/render/skyProjection'

const sky = createSkyProjectionUniforms()
const horizonMat = new Float32Array(9)
const showBelow = { value: 1 }
const daylight = { value: 1 }

describe('shader sky projection uniforms', () => {
  const materials = [
    makeBodyMaterial({ sky, pixelRatio: 1 }),
    makeStarMaterial({ horizonMat, sky, showBelow, daylight, pixelRatio: 1 }),
    makeSkyLineMaterial('#fff', 1, true, { horizonMat, sky, showBelow }),
    makeGroundMaterial(sky),
    makeMilkyWayMaterial(new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1), {
      horizonMat,
      sky,
      showBelow,
      daylight,
    }),
  ]

  it('shares the same uFov and uAspect objects from skyProjection', () => {
    for (const material of materials) {
      expect(material.uniforms.uFov).toBe(sky.uFov)
      expect(material.uniforms.uAspect).toBe(sky.uAspect)
    }
  })

  it('declares and uses projection uniforms only in vertex shaders', () => {
    for (const material of materials) {
      expect(shaderDeclaresSkyProjectionUniforms(material.vertexShader)).toBe(true)
      expect(shaderUsesSkyProjection(material.vertexShader)).toBe(true)
      expect(fragmentDeclaresUnusedSkyProjectionUniforms(material.fragmentShader)).toBe(false)
    }
  })

  it('injects vertex uniforms for patched built-in materials without unused fragment uniforms', () => {
    const material = new MeshBasicMaterial()
    patchSkyProjection(material, sky)
    const shader = {
      uniforms: {} as { uFov?: typeof sky.uFov; uAspect?: typeof sky.uAspect },
      vertexShader: '#include <project_vertex>',
      fragmentShader: 'void main() {\n}',
    }
    material.onBeforeCompile?.(shader as never, undefined as never)
    expect(shader.uniforms.uFov).toBe(sky.uFov)
    expect(shader.uniforms.uAspect).toBe(sky.uAspect)
    expect(shaderDeclaresSkyProjectionUniforms(shader.vertexShader)).toBe(true)
    expect(shaderUsesSkyProjection(shader.vertexShader)).toBe(true)
    expect(fragmentDeclaresUnusedSkyProjectionUniforms(shader.fragmentShader)).toBe(false)
  })
})
