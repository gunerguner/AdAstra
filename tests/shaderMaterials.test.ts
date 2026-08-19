import { describe, expect, it } from 'vitest'
import { DataTexture, Vector3 } from 'three'
import { makeBodyMaterial } from '../src/engine/render/materials/bodyMaterial'
import { SUN_DAY_GLOW_SCALE } from '../src/engine/render/bodyAppearance'
import { makeGroundMaterial } from '../src/engine/render/materials/groundMaterial'
import { makeMilkyWayMaterial } from '../src/engine/render/materials/milkyWayMaterial'
import { makeSkyDomeMaterial } from '../src/engine/render/materials/skyDomeMaterial'
import { makeSkyLineMaterial } from '../src/engine/render/materials/skyLineMaterial'
import { makeSkyLimbMaterial } from '../src/engine/render/materials/skyLimbMaterial'
import { makeStarMaterial } from '../src/engine/render/materials/starMaterial'
import { testSkyUniforms } from './testSkyUniforms'

const uniforms = testSkyUniforms()
const atlas = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)

describe('shader sky projection uniforms', () => {
  const materials = [
    makeBodyMaterial({ sky: uniforms.sky, pixelRatio: 1, atlas, daylight: uniforms.daylight, twilight: uniforms.twilight }),
    makeStarMaterial({ ...uniforms, pixelRatio: 1 }),
    makeSkyLineMaterial('#fff', 1, true, uniforms),
    makeGroundMaterial(uniforms),
    makeSkyLimbMaterial(uniforms),
    makeMilkyWayMaterial(new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1), uniforms),
    makeSkyDomeMaterial(uniforms),
  ]

  it('shares the same uFov and uAspect objects from skyProjection', () => {
    for (const material of materials) {
      expect(material.uniforms.uFov).toBe(uniforms.sky.uFov)
      expect(material.uniforms.uAspect).toBe(uniforms.sky.uAspect)
    }
  })

  it('declares projection uniforms on the stage that uses them', () => {
    for (const material of materials) {
      if (material.fragmentShader.includes('skyViewDirFromNdc')) {
        expect(material.fragmentShader).toContain('uniform float uFov')
        expect(material.vertexShader).not.toContain('projectSkyDir')
        continue
      }
      expect(material.vertexShader).toContain('uniform float uFov')
      expect(material.vertexShader).toContain('projectSkyDir')
      expect(material.fragmentShader).not.toContain('uniform float uFov')
    }
  })

  it('body fragment samples the atlas and grows the sun disc in daylight', () => {
    expect(materials[0].fragmentShader).toContain('uAtlas')
    expect(materials[0].fragmentShader).toContain('isSun')
    expect(materials[0].vertexShader).toContain(SUN_DAY_GLOW_SCALE.toFixed(2))
  })

  it('crops pixels outside the celestial sphere', () => {
    expect(materials[3].fragmentShader).toContain('skyOutsideMask')
    expect(materials[4].fragmentShader).toContain('skyVoidColor')
    expect(materials[6].fragmentShader).toContain('skyVoidColor')
  })

  it('sky lines keep separate day and night colors', () => {
    expect(materials[2].fragmentShader).toContain('uDayColor')
    expect(materials[2].fragmentShader).toContain('uDayOpacity')
  })

  it('skydome and ground consume sun direction and twilight lighting', () => {
    expect(materials[6].fragmentShader).toContain('uSunDir')
    expect(materials[6].fragmentShader).toContain('uTwilight')
    expect(materials[3].fragmentShader).toContain('uSunDir')
    expect(materials[3].fragmentShader).toContain('ridge')
  })
})
