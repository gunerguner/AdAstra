import { MapPin } from 'lucide-react'
import { SectionTitle } from '@/shared/ui'
import styles from './locationControls.module.css'

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
  onCityChange: (index: number) => void
  onLatitudeChange: (value: number) => void
  onLongitudeChange: (value: number) => void
  onDateTimeChange: (value: string) => void
}

export default function LocationSection({
  cities: cityList,
  activeCityIndex,
  observer,
  datetimeValue,
  onCityChange,
  onLatitudeChange,
  onLongitudeChange,
  onDateTimeChange,
}: Props) {
  return (
    <section className={styles.section}>
      <SectionTitle icon={<MapPin size={14} />}>地点</SectionTitle>
      <select
        id="city"
        className={styles.control}
        aria-label="城市"
        value={activeCityIndex}
        onChange={(event) => onCityChange(Number(event.target.value))}
      >
        {cityList.map((city, index) => <option value={index} key={city.name}>{city.name}</option>)}
      </select>
      <div className={styles.coordinates}>
        <label htmlFor="latitude">纬度
          <input
            id="latitude"
            type="number"
            min="-90"
            max="90"
            step="0.01"
            value={observer.latitude}
            onChange={(event) => onLatitudeChange(Number(event.target.value))}
          />
        </label>
        <label htmlFor="longitude">经度
          <input
            id="longitude"
            type="number"
            min="-180"
            max="180"
            step="0.01"
            value={observer.longitude}
            onChange={(event) => onLongitudeChange(Number(event.target.value))}
          />
        </label>
      </div>
      <label className={styles.fieldLabel} htmlFor="datetime">时刻</label>
      <input
        id="datetime"
        className={styles.control}
        type="datetime-local"
        value={datetimeValue}
        onChange={(event) => onDateTimeChange(event.target.value)}
      />
    </section>
  )
}
