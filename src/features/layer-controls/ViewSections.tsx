import { Crosshair, SlidersHorizontal } from 'lucide-react'
import { quickViews } from '@/config'
import { useT } from '@/i18n'
import { SectionTitle, ToggleButton } from '@/shared/ui'
import styles from './layerControls.module.css'
import type { SkyView } from '@/shared/types/sky'

export function MagnitudeSection({
  magnitudeLimit,
  onChange,
}: {
  magnitudeLimit: number
  onChange: (value: number) => void
}) {
  const t = useT()
  const labelId = 'magnitude-limit-label'
  return (
    <section className={styles.section}>
      <SectionTitle icon={<SlidersHorizontal size={14} />} trailing={`≤ ${magnitudeLimit.toFixed(1)}`}>
        <span id={labelId}>{t('view.magnitude')}</span>
      </SectionTitle>
      <input
        className={styles.range}
        type="range"
        min="-1.5"
        max="8"
        step="0.5"
        value={magnitudeLimit}
        aria-labelledby={labelId}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </section>
  )
}

export function QuickViewSection({
  view,
  onChange,
}: {
  view: SkyView
  onChange: (view: SkyView) => void
}) {
  const t = useT()
  return (
    <section className={styles.section}>
      <SectionTitle icon={<Crosshair size={14} />}>{t('view.title')}</SectionTitle>
      <div className={styles.quickViews}>
        {quickViews.map((preset) => {
          const label = t(`view.${preset.id}`)
          return (
            <ToggleButton
              key={preset.id}
              className={styles.quickView}
              aria-label={t('view.turnTo', { name: label })}
              onClick={() => onChange({
                azimuth: preset.azimuth === 'current' ? view.azimuth : preset.azimuth,
                altitude: preset.altitude,
                fov: view.fov,
              })}
            >
              {label}
            </ToggleButton>
          )
        })}
      </div>
    </section>
  )
}
