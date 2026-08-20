import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { SimulationClock } from '@/engine/clock/simulationClock'
import { defaultPlaybackSpeed } from '@/config/playbackSpeeds'
import { TIMELINE_UI_INTERVAL_MS } from '@/config/timeline'
import { formatDateTimeLocal } from '@/engine/coordinates/dateTimeLocal'
import type { SkySimulation } from '@/shared/types/sky'

export type LiveClockRefs = {
  datetimeInput: RefObject<HTMLInputElement | null>
  yearLabel: RefObject<HTMLElement | null>
  formattedTime: RefObject<HTMLElement | null>
}

function writeLiveClock(
  utcMillis: number,
  timeZone: string,
  clockRefs: LiveClockRefs,
  clockFormat: Intl.DateTimeFormat,
) {
  const datetime = clockRefs.datetimeInput.current
  if (datetime) datetime.value = formatDateTimeLocal(utcMillis, timeZone)
  const year = clockRefs.yearLabel.current
  if (year) year.textContent = String(new Date(utcMillis).getFullYear())
  const formatted = clockRefs.formattedTime.current
  if (formatted) formatted.textContent = clockFormat.format(utcMillis)
}

export function usePlayback(
  timeZone: string,
  simulationRef: RefObject<SkySimulation>,
  clockRefs: LiveClockRefs,
) {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(defaultPlaybackSpeed)
  const [timelineOffset, setTimelineOffset] = useState(0)
  const clock = useRef(new SimulationClock())
  const timelineAnchor = useRef(currentTime.getTime())
  const timelineOffsetRef = useRef(0)
  const pendingScrubOffset = useRef(0)
  const scrubRaf = useRef(0)
  timelineOffsetRef.current = timelineOffset
  const clockRefsRef = useRef(clockRefs)
  clockRefsRef.current = clockRefs

  const clockFormat = useMemo(() => new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }), [timeZone])
  const formattedTime = useMemo(() => clockFormat.format(currentTime), [clockFormat, currentTime])

  const applySimulationTime = useCallback((utcMillis: number) => {
    clock.current.seek(utcMillis)
    const simulation = simulationRef.current
    simulation.utcMillis = utcMillis
    simulation.wake?.()
  }, [simulationRef])

  const paintClock = useCallback((utcMillis: number) => {
    writeLiveClock(utcMillis, timeZone, clockRefsRef.current, clockFormat)
  }, [clockFormat, timeZone])

  const commitTime = useCallback((utcMillis: number, resetTimeline = true) => {
    applySimulationTime(utcMillis)
    if (resetTimeline) {
      timelineAnchor.current = utcMillis
      setTimelineOffset(0)
    }
    paintClock(utcMillis)
    setCurrentTime(new Date(utcMillis))
  }, [applySimulationTime, paintClock])

  const pausePlayback = useCallback(() => {
    clock.current.pause()
    commitTime(clock.current.now(), false)
    setIsPlaying(false)
  }, [commitTime])

  const flushScrub = useCallback((syncReact: boolean) => {
    if (scrubRaf.current) {
      cancelAnimationFrame(scrubRaf.current)
      scrubRaf.current = 0
    }
    const utcMillis = timelineAnchor.current + pendingScrubOffset.current
    applySimulationTime(utcMillis)
    paintClock(utcMillis)
    if (syncReact) setCurrentTime(new Date(utcMillis))
  }, [applySimulationTime, paintClock])

  const beginTimelineScrub = useCallback((offset = timelineOffsetRef.current) => {
    clock.current.pause()
    const simulation = simulationRef.current
    simulation.scrubbing = true
    pendingScrubOffset.current = offset
    setIsPlaying(false)
  }, [simulationRef])

  const scrubTimeline = useCallback((offset: number) => {
    pendingScrubOffset.current = offset
    if (scrubRaf.current) return
    scrubRaf.current = requestAnimationFrame(() => {
      scrubRaf.current = 0
      flushScrub(false)
    })
  }, [flushScrub])

  const endTimelineScrub = useCallback(() => {
    const simulation = simulationRef.current
    simulation.scrubbing = false
    flushScrub(true)
    setTimelineOffset(pendingScrubOffset.current)
  }, [flushScrub, simulationRef])

  useEffect(() => {
    if (!isPlaying) {
      clock.current.pause()
      return
    }
    clock.current.play(speed)
    let frame = 0
    let lastUiTick = 0
    const tick = () => {
      if (document.hidden) return
      const utcMillis = clock.current.now()
      simulationRef.current.utcMillis = utcMillis
      const now = performance.now()
      if (now - lastUiTick >= TIMELINE_UI_INTERVAL_MS) {
        lastUiTick = now
        paintClock(utcMillis)
        setCurrentTime(new Date(utcMillis))
      }
      frame = requestAnimationFrame(tick)
    }
    const onVisibility = () => {
      if (document.hidden) {
        clock.current.pause()
        cancelAnimationFrame(frame)
        frame = 0
        return
      }
      clock.current.play(speed)
      if (!frame) frame = requestAnimationFrame(tick)
    }
    document.addEventListener('visibilitychange', onVisibility)
    frame = requestAnimationFrame(tick)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(frame)
    }
  }, [isPlaying, paintClock, speed, simulationRef])

  useEffect(() => () => {
    if (scrubRaf.current) cancelAnimationFrame(scrubRaf.current)
  }, [])

  const adjustTime = (milliseconds: number) => {
    pausePlayback()
    commitTime(simulationRef.current.utcMillis + milliseconds)
  }

  const togglePlay = () => {
    if (isPlaying) pausePlayback()
    else setIsPlaying(true)
  }

  return {
    currentTime,
    isPlaying,
    speed,
    setSpeed,
    timelineOffset,
    formattedTime,
    commitTime,
    pausePlayback,
    togglePlay,
    adjustTime,
    setIsPlaying,
    beginTimelineScrub,
    scrubTimeline,
    endTimelineScrub,
  }
}

export type Playback = ReturnType<typeof usePlayback>
