import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import type { SelectedSkyObject, SkySimulation } from '@/shared/types/sky'
import { formatDateTimeLocal, parseDateTimeLocal } from '@/engine/coordinates/dateTimeLocal'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { locateSkyTarget } from '@/engine/interaction/locateSkyTarget'
import type { AtmospherePhase } from '@/engine/render/atmosphereState'
import { ErrorPanel, LoadingPanel, Notice } from '@/shared/ui'
import ObjectCard from '@/features/object-details/ObjectCard'
import QuickNav from '@/features/quick-nav/QuickNav'
import LayerSection from '@/features/layer-controls/LayerSection'
import { MagnitudeSection, QuickViewSection } from '@/features/layer-controls/ViewSections'
import TimeDeck from '@/features/time-controls/TimeDeck'
import TopBar from './components/TopBar'
import ControlPanel from './components/ControlPanel'
import HoverDock from './components/HoverDock'
import SiteFooter from './components/SiteFooter'
import { useCatalog } from './hooks/useCatalog'
import { useObserver } from './hooks/useObserver'
import { useLayerState } from './hooks/useLayerState'
import { useSkyView } from './hooks/useSkyView'
import { usePlayback } from './hooks/usePlayback'
import styles from './App.module.css'

const SkyViewport = lazy(() => import('@/features/sky-viewer/SkyViewport'))

function formatSignedAltitude(degrees: number) {
  const sign = degrees < 0 ? '−' : ''
  return `${sign}${Math.abs(degrees).toFixed(1)}°`
}

export default function App() {
  const { catalog, catalogError, retry } = useCatalog()
  const location = useObserver()
  const { observer } = location
  const { layers, toggleLayer } = useLayerState()
  const { view, setView, onViewChange, resetView } = useSkyView()
  const [magnitudeLimit, setMagnitudeLimit] = useState(5.5)
  const [isTimeDeckOpen, setIsTimeDeckOpen] = useState(true)
  const [selected, setSelected] = useState<SelectedSkyObject | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [atmospherePhase, setAtmospherePhase] = useState<AtmospherePhase>('night')
  const objectCardRef = useRef<HTMLElement>(null)
  const bodySnapshotRef = useRef<BodySnapshotWindow | null>(null)
  const datetimeInputRef = useRef<HTMLInputElement>(null)
  const yearLabelRef = useRef<HTMLElement>(null)
  const clockRefs = useMemo(() => ({
    datetimeInput: datetimeInputRef,
    yearLabel: yearLabelRef,
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
  const dismissNotice = useCallback(() => setNotice(null), [])
  const [bodyEpoch, setBodyEpoch] = useState(0)
  const bodyMagnitudes = useMemo(() => {
    const magnitudes: Record<string, number> = {}
    for (const body of interpolateBodySnapshots(bodySnapshotRef.current, simulationRef.current.utcMillis)) {
      magnitudes[body.id] = body.magnitude
    }
    return magnitudes
  }, [bodyEpoch, playback.currentTime, observer.latitude, observer.longitude])

  const resetNow = () => {
    playback.pausePlayback()
    playback.commitTime(Date.now())
    resetView()
    setSelected(null)
    setNotice(null)
  }

  const locateTarget = (id: string, type: 'star' | 'body') => {
    if (!catalog) return
    const latest = simulationRef.current
    const result = locateSkyTarget({
      id,
      type,
      bodies: interpolateBodySnapshots(bodySnapshotRef.current, latest.utcMillis),
      starById: catalog.starById,
      utcMillis: latest.utcMillis,
      observer: latest.observer,
      view: latest.view,
    })
    if (!result) {
      setNotice(type === 'body' ? '太阳系位置还在计算，请稍后再试' : null)
      return
    }
    if (!result.belowHorizon) {
      setView({ azimuth: result.azimuth, altitude: result.altitude, fov: latest.view.fov })
    }
    setSelected(result.selected)
    latest.wake?.()
    setNotice(result.belowHorizon
      ? `${result.selected.name}目前在地平线以下（${formatSignedAltitude(result.targetAltitude)}）`
      : null)
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
            bodySnapshotRef={bodySnapshotRef}
            onBodiesReady={() => setBodyEpoch((value) => value + 1)}
            onViewChange={onViewChange}
            onSelect={(item) => {
              setSelected(item)
              if (item) setNotice(null)
            }}
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
        onDateTimeChange={(value) => {
          const utcMillis = parseDateTimeLocal(value, observer.timeZone)
          if (utcMillis === null) return
          playback.pausePlayback()
          playback.commitTime(utcMillis)
        }}
      />

      {catalog && (
        <HoverDock
          side="left"
          panelId="sky-quick-nav"
          handleLabel="快速定位"
          handleLabelPinned="收起快速定位"
          handleIcon={<LocateFixed size={15} strokeWidth={1.65} />}
        >
          <QuickNav catalog={catalog} bodyMagnitudes={bodyMagnitudes} onLocate={locateTarget} />
        </HoverDock>
      )}

      <ControlPanel>
        <LayerSection layers={layers} onToggle={toggleLayer} />
        <MagnitudeSection magnitudeLimit={magnitudeLimit} onChange={setMagnitudeLimit} />
        <QuickViewSection view={view} onChange={setView} />
      </ControlPanel>

      <Notice message={notice} onDismiss={dismissNotice} />

      <TimeDeck
        open={isTimeDeckOpen}
        onToggleOpen={() => setIsTimeDeckOpen((value) => !value)}
        playback={playback}
        phase={atmospherePhase}
        clockRefs={clockRefs}
        onResetNow={resetNow}
      >
        <SiteFooter />
      </TimeDeck>
    </main>
  )
}
