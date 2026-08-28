/** 应用入口：语言、翻译函数、星座/天体显示名。 */
export type { Locale, LocalizedName, MessageKey, MessageParams, Translate } from './types'
export { LocaleProvider, useLocale, useT } from './locale'
export { bodyKindKey, constellationLabel, localizedName, skyObjectLabel } from './names'
