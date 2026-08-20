import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import type { SelectedSkyObject, SkySimulation } from '@/shared/types/sky'
import { formatDateTimeLocal, parseDateTimeLocal } from '@/engine/coordinates/dateTimeLocal'
import type { AtmospherePhase } from '@/engine/render/bodyAppearance'
import { ErrorPanel, LoadingPanel } from '@/shared/ui'
import ObjectCard from '@/features/object-details/ObjectCard'
import LayerSection from '@/features/layer-controls/LayerSection'
import { MagnitudeSection, QuickViewSection } from '@/features/layer-controls/ViewSections'
import TimeDeck from '@/features/time-controls/TimeDeck'
import TopBar from './components/TopBar'
import ControlPanel from './components/ControlPanel'
import SiteFooter from './components/SiteFooter'
import { useCatalog } from './hooks/useCatalog'
import { useObserver } from './hooks/useObserver'
import { useLayerState } from './hooks/useLayerState'
import { useSkyView } from './hooks/useSkyView'
import { usePlayback } from './hooks/usePlayback'
import styles from './App.module.css'

const SkyViewport = lazy(() => import('@/features/sky-viewer/SkyViewport'))

export default function App() {
  const { catalog, catalogError, retry } = useCatalog()
  const location = useObserver()
  const { observer } = location
  const { layers, toggleLayer } = useLayerState()
  const { view, setView, onViewChange, resetView } = useSkyView()
  const [magnitudeLimit, setMagnitudeLimit] = useState(5.5)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isTimeDeckOpen, setIsTimeDeckOpen] = useState(true)
  const [selected, setSelected] = useState<SelectedSkyObject | null>(null)
  const [atmospherePhase, setAtmospherePhase] = useState<AtmospherePhase>('night')
  const objectCardRef = useRef<HTMLElement>(null)
  const datetimeInputRef = useRef<HTMLInputElement>(null)
  const yearLabelRef = useRef<HTMLElement>(null)
  const formattedTimeRef = useRef<HTMLElement>(null)
  const clockRefs = useMemo(() => ({
    datetimeInput: datetimeInputRef,
    yearLabel: yearLabelRef,
    formattedTime: formattedTimeRef,
  }), [])
  const simulationRef = useRef<SkySimulation>({
    utcMillis: Date.now(),
    observer: { latitude: observer.latitude, longitude: observer.longitude },
    magnitudeLimit,
    layers,
    view: { ...view },
  })
  Object.assign(simulationRef.current, {
    observer: { latitude: observer.latitude, longitude: observer.longitude },
    magnitudeLimit,
    layers,
  })
  Object.assign(simulationRef.current.view, view)

  const playback = usePlayback(observer.timeZone, simulationRef, clockRefs)

  const resetNow = () => {
    playback.pausePlayback()
    playback.commitTime(Date.now())
    resetView()
    setSelected(null)
  }

  return (
    <main
      className={styles.shell}
      data-sky-phase={atmospherePhase}
    >
      <Suspense fallback={<div className={styles.skyFallback} aria-busy="true" />}>
        {catalog ? (
          <SkyViewport
            catalog={catalog}
            simulationRef={simulationRef}
            onViewChange={onViewChange}
            onSelect={setSelected}
            selected={selected}
            objectCardRef={objectCardRef}
            onAtmosphereChange={(state) => {
              const root = document.documentElement
              root.dataset.skyPhase = state.phase
              ;(['daylight', 'twilight', 'warmth'] as const).forEach((key) => {
                root.style.setProperty(`--ui-${key}`, state[key].toFixed(3))
              })
              setAtmospherePhase((current) => current === state.phase ? current : state.phase)
            }}
          >
            {selected && (
              <ObjectCard selected={selected} onClose={() => setSelected(null)} ref={objectCardRef} />
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
        location={location}
        view={view}
        datetimeValue={formatDateTimeLocal(playback.currentTime.getTime(), observer.timeZone)}
        datetimeInputRef={datetimeInputRef}
        settingsOpen={isSettingsOpen}
        onDateTimeChange={(value) => {
          const utcMillis = parseDateTimeLocal(value, observer.timeZone)
          if (utcMillis === null) return
          playback.pausePlayback()
          playback.commitTime(utcMillis)
        }}
        onResetNow={resetNow}
        onToggleSettings={() => setIsSettingsOpen((value) => !value)}
      />

      <ControlPanel open={isSettingsOpen}>
        <LayerSection layers={layers} onToggle={toggleLayer} />
        <MagnitudeSection magnitudeLimit={magnitudeLimit} onChange={setMagnitudeLimit} />
        <QuickViewSection view={view} onChange={setView} />
      </ControlPanel>

      <TimeDeck
        open={isTimeDeckOpen}
        onToggleOpen={() => setIsTimeDeckOpen((value) => !value)}
        playback={playback}
        phase={atmospherePhase}
        clockRefs={clockRefs}
      >
        <SiteFooter />
      </TimeDeck>
    </main>
  )
}
