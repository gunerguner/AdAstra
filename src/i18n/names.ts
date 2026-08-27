import type { Locale, LocalizedName, MessageKey, Translate } from './types'
import { constellationById } from '@/data/catalog'

/** 只取「id → 星名」这一块契约，避免 i18n 反向依赖 engine 的 RuntimeCatalog。 */
type StarNameIndex = {
  starById: ReadonlyMap<string, { names: LocalizedName }>
}

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
  catalog: StarNameIndex,
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
