import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import type { SelectedSkyObject, SkySimulation } from '@/shared/types/sky'
import { formatDateTimeLocal, parseDateTimeLocal } from '@/engine/coordinates/dateTimeLocal'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { estimateSunHorizontal } from '@/engine/coordinates/skyMath'
import { atmosphereState, type AtmospherePhase } from '@/engine/render/atmosphereState'
import { Notice } from '@/shared/ui'
import ObjectCard from '@/features/object-details/ObjectCard'
import QuickNav from '@/features/quick-nav/QuickNav'
import LayerSection from '@/features/layer-controls/LayerSection'
import { MagnitudeSection, QuickViewSection } from '@/features/layer-controls/ViewSections'
import TimeDeck from '@/features/time-controls/TimeDeck'
import SkyViewport from '@/features/sky-viewer/SkyViewport'
import TopBar from './components/TopBar'
import ControlPanel from './components/ControlPanel'
import HoverDock from './components/HoverDock'
import SiteFooter from './components/SiteFooter'
import { applyUiAtmosphere } from './applyUiAtmosphere'
import { useCatalog } from './hooks/useCatalog'
import { useObserver } from './hooks/useObserver'
import { useLayerState } from './hooks/useLayerState'
import { useSkyView } from './hooks/useSkyView'
import { usePlayback } from './hooks/usePlayback'
import { useLocateTarget } from './hooks/useLocateTarget'
import { useT } from '@/i18n'
import styles from './App.module.css'

export default function App() {
  const t = useT()
  const { catalog, catalogError, retry } = useCatalog()
  const location = useObserver()
  const { observer } = location
  const { layers, toggleLayer } = useLayerState()
  const { view, setView, onViewChange, resetView } = useSkyView()
  const [magnitudeLimit, setMagnitudeLimit] = useState(5.5)
  const [isTimeDeckOpen, setIsTimeDeckOpen] = useState(true)
  const [selected, setSelected] = useState<SelectedSkyObject | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [atmospherePhase, setAtmospherePhase] = useState<AtmospherePhase>(() => {
    const sun = estimateSunHorizontal(Date.now(), observer)
    return atmosphereState(sun.altitude, sun.azimuth, layers.daylightEffect).phase
  })
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

  useLayoutEffect(() => {
    const sun = estimateSunHorizontal(simulationRef.current.utcMillis, {
      latitude: observer.latitude,
      longitude: observer.longitude,
    })
    const state = atmosphereState(sun.altitude, sun.azimuth, layers.daylightEffect)
    applyUiAtmosphere(state)
    setAtmospherePhase((current) => current === state.phase ? current : state.phase)
  }, [observer.latitude, observer.longitude, layers.daylightEffect])

  const playback = usePlayback(observer.timeZone, simulationRef, clockRefs)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const [bodyEpoch, setBodyEpoch] = useState(0)
  const bodyMagnitudes = useMemo(() => {
    void bodyEpoch
    void playback.currentTime
    void observer.latitude
    void observer.longitude
    const magnitudes: Record<string, number> = {}
    for (const body of interpolateBodySnapshots(bodySnapshotRef.current, simulationRef.current.utcMillis)) {
      magnitudes[body.id] = body.magnitude
    }
    return magnitudes
  }, [bodyEpoch, playback.currentTime, observer.latitude, observer.longitude])

  const locateTarget = useLocateTarget({
    catalog,
    simulationRef,
    bodySnapshotRef,
    setView,
    setSelected,
    setNotice,
  })

  const resetNow = () => {
    playback.pausePlayback()
    playback.commitTime(Date.now())
    resetView()
    setSelected(null)
    setNotice(null)
  }

  return (
    <main className="app-shell">
      <SkyViewport
        catalog={catalog}
        catalogError={catalogError}
        onCatalogRetry={retry}
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
          applyUiAtmosphere(state)
          setAtmospherePhase((current) => current === state.phase ? current : state.phase)
        }}
      >
        {selected && catalog && (
          <ObjectCard selected={selected} catalog={catalog} onClose={() => setSelected(null)} ref={objectCardRef} />
        )}
      </SkyViewport>

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

      <HoverDock
        side="left"
        panelId="sky-quick-nav"
        handleLabel={t('nav.title')}
        handleLabelPinned={t('nav.collapse')}
        handleIcon={<LocateFixed size={15} strokeWidth={1.65} />}
      >
        {catalog ? (
          <QuickNav catalog={catalog} bodyMagnitudes={bodyMagnitudes} onLocate={locateTarget} />
        ) : null}
      </HoverDock>

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
