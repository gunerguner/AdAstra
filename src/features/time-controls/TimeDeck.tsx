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
import { useEffect, useRef, type ReactNode } from 'react'
import type { LiveClockRefs, Playback } from '@/app/hooks/usePlayback'
import { playbackSpeeds } from '@/config/playbackSpeeds'
import { TIMELINE_RANGE_HOURS, TIMELINE_RANGE_MS } from '@/config/timeline'
import { atmospherePhaseLabel, type AtmospherePhase } from '@/engine/render/bodyAppearance'
import { IconButton } from '@/shared/ui'
import styles from './timeControls.module.css'

type Props = {
  open: boolean
  onToggleOpen: () => void
  playback: Playback
  phase: AtmospherePhase
  clockRefs: Pick<LiveClockRefs, 'yearLabel' | 'formattedTime'>
  children?: ReactNode
}

function PhaseIcon({ phase }: { phase: AtmospherePhase }) {
  if (phase === 'day') return <Sun size={11} />
  if (phase === 'night') return <Moon size={11} />
  return <Sunset size={11} />
}

export default function TimeDeck({
  open,
  onToggleOpen,
  playback,
  phase,
  clockRefs,
  children,
}: Props) {
  const sliderRef = useRef<HTMLInputElement>(null)
  const draggingRef = useRef(false)
  const endScrub = () => {
    draggingRef.current = false
    playback.endTimelineScrub()
  }

  useEffect(() => {
    if (draggingRef.current) return
    const slider = sliderRef.current
    if (slider && slider.value !== String(playback.timelineOffset)) slider.value = String(playback.timelineOffset)
  }, [playback.timelineOffset])

  return (
    <footer className={`${styles.deck} ${open ? '' : styles.collapsed}`} aria-label="时间控制与站点信息">
      <div className={styles.top}>
        <div className={styles.label}>
          <strong ref={clockRefs.yearLabel}>{playback.currentTime.getFullYear()}</strong>
          <span className={styles.phase}>
            <PhaseIcon phase={phase} />
            {atmospherePhaseLabel(phase)}
          </span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.step} onClick={() => playback.adjustTime(-3600000)} aria-label="后退一小时" aria-hidden={!open} tabIndex={open ? 0 : -1}>
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={`${styles.play} ${playback.isPlaying ? styles.playing : ''}`}
            onClick={playback.togglePlay}
            aria-label={playback.isPlaying ? '暂停' : '播放'}
          >
            {playback.isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          </button>
          <button type="button" className={styles.step} onClick={() => playback.adjustTime(3600000)} aria-label="前进一小时" aria-hidden={!open} tabIndex={open ? 0 : -1}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className={styles.side}>
          {open ? (
            <label className={styles.speed}>速度
              <select value={playback.speed} onChange={(event) => playback.setSpeed(Number(event.target.value))}>
                {playbackSpeeds.map((item) => (
                  <option value={item.value} key={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <span className={styles.clock} ref={clockRefs.formattedTime}>{playback.formattedTime}</span>
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
            onChange={(event) => playback.scrubTimeline(Number(event.target.value))}
            onPointerDown={(event) => {
              draggingRef.current = true
              event.currentTarget.setPointerCapture(event.pointerId)
              playback.beginTimelineScrub(Number(event.currentTarget.value))
            }}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
            onKeyUp={playback.endTimelineScrub}
          />
        </div>
        <span>+{TIMELINE_RANGE_HOURS}h</span>
      </div>
      {children}
    </footer>
  )
}
