import { describe, expect, it } from 'vitest'
import { interpolate } from '../src/i18n/locale'
import { zh } from '../src/i18n/messages/zh'
import { en } from '../src/i18n/messages/en'

function leafKeys(tree: unknown, prefix = ''): string[] {
  if (typeof tree === 'string') return [prefix.slice(0, -1)]
  if (!tree || typeof tree !== 'object') return [`${prefix}invalid`]
  return Object.entries(tree).flatMap(([key, value]) => leafKeys(value, `${prefix}${key}.`))
}

describe('i18n messages', () => {
  it('keeps Chinese and English dictionaries on the same keys', () => {
    expect(leafKeys(en).sort()).toEqual(leafKeys(zh).sort())
  })

  it('interpolates named placeholders', () => {
    expect(interpolate('{name} is below ({altitude})', { name: 'Sirius', altitude: '−12.0°' }))
      .toBe('Sirius is below (−12.0°)')
  })
})
