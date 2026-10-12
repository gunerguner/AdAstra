/** 顶栏：城市搜索、定位、时间、当前视角、中英切换。 */
import { CircleDot, Compass, Locate, MapPin, Sparkles } from 'lucide-react'
import { memo, type RefObject } from 'react'
import type { SkyView } from '@/shared/types/sky'
import { formatViewBearing } from '@/engine/interaction/viewConstraints'
import { localizedName, useLocale } from '@/i18n'
import { useObserver } from '../hooks/useObserver'
import CityCombobox from './CityCombobox'
import styles from './TopBar.module.css'

/** 方位数字单独 memo：拖拽时直接改 textContent，播放引起的顶栏重渲染不能把它刷回旧值。 */
const ViewBearing = memo(function ViewBearing({
  view,
  labelRef,
}: {
  view: SkyView
  labelRef: RefObject<HTMLElement | null>
}) {
  return <strong ref={labelRef}>{formatViewBearing(view)}</strong>
})

type Props = {
  location: ReturnType<typeof useObserver>
  view: SkyView
  viewLabelRef: RefObject<HTMLElement | null>
  datetimeDefault: string
  datetimeInputRef: RefObject<HTMLInputElement | null>
  onDateTimeChange: (value: string) => void
  onNotice: (message: string) => void
}

export default function TopBar({
  location,
  view,
  viewLabelRef,
  datetimeDefault,
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
            defaultValue={datetimeDefault}
            onChange={(event) => onDateTimeChange(event.target.value)}
          />
        </label>
        <div className={`${styles.stat} ${styles.view}`}>
          <Compass size={13} />
          <span>{t('location.view')}</span>
          <ViewBearing view={view} labelRef={viewLabelRef} />
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
