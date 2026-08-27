import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Locale, MessageParams, MessageTree, Translate } from './types'
import { zh } from './messages/zh'
import { en } from './messages/en'

const STORAGE_KEY = 'adastra.locale'
const messagesByLocale: Record<Locale, MessageTree> = { zh, en }

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

export function interpolate(template: string, params?: MessageParams) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (
    Object.hasOwn(params, key) ? String(params[key]) : `{${key}}`
  ))
}

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

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within LocaleProvider')
  return value
}

export function useT() {
  return useLocale().t
}
