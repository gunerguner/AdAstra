/**
 * 星名、星座名、天体种类：按当前语言取出显示文案。
 * 恒星走星表双语名，太阳系天体走 i18n 词条。
 */
import type { Locale, LocalizedName, MessageKey, Translate } from './types'
import { constellationById } from '@/data/catalog'

/** 只取「id → 星名」这一块契约，避免 i18n 反向依赖 engine 的 RuntimeCatalog。 */
type StarNameIndex = {
  starById: ReadonlyMap<string, { names: LocalizedName }>
}

/** 当前语言的名字；缺文案时回退中文。 */
export function localizedName(names: LocalizedName, locale: Locale) {
  return names[locale] || names.zh
}

/** 星座 IAU 代码 → 本地化名称；查不到就原样返回代码。 */
export function constellationLabel(constellationId: string | undefined, locale: Locale) {
  if (!constellationId) return ''
  const names = constellationById.get(constellationId)
  return names ? localizedName(names, locale) : constellationId
}

/** 选中/悬停对象的标题：行星用 bodies.*，恒星用星表名。 */
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

const BODY_KIND_KEY = { sun: 'card.sun', moon: 'card.moon' } as const

/** 对象卡片眉题：太阳/月亮单独词条，其余行星共用 card.planet。 */
export function bodyKindKey(id: string): MessageKey {
  return BODY_KIND_KEY[id as keyof typeof BODY_KIND_KEY] ?? 'card.planet'
}
