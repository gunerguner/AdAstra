import { describe, expect, it } from 'vitest'
import { Line } from 'three'
import { createGridLayer } from '../src/engine/render/layers/gridLayer'
import { testSkyUniforms } from './testSkyUniforms'

describe('equatorial grid', () => {
  it('extends meridians to the celestial poles', () => {
    const { group, equatorialGrid, constellationLine, horizontalGrid } = createGridLayer([], testSkyUniforms())
    let north = false
    let south = false
    group.children.forEach((child) => {
      if (child.userData.kind !== 'equatorialGrid' || !(child instanceof Line)) return
      const position = child.geometry.getAttribute('position')
      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index)
        const y = position.getY(index)
        const z = position.getZ(index)
        if (z > 0.995 && x * x + y * y < 0.02) north = true
        if (z < -0.995 && x * x + y * y < 0.02) south = true
      }
      child.geometry.dispose()
    })
    equatorialGrid.dispose()
    constellationLine.dispose()
    horizontalGrid.dispose()
    expect(north).toBe(true)
    expect(south).toBe(true)
  })
})
