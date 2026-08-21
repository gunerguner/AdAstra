import { CircleDot, Compass, MapPin, Sparkles } from 'lucide-react'
import type { RefObject } from 'react'
import type { SkyView } from '@/shared/types/sky'
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
  const { cities, activeCityIndex, observer, setCity, setLatitude, setLongitude } = location

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.mark}><Sparkles size={16} strokeWidth={1.7} /></span>
        <span>AD ASTRA</span>
        <i />
        <small>实时星空</small>
      </div>
      <div className={styles.status}>
        <label className={styles.stat}>
          <MapPin size={13} />
          <span>地点</span>
          <select
            aria-label="城市"
            value={activeCityIndex}
            onChange={(event) => setCity(Number(event.target.value))}
          >
            {cities.map((city, index) => (
              <option value={index} key={city.name}>{city.name}</option>
            ))}
          </select>
        </label>
        {[
          { label: '纬度', min: -90, max: 90, value: observer.latitude, onChange: setLatitude },
          { label: '经度', min: -180, max: 180, value: observer.longitude, onChange: setLongitude },
        ].map((coord) => (
          <label className={`${styles.stat} ${styles.coord}`} key={coord.label}>
            <span>{coord.label}</span>
            <input
              aria-label={coord.label}
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
            aria-label="时刻"
            type="datetime-local"
            value={datetimeValue}
            onChange={(event) => onDateTimeChange(event.target.value)}
          />
        </label>
        <div className={`${styles.stat} ${styles.view}`}>
          <Compass size={13} />
          <span>视线</span>
          <strong>{Math.round(view.azimuth)}° · {Math.round(view.altitude)}°</strong>
        </div>
      </div>
    </header>
  )
}
