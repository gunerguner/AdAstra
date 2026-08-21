import { useState } from 'react'
import { Orbit, Star } from 'lucide-react'
import { brightestStarIds, solarQuickTargets } from '@/config/quickTargets'
import { bodyAppearance } from '@/engine/render/bodyAppearance'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import styles from './quickNav.module.css'

type Tab = 'bodies' | 'stars'

type Props = {
  catalog: RuntimeCatalog
  bodyMagnitudes?: Record<string, number>
  onLocate: (id: string, type: 'star' | 'body') => void
}

function formatMagnitude(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(2)}`
}

export default function QuickNav({ catalog, bodyMagnitudes, onLocate }: Props) {
  const [tab, setTab] = useState<Tab>('bodies')
  const stars = brightestStarIds.flatMap((id) => {
    const star = catalog.starById.get(id)
    return star ? [star] : []
  })

  return (
    <section className={styles.section}>
      <div className={styles.tabs} role="tablist" aria-label="快速定位">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'bodies'}
          onClick={() => setTab('bodies')}
        >
          <Orbit size={13} />
          太阳系
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stars'}
          onClick={() => setTab('stars')}
        >
          <Star size={13} />
          亮星
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
                  <span>{body.name}</span>
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
                <span>{star.name}</span>
                <small>{formatMagnitude(star.magnitude)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
