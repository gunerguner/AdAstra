/**
 * 界面语言：探测、持久化、按点号路径取词条，并插值 `{name}`。
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Locale, MessageParams, MessageTree, Translate } from './types'
import { zh } from './messages/zh'
import { en } from './messages/en'

const STORAGE_KEY = 'adastra.locale'
const messagesByLocale: Record<Locale, MessageTree> = { zh, en }

/** localStorage → 浏览器语言 → 英语。 */
export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh' || stored === 'en') return stored
  } catch {
    // Private mode may block localStorage.
  }
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) return 'zh'
  return 'en'
}

/** 把 `{key}` 换成 params；没有对应键则原样留下。 */
export function interpolate(template: string, params?: MessageParams) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (
    Object.hasOwn(params, key) ? String(params[key]) : `{${key}}`
  ))
}

/** `document.title` → `document.title` 这种点号路径。缺键抛错。 */
function lookup(tree: MessageTree, path: string): string {
  const value = path.split('.').reduce<unknown>((node, key) => {
    if (!node || typeof node !== 'object') return undefined
    return (node as Record<string, unknown>)[key]
  }, tree)
  if (typeof value !== 'string') throw new Error(`Missing i18n key: ${path}`)
  return value
}

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translate
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/** 提供 locale / setLocale / t，并同步 <html lang> 与标题。 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)
  const messages = messagesByLocale[locale]

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignore persistence failures.
    }
  }, [])

  const t = useCallback<Translate>((key, params) => interpolate(lookup(messages, key), params), [messages])

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.title = t('document.title')
    const meta = document.querySelector('meta[name="description"]')
    meta?.setAttribute('content', t('document.description'))
  }, [locale, t])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/** 当前语言、切换函数和 t。必须包在 LocaleProvider 里。 */
export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within LocaleProvider')
  return value
}

/** 只要翻译函数。 */
export function useT() {
  return useLocale().t
}
