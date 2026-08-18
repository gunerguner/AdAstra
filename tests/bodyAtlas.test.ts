import { describe, expect, it } from 'vitest'
import { BODY_ATLAS_CELL, BODY_ATLAS_SIZE, createBodyAtlasTexture } from '../src/engine/render/createBodyAtlas'

describe('body atlas', () => {
  it('paints a high-contrast moon cell instead of a flat disc', () => {
    const texture = createBodyAtlasTexture()
    const data = texture.image.data as Uint8Array
    let min = 255
    let max = 0
    const col = 1
    const row = 0
    for (let y = 0; y < BODY_ATLAS_CELL; y += 1) {
      for (let x = 0; x < BODY_ATLAS_CELL; x += 1) {
        const i = ((row * BODY_ATLAS_CELL + y) * BODY_ATLAS_SIZE + col * BODY_ATLAS_CELL + x) * 4
        if (data[i + 3] < 250) continue
        const luma = data[i]
        min = Math.min(min, luma)
        max = Math.max(max, luma)
      }
    }
    expect(max - min).toBeGreaterThan(80)
  })
})
