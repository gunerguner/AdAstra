import type { RefObject } from 'react'
import type { ConstellationStars } from '@/engine/astronomy/constellationData'
import { cardinals, eclipticPoles } from '@/config'
import { localizedName, useLocale } from '@/i18n'
import styles from './skyViewer.module.css'

type Props = {
  constellationStars: ConstellationStars[]
  cardinalRefs: RefObject<Record<string, HTMLDivElement | null>>
  eclipticPoleRefs: RefObject<Record<string, HTMLDivElement | null>>
  constellationNameRefs: RefObject<Record<string, HTMLDivElement | null>>
}

export default function SkyOverlayLabels({
  constellationStars,
  cardinalRefs,
  eclipticPoleRefs,
  constellationNameRefs,
}: Props) {
  const { locale, t } = useLocale()
  return (
    <>
      {cardinals.map((cardinal) => (
        <div
          key={cardinal.id}
          className={`${styles.cardinal} ${cardinal.id === 'north' ? styles.cardinalNorth : ''}`}
          ref={(node) => {
            cardinalRefs.current[cardinal.id] = node
          }}
        >
          {t(`cardinals.${cardinal.id}`)}
        </div>
      ))}
      {eclipticPoles.map((pole) => (
        <div
          key={pole.id}
          className={styles.eclipticPole}
          ref={(node) => {
            eclipticPoleRefs.current[pole.id] = node
          }}
        >
          <span className={styles.eclipticPoleCross} aria-hidden="true" />
          <span className={styles.eclipticPoleLabel}>{t(`ecliptic.${pole.id}`)}</span>
        </div>
      ))}
      {constellationStars.map((line) => (
        <div
          key={line.id}
          className={styles.constellationName}
          ref={(node) => {
            constellationNameRefs.current[line.id] = node
          }}
        >
          {localizedName(line.names, locale)}
        </div>
      ))}
    </>
  )
}
