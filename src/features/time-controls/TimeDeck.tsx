import {
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Moon,
  Pause,
  Play,
  Sun,
  Sunset,
} from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'
import { playbackSpeeds } from '@/config/playbackSpeeds'
import { TIMELINE_RANGE_HOURS, TIMELINE_RANGE_MS } from '@/config/timeline'
import type { AtmospherePhase } from '@/engine/render/bodyAppearance'
import { IconButton } from '@/shared/ui'
import styles from './timeControls.module.css'

type Props = {
  open: boolean
  year: number
  isPlaying: boolean
  speed: number
  formattedTime: string
  timelineOffset: number
  phaseLabel: string
  phase: AtmospherePhase
  onToggleOpen: () => void
  onPlayPause: () => void
  onAdjustTime: (milliseconds: number) => void
  onSpeedChange: (speed: number) => void
  onTimelineChange: (offset: number) => void
  onTimelineAnchor: (offset: number) => void
  onTimelineCommit: () => void
  yearLabelRef: RefObject<HTMLElement | null>
  formattedTimeRef: RefObject<HTMLElement | null>
}

function PhaseIcon({ phase }: { phase: AtmospherePhase }) {
  if (phase === 'day') return <Sun size={11} />
  if (phase === 'night') return <Moon size={11} />
  return <Sunset size={11} />
}

export default function TimeDeck({
  open,
  year,
  isPlaying,
  speed,
  formattedTime,
  timelineOffset,
  phaseLabel,
  phase,
  onToggleOpen,
  onPlayPause,
  onAdjustTime,
  onSpeedChange,
  onTimelineChange,
  onTimelineAnchor,
  onTimelineCommit,
  yearLabelRef,
  formattedTimeRef,
}: Props) {
  const sliderRef = useRef<HTMLInputElement>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    if (draggingRef.current) return
    const slider = sliderRef.current
    if (slider && slider.value !== String(timelineOffset)) slider.value = String(timelineOffset)
  }, [timelineOffset])

  return (
    <footer className={`${styles.deck} ${open ? '' : styles.collapsed}`}>
      <div className={styles.top}>
        <div className={styles.label}>
          <strong ref={yearLabelRef}>{year}</strong>
          <span className={styles.phase}>
            <PhaseIcon phase={phase} />
            {phaseLabel}
          </span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.step} onClick={() => onAdjustTime(-3600000)} aria-label="后退一小时" aria-hidden={!open} tabIndex={open ? 0 : -1}>
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={`${styles.play} ${isPlaying ? styles.playing : ''}`}
            onClick={onPlayPause}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          </button>
          <button type="button" className={styles.step} onClick={() => onAdjustTime(3600000)} aria-label="前进一小时" aria-hidden={!open} tabIndex={open ? 0 : -1}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className={styles.side}>
          {open ? (
            <label className={styles.speed}>速度
              <select value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))}>
                {playbackSpeeds.map((item) => (
                  <option value={item.value} key={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <span className={styles.clock} ref={formattedTimeRef}>{formattedTime}</span>
          )}
          <IconButton
            className={styles.toggle}
            onClick={onToggleOpen}
            aria-label={open ? '收起时空序列' : '展开时空序列'}
            aria-pressed={open}
          >
            {open ? <ChevronsDownUp size={15} /> : <ChevronsUpDown size={15} />}
          </IconButton>
        </div>
      </div>
      <div className={styles.timelineWrap}>
        <div className={styles.timelineInner}>
          <div className={styles.timeline}>
            <span>−{TIMELINE_RANGE_HOURS}h</span>
            <div className={styles.track}>
              <input
                ref={sliderRef}
                aria-label="拖动调整时间"
                type="range"
                min={-TIMELINE_RANGE_MS}
                max={TIMELINE_RANGE_MS}
                defaultValue={0}
                onChange={(event) => onTimelineChange(Number(event.target.value))}
                onPointerDown={(event) => {
                  draggingRef.current = true
                  event.currentTarget.setPointerCapture(event.pointerId)
                  onTimelineAnchor(Number(event.currentTarget.value))
                }}
                onPointerUp={() => {
                  draggingRef.current = false
                  onTimelineCommit()
                }}
                onPointerCancel={() => {
                  draggingRef.current = false
                  onTimelineCommit()
                }}
                onKeyUp={onTimelineCommit}
              />
            </div>
            <span>+{TIMELINE_RANGE_HOURS}h</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
