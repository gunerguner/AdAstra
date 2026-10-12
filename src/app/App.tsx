import { useMemo, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import type { SelectedSkyObject } from '@/shared/types/sky'
import { formatDateTimeLocal, parseDateTimeLocal } from '@/engine/coordinates/dateTimeLocal'
import { formatViewBearing } from '@/engine/interaction/viewConstraints'
import type { BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
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
import { useCatalog } from './hooks/useCatalog'
import { useObserver } from './hooks/useObserver'
import { useLayerState } from './hooks/useLayerState'
import { useSkyView } from './hooks/useSkyView'
import { usePlayback } from './hooks/usePlayback'
import { useLocateTarget } from './hooks/useLocateTarget'
import { useSimulationRef } from './hooks/useSimulationRef'
import { useAtmosphereTheme } from './hooks/useAtmosphereTheme'
import { useLocationNotice } from './hooks/useLocationNotice'
import { useBodyMagnitudes } from './hooks/useBodyMagnitudes'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useT } from '@/i18n'
import styles from './App.module.css'

/** 根组件：星表、观测点、图层、播放、天空视口和各控制面板。 */
export default function App() {
  const t = useT()
  const { catalog, catalogError, retry } = useCatalog()
  const location = useObserver()
  const { observer, locateStatus } = location
  const { layers, toggleLayer } = useLayerState()
  const { view, setView, resetView } = useSkyView()
  const [magnitudeLimit, setMagnitudeLimit] = useState(5.5)
  const [isTimeDeckOpen, setIsTimeDeckOpen] = useState(true)
  const [selected, setSelected] = useState<SelectedSkyObject | null>(null)
  // 窄屏两侧面板会互相叠住,钉住时一次只开一个。
  const isCompactViewport = useMediaQuery('(max-width: 940px)')
  const [navPinned, setNavPinned] = useState(false)
  const [controlsPinned, setControlsPinned] = useState(false)
  const pinNav = (pinned: boolean) => {
    setNavPinned(pinned)
    if (pinned && isCompactViewport) setControlsPinned(false)
  }
  const pinControls = (pinned: boolean) => {
    setControlsPinned(pinned)
    if (pinned && isCompactViewport) setNavPinned(false)
  }

  const simulationRef = useSimulationRef({
    latitude: observer.latitude,
    longitude: observer.longitude,
    magnitudeLimit,
    layers,
    view,
  })
  const bodySnapshotRef = useRef<BodySnapshotWindow | null>(null)
  const objectCardRef = useRef<HTMLElement>(null)
  const viewLabelRef = useRef<HTMLElement>(null)
  const datetimeInputRef = useRef<HTMLInputElement>(null)
  const yearLabelRef = useRef<HTMLElement>(null)
  const clockRefs = useMemo(() => ({
    datetimeInput: datetimeInputRef,
    yearLabel: yearLabelRef,
  }), [])

  const playback = usePlayback(observer.timeZone, simulationRef, clockRefs)
  const { notice, setNotice, dismissNotice } = useLocationNotice(observer, locateStatus)
  const { atmospherePhase, onAtmosphereChange } = useAtmosphereTheme({
    simulationRef,
    latitude: observer.latitude,
    longitude: observer.longitude,
    daylightEffect: layers.daylightEffect,
  })
  const { bodyMagnitudes, markBodiesReady } = useBodyMagnitudes({
    bodySnapshotRef,
    simulationRef,
    currentTimeMs: playback.currentTime.getTime(),
    latitude: observer.latitude,
    longitude: observer.longitude,
  })

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
        onBodiesReady={markBodiesReady}
        onViewChange={setView}
        onViewLive={(next) => {
          const node = viewLabelRef.current
          if (node) node.textContent = formatViewBearing(next)
        }}
        onSelect={(item) => {
          setSelected(item)
          if (item) setNotice(null)
        }}
        selected={selected}
        objectCardRef={objectCardRef}
        onAtmosphereChange={onAtmosphereChange}
      >
        {selected && catalog && (
          <ObjectCard selected={selected} catalog={catalog} onClose={() => setSelected(null)} ref={objectCardRef} />
        )}
      </SkyViewport>

      <div className={styles.atmosphere} />
      <TopBar
        location={location}
        view={view}
        viewLabelRef={viewLabelRef}
        datetimeValue={formatDateTimeLocal(playback.currentTime.getTime(), observer.timeZone)}
        datetimeInputRef={datetimeInputRef}
        onNotice={setNotice}
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
        pinned={navPinned}
        onPinnedChange={pinNav}
      >
        {catalog ? (
          <QuickNav catalog={catalog} bodyMagnitudes={bodyMagnitudes} onLocate={locateTarget} />
        ) : null}
      </HoverDock>

      <ControlPanel pinned={controlsPinned} onPinnedChange={pinControls}>
        <LayerSection layers={layers} onToggle={toggleLayer} />
        <MagnitudeSection magnitudeLimit={magnitudeLimit} onChange={setMagnitudeLimit} />
        <QuickViewSection view={view} onChange={setView} />
      </ControlPanel>

      <Notice message={notice} sticky={locateStatus === 'pending'} onDismiss={dismissNotice} />

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
