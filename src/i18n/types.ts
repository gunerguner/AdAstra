/** 界面文案的类型：Locale、点号路径 MessageKey、t() 签名。 */
export type { LocalizedName } from '@/shared/types/star'

export type Locale = 'zh' | 'en'

type LeafPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : LeafPaths<T[K], `${Prefix}${K}.`>
}[keyof T & string]

export type MessageTree = typeof import('./messages/zh').zh
export type MessageKey = LeafPaths<MessageTree>
export type MessageParams = Record<string, string | number>

export type Translate = {
  (key: MessageKey, params?: MessageParams): string
  (key: string, params?: MessageParams): string
}
