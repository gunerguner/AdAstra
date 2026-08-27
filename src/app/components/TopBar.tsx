import { CircleDot, Compass, Locate, MapPin, Sparkles } from 'lucide-react'
import type { RefObject } from 'react'
import type { SkyView } from '@/shared/types/sky'
import { localizedName, useLocale } from '@/i18n'
import { useObserver } from '../hooks/useObserver'
import CityCombobox from './CityCombobox'
import styles from './TopBar.module.css'

type Props = {
  location: ReturnType<typeof useObserver>
  view: SkyView
  datetimeValue: string
  datetimeInputRef: RefObject<HTMLInputElement | null>
  onDateTimeChange: (value: string) => void
  onNotice: (message: string) => void
}

export default function TopBar({
  location,
  view,
  datetimeValue,
  datetimeInputRef,
  onDateTimeChange,
  onNotice,
}: Props) {
  const { locale, setLocale, t } = useLocale()
  const {
    cities,
    observer,
    locateStatus,
    isAtGeolocation,
    setCity,
    setPlace,
    setLatitude,
    setLongitude,
    locateHere,
  } = location
  const locating = locateStatus === 'pending'
  const cityLabel = locating
    ? t('location.locating')
    : observer.custom
      ? t('location.custom')
      : localizedName(observer.names, locale)

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.mark}><Sparkles size={16} strokeWidth={1.7} /></span>
        <span>AD ASTRA</span>
        <i />
        <small>{t('brand.tagline')}</small>
      </div>
      <div className={styles.status}>
        <div className={`${styles.stat} ${styles.place}`}>
          <MapPin size={13} />
          <span>{t('location.label')}</span>
          <CityCombobox
            cities={cities}
            observerId={observer.id}
            currentLabel={cityLabel}
            locale={locale}
            onSelectCity={setCity}
            onSelectPlace={setPlace}
            onNotice={onNotice}
          />
          <button
            type="button"
            className={`${styles.locate} ${isAtGeolocation ? styles.locateActive : ''}`}
            aria-label={t('location.locateHere')}
            aria-pressed={isAtGeolocation}
            aria-busy={locating}
            disabled={locating}
            onClick={locateHere}
          >
            <Locate size={13} strokeWidth={1.7} />
          </button>
        </div>
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
      <div className={styles.lang} role="group" aria-label={t('brand.language')}>
        <button
          type="button"
          className={locale === 'zh' ? styles.langActive : undefined}
          aria-pressed={locale === 'zh'}
          onClick={() => setLocale('zh')}
        >
          {t('brand.langZh')}
        </button>
        <button
          type="button"
          className={locale === 'en' ? styles.langActive : undefined}
          aria-pressed={locale === 'en'}
          onClick={() => setLocale('en')}
        >
          {t('brand.langEn')}
        </button>
      </div>
    </header>
  )
}
