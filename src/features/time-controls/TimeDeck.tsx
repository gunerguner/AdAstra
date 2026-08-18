import {
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  LocateFixed,
  Pause,
  Play,
} from 'lucide-react'
import { playbackSpeeds } from '@/config/playbackSpeeds'
import { IconButton } from '@/shared/ui'
import styles from './timeControls.module.css'

type Props = {
  open: boolean
  year: number
  isPlaying: boolean
  speed: number
  formattedTime: string
  timelineOffset: number
  onToggleOpen: () => void
  onPlayPause: () => void
  onAdjustTime: (milliseconds: number) => void
  onSpeedChange: (speed: number) => void
  onTimelineChange: (offset: number) => void
  onTimelineAnchor: () => void
  onResetNow: () => void
}

export default function TimeDeck({
  open,
  year,
  isPlaying,
  speed,
  formattedTime,
  timelineOffset,
  onToggleOpen,
  onPlayPause,
  onAdjustTime,
  onSpeedChange,
  onTimelineChange,
  onTimelineAnchor,
  onResetNow,
}: Props) {
  return (
    <footer className={`${styles.deck} ${open ? '' : styles.collapsed}`}>
      <div className={styles.top}>
        <div className={styles.label}><strong>{year}</strong></div>
        <div className={styles.actions}>
          {open && (
            <button type="button" className={styles.step} onClick={() => onAdjustTime(-3600000)} aria-label="后退一小时">
              <ChevronLeft size={18} />
            </button>
          )}
          <button type="button" className={styles.play} onClick={onPlayPause} aria-label={isPlaying ? '暂停' : '播放'}>
            {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>
          {open && (
            <button type="button" className={styles.step} onClick={() => onAdjustTime(3600000)} aria-label="前进一小时">
              <ChevronRight size={18} />
            </button>
          )}
        </div>
        {open ? (
          <label className={styles.speed}>速度
            <select value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))}>
              {playbackSpeeds.map((item) => (
                <option value={item.value} key={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        ) : (
          <span className={styles.speed}>{formattedTime}</span>
        )}
        <IconButton
          className={styles.toggle}
          onClick={onToggleOpen}
          aria-label={open ? '收起时空序列' : '展开时空序列'}
          aria-pressed={open}
        >
          {open ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
        </IconButton>
      </div>
      {open && (
        <>
          <div className={styles.timeline}>
            <span>−6h</span>
            <input
              aria-label="拖动调整时间"
              type="range"
              min="-21600000"
              max="21600000"
              value={timelineOffset}
              onChange={(event) => onTimelineChange(Number(event.target.value))}
              onMouseDown={onTimelineAnchor}
            />
            <span>+6h</span>
          </div>
          <div className={styles.bottom}>
            <button type="button" onClick={onResetNow}><LocateFixed size={14} /> 此时此地</button>
          </div>
        </>
      )}
    </footer>
  )
}
