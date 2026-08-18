import { CircleDot, Compass, MapPin, RotateCcw, Settings2, Sparkles } from 'lucide-react'
import { IconButton } from '@/shared/ui'
import styles from './TopBar.module.css'

type Observer = {
  name: string
  latitude: number
  longitude: number
  timeZone: string
}

type Props = {
  cities: readonly Observer[]
  activeCityIndex: number
  observer: Observer
  datetimeValue: string
  azimuth: number
  altitude: number
  settingsOpen: boolean
  onCityChange: (index: number) => void
  onLatitudeChange: (value: number) => void
  onLongitudeChange: (value: number) => void
  onDateTimeChange: (value: string) => void
  onResetNow: () => void
  onToggleSettings: () => void
}

export default function TopBar({
  cities,
  activeCityIndex,
  observer,
  datetimeValue,
  azimuth,
  altitude,
  settingsOpen,
  onCityChange,
  onLatitudeChange,
  onLongitudeChange,
  onDateTimeChange,
  onResetNow,
  onToggleSettings,
}: Props) {
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
            onChange={(event) => onCityChange(Number(event.target.value))}
          >
            {cities.map((city, index) => (
              <option value={index} key={city.name}>{city.name}</option>
            ))}
          </select>
        </label>
        <label className={`${styles.stat} ${styles.coord}`}>
          <span>纬度</span>
          <input
            aria-label="纬度"
            type="number"
            min="-90"
            max="90"
            step="0.01"
            value={observer.latitude}
            onChange={(event) => onLatitudeChange(Number(event.target.value))}
          />
        </label>
        <label className={`${styles.stat} ${styles.coord}`}>
          <span>经度</span>
          <input
            aria-label="经度"
            type="number"
            min="-180"
            max="180"
            step="0.01"
            value={observer.longitude}
            onChange={(event) => onLongitudeChange(Number(event.target.value))}
          />
        </label>
        <label className={`${styles.stat} ${styles.time}`}>
          <CircleDot size={13} />
          <span>{observer.timeZone}</span>
          <input
            aria-label="时刻"
            type="datetime-local"
            value={datetimeValue}
            onChange={(event) => onDateTimeChange(event.target.value)}
          />
        </label>
        <div className={`${styles.stat} ${styles.view}`}>
          <Compass size={13} />
          <span>视线</span>
          <strong>{Math.round(azimuth)}° · {Math.round(altitude)}°</strong>
        </div>
      </div>
      <div className={styles.meta}>
        <IconButton onClick={onResetNow} aria-label="回到此时此地"><RotateCcw size={17} /></IconButton>
        <IconButton
          active={settingsOpen}
          onClick={onToggleSettings}
          aria-label={settingsOpen ? '收起控制台' : '展开控制台'}
          aria-pressed={settingsOpen}
        >
          <Settings2 size={17} />
        </IconButton>
      </div>
    </header>
  )
}
