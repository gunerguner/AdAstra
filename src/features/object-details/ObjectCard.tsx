import { X } from 'lucide-react'
import type { Ref } from 'react'
import type { SelectedSkyObject } from '@/shared/types/sky'
import { IconButton } from '@/shared/ui'
import styles from './objectDetails.module.css'

type Props = {
  selected: SelectedSkyObject
  onClose: () => void
  cardRef: Ref<HTMLElement>
}

export default function ObjectCard({ selected, onClose, cardRef }: Props) {
  return (
    <aside className={styles.card} ref={cardRef}>
      <IconButton className={styles.close} onClick={onClose} aria-label="关闭详情"><X size={15} /></IconButton>
      <span className={styles.eyebrow}>{selected.type === 'star' ? '恒星' : '行星'}</span>
      <h2>{selected.name}</h2>
      <div className={styles.stats}>
        {selected.constellation && <span><small>星座</small>{selected.constellation}</span>}
        {selected.magnitude !== undefined && <span><small>视星等</small>{selected.magnitude.toFixed(2)}</span>}
        <span><small>高度</small><b data-stat="altitude">{selected.altitude.toFixed(1)}°</b></span>
        <span><small>方位</small><b data-stat="azimuth">{selected.azimuth.toFixed(1)}°</b></span>
      </div>
    </aside>
  )
}
