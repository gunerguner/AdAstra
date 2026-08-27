import type { Locale, LocalizedName, MessageKey, Translate } from './types'
import { constellationById } from '@/data/catalog'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'

export function localizedName(names: LocalizedName, locale: Locale) {
  return names[locale] || names.zh
}

export function constellationLabel(constellationId: string | undefined, locale: Locale) {
  if (!constellationId) return ''
  const names = constellationById.get(constellationId)
  return names ? localizedName(names, locale) : constellationId
}

export function skyObjectLabel(
  item: { id: string; type: 'star' | 'body' },
  catalog: Pick<RuntimeCatalog, 'starById'>,
  locale: Locale,
  t: Translate,
) {
  if (item.type === 'body') return t(`bodies.${item.id}`)
  const star = catalog.starById.get(item.id)
  return star ? localizedName(star.names, locale) : item.id
}

export function bodyKindKey(id: string): MessageKey {
  if (id === 'sun') return 'card.sun'
  if (id === 'moon') return 'card.moon'
  return 'card.planet'
}
