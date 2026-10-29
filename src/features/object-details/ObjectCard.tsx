/** 选中天体信息卡：种类、名称、星座、星等、月相。 */
import { X } from 'lucide-react'
import { useEffect, useState, type Ref, type RefObject } from 'react'
import type { SelectedSkyObject, SkySimulation } from '@/shared/types/sky'
import type { ObjectCardStats } from '@/shared/types/slot'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { moonPhaseName } from '@/engine/astronomy/moonPhaseName'
import { bodyKindKey, constellationLabel, skyObjectLabel, useLocale } from '@/i18n'
import { IconButton } from '@/shared/ui'
import styles from './objectDetails.module.css'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'

type Props = {
  selected: SelectedSkyObject
  catalog: RuntimeCatalog
  onClose: () => void
  ref?: Ref<HTMLElement>
  statsRef: RefObject<ObjectCardStats>
  simulationRef: RefObject<SkySimulation>
  bodySnapshotRef: RefObject<BodySnapshotWindow | null>
}

const BODY_CARD_KIND = { sun: 'sun', moon: 'moon' } as const
const LIVE_REFRESH_MS = 1000

type LiveBody = {
  magnitude: number
  altitude: number
  azimuth: number
  phaseKey?: string
  phaseFraction?: number
}

export default function ObjectCard({
  selected,
  catalog,
  onClose,
  ref,
  statsRef,
  simulationRef,
  bodySnapshotRef,
}: Props) {
  const { locale, t } = useLocale()
  const [live, setLive] = useState<LiveBody | null>(null)
  const kind = selected.type === 'star'
    ? 'star'
    : (BODY_CARD_KIND[selected.id as keyof typeof BODY_CARD_KIND] ?? 'planet')

  useEffect(() => {
    setLive(null)
  }, [selected.id, selected.type])

  useEffect(() => {
    if (selected.type !== 'body') return
    const pull = () => {
      const body = interpolateBodySnapshots(bodySnapshotRef.current, simulationRef.current.utcMillis, simulationRef.current.observer)
        .find((item) => item.id === selected.id)
      if (!body) return
      const phaseKey = body.id === 'moon' && body.synodicDeg != null ? moonPhaseName(body.synodicDeg) : undefined
      setLive({
        magnitude: body.magnitude,
        altitude: body.altitude,
        azimuth: body.azimuth,
        phaseFraction: body.phaseFraction,
        phaseKey,
      })
    }
    pull()
    const timer = window.setInterval(pull, LIVE_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [selected.id, selected.type, bodySnapshotRef, simulationRef])

  const magnitude = live?.magnitude ?? selected.magnitude
  const altitude = live?.altitude ?? selected.altitude
  const azimuth = live?.azimuth ?? selected.azimuth
  const phaseKey = (live?.phaseKey ?? selected.phaseKey) ? `moonPhase.${live?.phaseKey ?? selected.phaseKey}` : null
  const phaseFraction = live?.phaseFraction ?? selected.phaseFraction

  return (
    <aside className={styles.card} data-kind={kind} ref={ref}>
      <IconButton className={styles.close} onClick={onClose} aria-label={t('card.close')}><X size={15} /></IconButton>
      <span className={styles.eyebrow}>
        <i className={styles.swatch} aria-hidden="true" />
        {selected.type === 'star' ? t('card.star') : t(bodyKindKey(selected.id))}
      </span>
      <h2>{skyObjectLabel(selected, catalog, locale, t)}</h2>
      <div className={styles.stats}>
        {selected.constellationId && (
          <span><small>{t('card.constellation')}</small>{constellationLabel(selected.constellationId, locale)}</span>
        )}
        {magnitude !== undefined && (
          <span>
            <small>{t('card.magnitude')}</small>
            <b ref={(node) => { statsRef.current.magnitude = node }}>{magnitude.toFixed(2)}</b>
          </span>
        )}
        {phaseKey && (
          <span>
            <small>{t('card.phase')}</small>
            {t(phaseKey)}
            {phaseFraction != null ? ` · ${Math.round(phaseFraction * 100)}%` : ''}
          </span>
        )}
        <span>
          <small>{t('card.altitude')}</small>
          <b ref={(node) => { statsRef.current.altitude = node }}>{altitude.toFixed(1)}°</b>
        </span>
        <span>
          <small>{t('card.azimuth')}</small>
          <b ref={(node) => { statsRef.current.azimuth = node }}>{azimuth.toFixed(1)}°</b>
        </span>
      </div>
    </aside>
  )
}
