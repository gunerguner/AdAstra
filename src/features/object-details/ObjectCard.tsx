import { X } from 'lucide-react'
import type { Ref } from 'react'
import type { SelectedSkyObject } from '@/shared/types/sky'
import { bodyKindLabel } from '@/engine/render/bodyAppearance'
import { IconButton } from '@/shared/ui'
import styles from './objectDetails.module.css'

type Props = {
  selected: SelectedSkyObject
  onClose: () => void
  ref?: Ref<HTMLElement>
}

export default function ObjectCard({ selected, onClose, ref }: Props) {
  const kind = selected.type === 'star' ? 'star' : selected.id === 'sun' || selected.id === 'moon' ? selected.id : 'planet'
  return (
    <aside className={styles.card} data-kind={kind} ref={ref}>
      <IconButton className={styles.close} onClick={onClose} aria-label="关闭详情"><X size={15} /></IconButton>
      <span className={styles.eyebrow}><i className={styles.swatch} aria-hidden="true" />{selected.type === 'star' ? '恒星' : bodyKindLabel(selected.id)}</span>
      <h2>{selected.name}</h2>
      <div className={styles.stats}>
        {selected.constellation && <span><small>星座</small>{selected.constellation}</span>}
        {selected.magnitude !== undefined && <span><small>视星等</small>{selected.magnitude.toFixed(2)}</span>}
        {selected.phaseName && (
          <span>
            <small>月相</small>
            {selected.phaseName}
            {selected.phaseFraction != null ? ` · ${Math.round(selected.phaseFraction * 100)}%` : ''}
          </span>
        )}
        <span><small>高度</small><b data-stat="altitude">{selected.altitude.toFixed(1)}°</b></span>
        <span><small>方位</small><b data-stat="azimuth">{selected.azimuth.toFixed(1)}°</b></span>
      </div>
    </aside>
  )
}
