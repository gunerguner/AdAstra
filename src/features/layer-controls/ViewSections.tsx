import { Crosshair, SlidersHorizontal } from 'lucide-react'
import { quickViews } from '@/config/quickViews'
import { SectionTitle } from '@/shared/ui'
import styles from './layerControls.module.css'
import type { SkyView } from '@/shared/types/sky'

export function MagnitudeSection({
  magnitudeLimit,
  onChange,
}: {
  magnitudeLimit: number
  onChange: (value: number) => void
}) {
  const labelId = 'magnitude-limit-label'
  return (
    <section className={styles.section}>
      <SectionTitle icon={<SlidersHorizontal size={14} />} trailing={`≤ ${magnitudeLimit.toFixed(1)}`}>
        <span id={labelId}>视星等</span>
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
  return (
    <section className={styles.section}>
      <SectionTitle icon={<Crosshair size={14} />}>视角</SectionTitle>
      <div className={styles.quickViews}>
        {quickViews.map((preset) => (
          <button
            type="button"
            key={preset.label}
            aria-label={`转向${preset.label}`}
            onClick={() => onChange({
              azimuth: preset.azimuth === 'current' ? view.azimuth : preset.azimuth,
              altitude: preset.altitude,
              fov: view.fov,
            })}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  )
}
