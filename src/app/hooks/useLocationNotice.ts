import { useCallback, useEffect, useState } from 'react'
import { useT } from '@/i18n'
import type { LocateStatus, ResolvedObserver } from './useObserver'

/**
 * 定位过程到提示条的映射：请求中常驻显示，拒绝/失败只在落回默认城市（上海）时提示，
 * 用户主动换城后自动清除。动作提示（搜索失败、地平以下）不进这条通道。
 */
export function useLocationNotice(observer: ResolvedObserver, locateStatus: LocateStatus) {
  const t = useT()
  const [locationNotice, setLocationNotice] = useState<string | null>(null)
  const dismissLocationNotice = useCallback(() => setLocationNotice(null), [])

  useEffect(() => {
    if (locateStatus === 'pending') {
      setLocationNotice(t('location.locating'))
      return
    }
    const fellBackToShanghai = observer.id === 'shanghai' && !observer.custom
    if (locateStatus === 'denied' && fellBackToShanghai) {
      setLocationNotice(t('location.denied'))
      return
    }
    if (locateStatus === 'unavailable' && fellBackToShanghai) {
      setLocationNotice(t('location.unavailable'))
      return
    }
    setLocationNotice((current) => {
      if (current === t('location.locating')) return null
      if (!fellBackToShanghai && (current === t('location.denied') || current === t('location.unavailable'))) {
        return null
      }
      return current
    })
  }, [locateStatus, observer.custom, observer.id, t])

  return { locationNotice, dismissLocationNotice }
}
