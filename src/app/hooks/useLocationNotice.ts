import { useCallback, useEffect, useState } from 'react'
import { useT } from '@/i18n'
import type { LocateStatus, ResolvedObserver } from './useObserver'

/**
 * 定位过程到提示条的映射：请求中常驻显示，拒绝/失败只在落回默认城市（上海）时提示，
 * 用户主动换城后自动清除。
 */
export function useLocationNotice(observer: ResolvedObserver, locateStatus: LocateStatus) {
  const t = useT()
  const [notice, setNotice] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  useEffect(() => {
    if (locateStatus === 'pending') {
      setNotice(t('location.locating'))
      return
    }
    const fellBackToShanghai = observer.id === 'shanghai' && !observer.custom
    if (locateStatus === 'denied' && fellBackToShanghai) {
      setNotice(t('location.denied'))
      return
    }
    if (locateStatus === 'unavailable' && fellBackToShanghai) {
      setNotice(t('location.unavailable'))
      return
    }
    setNotice((current) => {
      if (current === t('location.locating')) return null
      if (!fellBackToShanghai && (current === t('location.denied') || current === t('location.unavailable'))) {
        return null
      }
      return current
    })
  }, [locateStatus, observer.custom, observer.id, t])

  return { notice, setNotice, dismissNotice }
}
