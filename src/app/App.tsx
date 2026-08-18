import { lazy, Suspense, useRef, useState } from 'react'
import type { SelectedSkyObject, SkySimulation } from '@/shared/types/sky'
import { formatDateTimeLocal, parseDateTimeLocal } from '@/engine/coordinates/dateTimeLocal'
import { ErrorPanel, LoadingPanel } from '@/shared/ui'
import ObjectCard from '@/features/object-details/ObjectCard'
import LocationSection from '@/features/location-controls/LocationSection'
import LayerSection from '@/features/layer-controls/LayerSection'
import { MagnitudeSection, QuickViewSection } from '@/features/layer-controls/ViewSections'
import TimeDeck from '@/features/time-controls/TimeDeck'
import TopBar from './components/TopBar'
import ControlPanel from './components/ControlPanel'
import { useCatalog } from './hooks/useCatalog'
import { useObserver } from './hooks/useObserver'
import { useLayerState } from './hooks/useLayerState'
import { useSkyView } from './hooks/useSkyView'
import { usePlayback } from './hooks/usePlayback'
import styles from './App.module.css'

const SkyViewport = lazy(() => import('@/features/sky-viewer/SkyViewport'))

export default function App() {
  const { catalog, catalogError, retry } = useCatalog()
  const { cities, activeCityIndex, observer, setCity, setLatitude, setLongitude } = useObserver()
  const { layers, toggleLayer } = useLayerState()
  const { view, setView, onViewChange, resetView } = useSkyView()
  const [magnitudeLimit, setMagnitudeLimit] = useState(5.5)
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)
  const [isTimeDeckOpen, setIsTimeDeckOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedSkyObject | null>(null)
  const objectCardRef = useRef<HTMLElement>(null)
  const simulationRef = useRef<SkySimulation>({
    utcMillis: Date.now(),
    observer: { latitude: observer.latitude, longitude: observer.longitude },
    magnitudeLimit,
    layers,
    azimuth: view.azimuth,
    altitude: view.altitude,
    fov: view.fov,
  })
  simulationRef.current.observer = { latitude: observer.latitude, longitude: observer.longitude }
  simulationRef.current.magnitudeLimit = magnitudeLimit
  simulationRef.current.layers = layers
  simulationRef.current.azimuth = view.azimuth
  simulationRef.current.altitude = view.altitude
  simulationRef.current.fov = view.fov

  const playback = usePlayback(observer.timeZone, simulationRef)

  const resetNow = () => {
    playback.pausePlayback()
    playback.commitTime(Date.now())
    resetView()
    setSelected(null)
  }

  return (
    <main className={styles.shell}>
      <Suspense fallback={<div className={styles.skyFallback} aria-busy="true" />}>
        {catalog ? (
          <SkyViewport
            catalog={catalog}
            simulationRef={simulationRef}
            onViewChange={onViewChange}
            onSelect={setSelected}
            selected={selected}
            objectCardRef={objectCardRef}
          >
            {selected && (
              <ObjectCard selected={selected} onClose={() => setSelected(null)} cardRef={objectCardRef} />
            )}
          </SkyViewport>
        ) : catalogError ? (
          <ErrorPanel error={catalogError} onRetry={retry} />
        ) : (
          <LoadingPanel message="正在加载星表…" />
        )}
      </Suspense>

      <div className={styles.atmosphere} />
      <TopBar
        observerName={observer.name}
        timeZone={observer.timeZone}
        formattedTime={playback.formattedTime}
        azimuth={view.azimuth}
        altitude={view.altitude}
        settingsOpen={isSettingsOpen}
        onResetNow={resetNow}
        onToggleSettings={() => setIsSettingsOpen((value) => !value)}
      />

      <ControlPanel open={isSettingsOpen}>
        <LocationSection
          cities={cities}
          activeCityIndex={activeCityIndex}
          observer={observer}
          datetimeValue={formatDateTimeLocal(playback.currentTime.getTime(), observer.timeZone)}
          onCityChange={setCity}
          onLatitudeChange={setLatitude}
          onLongitudeChange={setLongitude}
          onDateTimeChange={(value) => {
            const utcMillis = parseDateTimeLocal(value, observer.timeZone)
            if (utcMillis === null) return
            playback.pausePlayback()
            playback.commitTime(utcMillis)
          }}
        />
        <LayerSection layers={layers} onToggle={toggleLayer} />
        <MagnitudeSection magnitudeLimit={magnitudeLimit} onChange={setMagnitudeLimit} />
        <QuickViewSection view={view} onChange={setView} />
      </ControlPanel>

      <TimeDeck
        open={isTimeDeckOpen}
        year={playback.currentTime.getFullYear()}
        isPlaying={playback.isPlaying}
        speed={playback.speed}
        formattedTime={playback.formattedTime}
        timelineOffset={playback.timelineOffset}
        onToggleOpen={() => setIsTimeDeckOpen((value) => !value)}
        onPlayPause={() => {
          if (playback.isPlaying) playback.pausePlayback()
          else playback.setIsPlaying(true)
        }}
        onAdjustTime={playback.adjustTime}
        onSpeedChange={playback.setSpeed}
        onTimelineChange={(nextOffset) => {
          playback.pausePlayback()
          playback.setTimelineOffset(nextOffset)
          playback.commitTime(playback.timelineAnchor.current + nextOffset, false)
        }}
        onTimelineAnchor={() => {
          playback.pausePlayback()
          playback.timelineAnchor.current = simulationRef.current.utcMillis
          playback.setTimelineOffset(0)
        }}
        onResetNow={resetNow}
      />
    </main>
  )
}
