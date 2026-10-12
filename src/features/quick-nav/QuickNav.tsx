/** 快速导航：太阳系天体和最亮恒星，点一下转到目标。 */
import { useEffect, useState, type RefObject } from 'react'
import { Orbit, Star } from 'lucide-react'
import { brightestStarIds, solarQuickTargets } from '@/config'
import type { BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { bodyAppearance } from '@/engine/render/bodyAppearance'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import { localizedName, useLocale } from '@/i18n'
import type { SkySimulation } from '@/shared/types/sky'
import { useBodyMagnitudes } from './useBodyMagnitudes'
import styles from './quickNav.module.css'

type Tab = 'bodies' | 'stars'

type Props = {
  catalog: RuntimeCatalog
  simulationRef: RefObject<SkySimulation>
  bodySnapshotRef: RefObject<BodySnapshotWindow | null>
  isPlaying: boolean
  /** Worker 快照到达时调用，立刻重算星等。 */
  refreshRef: RefObject<() => void>
  onLocate: (id: string, type: 'star' | 'body') => void
}

function formatMagnitude(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(2)}`
}

export default function QuickNav({
  catalog,
  simulationRef,
  bodySnapshotRef,
  isPlaying,
  refreshRef,
  onLocate,
}: Props) {
  const { locale, t } = useLocale()
  const [tab, setTab] = useState<Tab>('bodies')
  const { bodyMagnitudes, refresh } = useBodyMagnitudes({
    simulationRef,
    bodySnapshotRef,
    isPlaying,
  })
  useEffect(() => {
    refreshRef.current = refresh
    return () => {
      refreshRef.current = () => {}
    }
  }, [refresh, refreshRef])
  const stars = brightestStarIds.flatMap((id) => {
    const star = catalog.starById.get(id)
    return star ? [star] : []
  })

  return (
    <section className={styles.section}>
      <div className={styles.tabs} role="tablist" aria-label={t('nav.title')}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'bodies'}
          onClick={() => setTab('bodies')}
        >
          <Orbit size={13} />
          {t('nav.bodies')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stars'}
          onClick={() => setTab('stars')}
        >
          <Star size={13} />
          {t('nav.stars')}
        </button>
      </div>
      {tab === 'bodies' ? (
        <ul className={styles.list} role="tabpanel">
          {solarQuickTargets.map((body) => {
            const magnitude = bodyMagnitudes?.[body.id]
            return (
              <li key={body.id}>
                <button type="button" className={styles.item} onClick={() => onLocate(body.id, 'body')}>
                  <i className={styles.swatch} style={{ background: bodyAppearance[body.id]?.color }} aria-hidden="true" />
                  <span>{t(`bodies.${body.id}`)}</span>
                  <small>{magnitude == null ? '—' : formatMagnitude(magnitude)}</small>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className={styles.list} role="tabpanel">
          {stars.map((star) => (
            <li key={star.id}>
              <button type="button" className={styles.item} onClick={() => onLocate(star.id, 'star')}>
                <i className={styles.swatch} style={{ background: star.color }} aria-hidden="true" />
                <span>{localizedName(star.names, locale)}</span>
                <small>{formatMagnitude(star.magnitude)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
