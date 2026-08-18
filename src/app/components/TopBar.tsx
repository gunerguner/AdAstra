import { CircleDot, Compass, MapPin, RotateCcw, Settings2, Sparkles } from 'lucide-react'
import { IconButton } from '@/shared/ui'
import styles from './TopBar.module.css'

type Props = {
  observerName: string
  timeZone: string
  formattedTime: string
  azimuth: number
  altitude: number
  settingsOpen: boolean
  onResetNow: () => void
  onToggleSettings: () => void
}

export default function TopBar({
  observerName,
  timeZone,
  formattedTime,
  azimuth,
  altitude,
  settingsOpen,
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
        <div className={styles.stat}>
          <MapPin size={13} />
          <span>地点</span>
          <strong>{observerName}</strong>
        </div>
        <div className={`${styles.stat} ${styles.time}`}>
          <CircleDot size={13} />
          <span>{timeZone}</span>
          <strong>{formattedTime}</strong>
        </div>
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
