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
import type { AtmospherePhase } from '@/engine/render/atmosphereState'
import { useT } from '@/i18n'
import type { MessageKey } from '@/i18n/types'
import { IconButton } from '@/shared/ui'
import styles from './timeControls.module.css'

type Props = {
  open: boolean
  onToggleOpen: () => void
  onResetNow: () => void
  playback: Playback
  phase: AtmospherePhase
  clockRefs: Pick<LiveClockRefs, 'yearLabel'>
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
  onResetNow,
  playback,
  phase,
  clockRefs,
  children,
}: Props) {
  const t = useT()
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
    <footer className={`${styles.deck} ${open ? '' : styles.collapsed}`} aria-label={t('time.deck')}>
      <div className={styles.top}>
        <div className={styles.start}>
          <div className={`${styles.label} ${open ? '' : 'sr-only'}`}>
            <strong ref={clockRefs.yearLabel}>{playback.currentTime.getFullYear()}</strong>
            <span className={styles.phase}>
              <PhaseIcon phase={phase} />
              {t(`phase.${phase}` as MessageKey)}
            </span>
          </div>
          {open && (
            <label className={styles.speed}>{t('time.speed')}
              <select value={playback.speed} onChange={(event) => playback.setSpeed(Number(event.target.value))}>
                {playbackSpeeds.map((item) => (
                  <option value={item.value} key={item.value}>{t(`speed.${item.id}` as MessageKey)}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.step} onClick={() => playback.adjustTime(-3600000)} aria-label={t('time.stepBack')} aria-hidden={!open} tabIndex={open ? 0 : -1}>
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={`${styles.play} ${playback.isPlaying ? styles.playing : ''}`}
            onClick={playback.togglePlay}
            aria-label={playback.isPlaying ? t('time.pause') : t('time.play')}
          >
            {playback.isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          </button>
          <button type="button" className={styles.step} onClick={() => playback.adjustTime(3600000)} aria-label={t('time.stepForward')} aria-hidden={!open} tabIndex={open ? 0 : -1}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className={styles.side}>
          <button
            type="button"
            className={styles.now}
            onClick={onResetNow}
            aria-label={t('time.resetNow')}
            title={t('time.resetNow')}
          >
            <span className={styles.nowDot} aria-hidden="true" />
            {t('time.now')}
          </button>
          <IconButton
            className={styles.toggle}
            onClick={onToggleOpen}
            aria-label={open ? t('time.collapse') : t('time.expand')}
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
            aria-label={t('time.scrub')}
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
