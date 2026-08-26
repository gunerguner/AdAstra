import { CircleDot, Compass, MapPin, Sparkles } from 'lucide-react'
import type { RefObject } from 'react'
import type { SkyView } from '@/shared/types/sky'
import { useLocale } from '@/i18n'
import { useObserver } from '../hooks/useObserver'
import styles from './TopBar.module.css'

type Props = {
  location: ReturnType<typeof useObserver>
  view: SkyView
  datetimeValue: string
  datetimeInputRef: RefObject<HTMLInputElement | null>
  onDateTimeChange: (value: string) => void
}

export default function TopBar({
  location,
  view,
  datetimeValue,
  datetimeInputRef,
  onDateTimeChange,
}: Props) {
  const { locale, setLocale, t } = useLocale()
  const { cities, activeCityIndex, observer, setCity, setLatitude, setLongitude } = location

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.mark}><Sparkles size={16} strokeWidth={1.7} /></span>
        <span>AD ASTRA</span>
        <i />
        <small>{t('brand.tagline')}</small>
        <div className={styles.lang} role="group" aria-label={t('brand.language')}>
          <button
            type="button"
            className={locale === 'zh' ? styles.langActive : ''}
            aria-pressed={locale === 'zh'}
            onClick={() => setLocale('zh')}
          >
            {t('brand.langZh')}
          </button>
          <button
            type="button"
            className={locale === 'en' ? styles.langActive : ''}
            aria-pressed={locale === 'en'}
            onClick={() => setLocale('en')}
          >
            {t('brand.langEn')}
          </button>
        </div>
      </div>
      <div className={styles.status}>
        <label className={styles.stat}>
          <MapPin size={13} />
          <span>{t('location.label')}</span>
          <select
            aria-label={t('location.city')}
            value={activeCityIndex}
            onChange={(event) => setCity(Number(event.target.value))}
          >
            {cities.map((city, index) => (
              <option value={index} key={city.id}>{city.names[locale]}</option>
            ))}
          </select>
        </label>
        {[
          { key: 'latitude' as const, min: -90, max: 90, value: observer.latitude, onChange: setLatitude },
          { key: 'longitude' as const, min: -180, max: 180, value: observer.longitude, onChange: setLongitude },
        ].map((coord) => (
          <label className={`${styles.stat} ${styles.coord}`} key={coord.key}>
            <span>{t(`location.${coord.key}`)}</span>
            <input
              aria-label={t(`location.${coord.key}`)}
              type="number"
              min={coord.min}
              max={coord.max}
              step="0.01"
              value={coord.value}
              onChange={(event) => coord.onChange(Number(event.target.value))}
            />
          </label>
        ))}
        <label className={`${styles.stat} ${styles.time}`}>
          <CircleDot size={13} />
          <span>{observer.timeZone}</span>
          <input
            ref={datetimeInputRef}
            aria-label={t('location.time')}
            type="datetime-local"
            value={datetimeValue}
            onChange={(event) => onDateTimeChange(event.target.value)}
          />
        </label>
        <div className={`${styles.stat} ${styles.view}`}>
          <Compass size={13} />
          <span>{t('location.view')}</span>
          <strong>{Math.round(view.azimuth)}° · {Math.round(view.altitude)}°</strong>
        </div>
      </div>
    </header>
  )
}
