import { catalogService, type RuntimeCatalog } from '@/engine/catalog/catalogService'
import { isAbortError, logAppError, toAppError, type AppError } from '@/shared/errors/appError'
import { useEffect, useState } from 'react'

export function useCatalog() {
  const [catalog, setCatalog] = useState<RuntimeCatalog | null>(null)
  const [catalogError, setCatalogError] = useState<AppError | null>(null)
  const [catalogRetry, setCatalogRetry] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    catalogService.loadCoreCatalog(controller.signal)
      .then((next) => {
        if (!active) return
        setCatalog(next)
        setCatalogError(null)
      })
      .catch((error: unknown) => {
        if (!active || isAbortError(error)) return
        const appError = toAppError(error, 'catalog')
        logAppError(appError, '加载星表')
        setCatalogError(appError)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [catalogRetry])

  return {
    catalog,
    catalogError,
    retry: () => {
      setCatalogError(null)
      setCatalogRetry((value) => value + 1)
    },
  }
}
