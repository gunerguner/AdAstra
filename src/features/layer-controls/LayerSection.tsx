import { Layers3 } from 'lucide-react'
import { layerToggles } from '@/config/layerToggles'
import type { LayerState } from '@/shared/types/sky'
import { SectionTitle, ToggleButton } from '@/shared/ui'
import styles from './layerControls.module.css'

type Props = {
  layers: LayerState
  onToggle: (key: keyof LayerState) => void
}

export default function LayerSection({ layers, onToggle }: Props) {
  return (
    <section className={styles.section}>
      <SectionTitle icon={<Layers3 size={14} />}>图层</SectionTitle>
      <div className={styles.grid}>
        {layerToggles.map((item) => (
          <ToggleButton
            key={item.key}
            pressed={layers[item.key]}
            variant={item.variant}
            onClick={() => onToggle(item.key)}
          >
            {item.swatch && <i className={styles.swatch} style={{ background: item.swatch }} />}
            {item.label}
          </ToggleButton>
        ))}
      </div>
    </section>
  )
}
