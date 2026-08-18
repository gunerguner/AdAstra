import { describe, expect, it } from 'vitest'
import { DataTexture, Vector3 } from 'three'
import { makeBodyMaterial } from '../src/engine/render/materials/bodyMaterial'
import { makeGroundMaterial } from '../src/engine/render/materials/groundMaterial'
import { makeMilkyWayMaterial } from '../src/engine/render/materials/milkyWayMaterial'
import { makeSkyLineMaterial } from '../src/engine/render/materials/skyLineMaterial'
import { makeSkyLimbMaterial } from '../src/engine/render/materials/skyLimbMaterial'
import { makeStarMaterial } from '../src/engine/render/materials/starMaterial'
import { createSkyProjectionUniforms } from '../src/engine/render/skyProjection'

const sky = createSkyProjectionUniforms()
const horizonMat = new Float32Array(9)
const showBelow = { value: 1 }
const daylight = { value: 1 }
const atlas = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)

describe('shader sky projection uniforms', () => {
  const materials = [
    makeBodyMaterial({ sky, pixelRatio: 1, atlas }),
    makeStarMaterial({ horizonMat, sky, showBelow, daylight, pixelRatio: 1 }),
    makeSkyLineMaterial('#fff', 1, true, { horizonMat, sky, showBelow }),
    makeGroundMaterial(sky),
    makeSkyLimbMaterial(sky),
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
      expect(material.vertexShader).toContain('uniform float uFov')
      expect(material.vertexShader).toContain('uniform float uAspect')
      expect(material.vertexShader).toContain('projectSkyDir')
      expect(material.fragmentShader).not.toContain('uniform float uFov')
      expect(material.fragmentShader).not.toContain('uniform float uAspect')
    }
  })

  it('body fragment samples the atlas and vertex shader packs disc data in color', () => {
    expect(materials[0].fragmentShader).toContain('uAtlas')
    expect(materials[0].fragmentShader).toContain('texture2D')
    expect(materials[0].vertexShader).toContain('attribute vec3 color')
    expect(materials[0].fragmentShader).toContain('smoothstep')
    expect(materials[0].fragmentShader).toContain('isSun')
    expect(materials[0].fragmentShader).toContain('vec3 halo')
    expect(materials[4].fragmentShader).toContain('rim')
  })
})
