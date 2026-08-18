import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { SimulationClock } from '@/engine/clock/simulationClock'
import { defaultPlaybackSpeed } from '@/config/playbackSpeeds'
import type { SkySimulation } from '@/shared/types/sky'

export function usePlayback(timeZone: string, simulationRef: RefObject<SkySimulation>) {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(defaultPlaybackSpeed)
  const [timelineOffset, setTimelineOffset] = useState(0)
  const clock = useRef(new SimulationClock())
  const timelineAnchor = useRef(currentTime.getTime())

  const formattedTime = useMemo(() => new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(currentTime), [currentTime, timeZone])

  const commitTime = useCallback((utcMillis: number, resetTimeline = true) => {
    clock.current.seek(utcMillis)
    simulationRef.current.utcMillis = utcMillis
    if (resetTimeline) {
      timelineAnchor.current = utcMillis
      setTimelineOffset(0)
    }
    setCurrentTime(new Date(utcMillis))
  }, [simulationRef])

  const pausePlayback = useCallback(() => {
    clock.current.pause()
    commitTime(clock.current.now(), false)
    setIsPlaying(false)
  }, [commitTime])

  useEffect(() => {
    if (!isPlaying) {
      clock.current.pause()
      return
    }
    clock.current.play(speed)
    let frame = 0
    let lastUi = 0
    const tick = () => {
      const utcMillis = clock.current.now()
      simulationRef.current.utcMillis = utcMillis
      const now = performance.now()
      if (now - lastUi >= 200) {
        lastUi = now
        setCurrentTime(new Date(utcMillis))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, speed, simulationRef])

  const adjustTime = (milliseconds: number) => {
    pausePlayback()
    commitTime(simulationRef.current.utcMillis + milliseconds)
  }

  return {
    currentTime,
    isPlaying,
    speed,
    setSpeed,
    timelineOffset,
    setTimelineOffset,
    timelineAnchor,
    formattedTime,
    commitTime,
    pausePlayback,
    adjustTime,
    setIsPlaying,
  }
}
