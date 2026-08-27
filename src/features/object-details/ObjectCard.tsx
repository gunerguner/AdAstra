import { X } from 'lucide-react'
import type { Ref } from 'react'
import type { SelectedSkyObject } from '@/shared/types/sky'
import { bodyKindKey, constellationLabel, skyObjectLabel, useLocale } from '@/i18n'
import { IconButton } from '@/shared/ui'
import styles from './objectDetails.module.css'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'

type Props = {
  selected: SelectedSkyObject
  catalog: RuntimeCatalog
  onClose: () => void
  ref?: Ref<HTMLElement>
}

const BODY_CARD_KIND = { sun: 'sun', moon: 'moon' } as const

export default function ObjectCard({ selected, catalog, onClose, ref }: Props) {
  const { locale, t } = useLocale()
  const kind = selected.type === 'star'
    ? 'star'
    : (BODY_CARD_KIND[selected.id as keyof typeof BODY_CARD_KIND] ?? 'planet')
  const phaseKey = selected.phaseKey ? `moonPhase.${selected.phaseKey}` : null
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
        {selected.magnitude !== undefined && <span><small>{t('card.magnitude')}</small>{selected.magnitude.toFixed(2)}</span>}
        {phaseKey && (
          <span>
            <small>{t('card.phase')}</small>
            {t(phaseKey)}
            {selected.phaseFraction != null ? ` · ${Math.round(selected.phaseFraction * 100)}%` : ''}
          </span>
        )}
        <span><small>{t('card.altitude')}</small><b data-stat="altitude">{selected.altitude.toFixed(1)}°</b></span>
        <span><small>{t('card.azimuth')}</small><b data-stat="azimuth">{selected.azimuth.toFixed(1)}°</b></span>
      </div>
    </aside>
  )
}
