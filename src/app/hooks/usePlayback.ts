/** 播放/暂停、倍率、时间轴拖动。时钟写 simulation.utcMillis，UI 控件低频刷新。 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { SimulationClock } from '@/engine/clock/simulationClock'
import { defaultPlaybackSpeed, defaultTimeStepId, timeSteps, TIMELINE_UI_INTERVAL_MS, type TimeStepId } from '@/config'
import { formatDateTimeLocal, shiftLocalUtc } from '@/engine/coordinates/dateTimeLocal'
import type { Playback, LiveClockRefs } from '@/shared/types/playback'
import type { SkySimulation } from '@/shared/types/sky'

/** 直接改 datetime-local 和年份 DOM，避开 React 每帧 setState。 */
function writeLiveClock(
  utcMillis: number,
  timeZone: string,
  clockRefs: LiveClockRefs,
) {
  const datetime = clockRefs.datetimeInput.current
  if (datetime) datetime.value = formatDateTimeLocal(utcMillis, timeZone)
  const year = clockRefs.yearLabel.current
  if (year) year.textContent = String(new Date(utcMillis).getFullYear())
}

export function usePlayback(
  timeZone: string,
  simulationRef: RefObject<SkySimulation>,
  clockRefs: LiveClockRefs,
): Playback {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(defaultPlaybackSpeed)
  const [timeStep, setTimeStepId] = useState<TimeStepId>(defaultTimeStepId)
  const [timelineOffset, setTimelineOffset] = useState(0)
  const clock = useRef(new SimulationClock())
  const timelineAnchor = useRef(currentTime.getTime())
  const timelineOffsetRef = useRef(0)
  const pendingScrubOffset = useRef(0)
  const scrubRaf = useRef(0)
  timelineOffsetRef.current = timelineOffset
  const clockRefsRef = useRef(clockRefs)
  clockRefsRef.current = clockRefs

  const applySimulationTime = useCallback((utcMillis: number) => {
    clock.current.seek(utcMillis)
    const simulation = simulationRef.current
    simulation.utcMillis = utcMillis
    simulation.wake?.()
  }, [simulationRef])

  const paintClock = useCallback((utcMillis: number) => {
    writeLiveClock(utcMillis, timeZone, clockRefsRef.current)
  }, [timeZone])

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

  const setTimeStep = (id: TimeStepId) => {
    setTimeStepId(id)
    const rate = timeSteps.find((step) => step.id === id)?.playRate
    if (rate != null) setSpeed(rate)
  }

  const adjustTime = (milliseconds: number) => {
    pausePlayback()
    commitTime(simulationRef.current.utcMillis + milliseconds)
  }

  const stepTime = (direction: -1 | 1) => {
    const step = timeSteps.find((item) => item.id === timeStep) ?? timeSteps[0]
    pausePlayback()
    commitTime(shiftLocalUtc(simulationRef.current.utcMillis, timeZone, {
      years: step.years * direction,
      days: step.days * direction,
      minutes: step.minutes * direction,
    }))
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
    timeStep,
    setTimeStep,
    timelineOffset,
    commitTime,
    pausePlayback,
    togglePlay,
    adjustTime,
    stepTime,
    beginTimelineScrub,
    scrubTimeline,
    endTimelineScrub,
  }
}
