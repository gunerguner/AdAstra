import { describe, expect, it } from 'vitest'
import { constellationById, constellationLines } from '@/data/catalog'
import starCatalog from '../data/stars.yaml'

const stars = (starCatalog as {
  stars: Array<{ id: string; name: string; nameEn: string; constellation: string }>
}).stars

describe('bilingual catalog names', () => {
  it('gives every star a Chinese name, English name, and known constellation id', () => {
    const missing = stars.flatMap((star) => {
      if (!star.name?.trim() || !star.nameEn?.trim() || !constellationById.has(star.constellation)) {
        return [star.id]
      }
      return []
    })
    expect(missing).toEqual([])
  })

  it('gives every constellation stick figure a stable id and bilingual names', () => {
    const missing = constellationLines.flatMap((line) => {
      if (!line.id || !line.names.zh.trim() || !line.names.en.trim()) return [line.id || 'unknown']
      return []
    })
    expect(missing).toEqual([])
    expect(new Set(constellationLines.map((line) => line.id)).size).toBe(constellationLines.length)
  })
})
