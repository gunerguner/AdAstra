import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useMediaQuery } from './hooks/useMediaQuery'
import { useT } from '@/i18n'
import { exclusiveCompactPin } from './compactPins'
import type { ObjectCardStats } from '@/shared/types/slot'
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
  useEffect(() => {
    const next = exclusiveCompactPin(isCompactViewport, navPinned, controlsPinned)
    if (next.navPinned !== navPinned) setNavPinned(next.navPinned)
    if (next.controlsPinned !== controlsPinned) setControlsPinned(next.controlsPinned)
  }, [isCompactViewport, navPinned, controlsPinned])

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
  const { locationNotice, dismissLocationNotice } = useLocationNotice(observer, locateStatus)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const notice = actionNotice ?? locationNotice
  const dismissNotice = () => {
    if (actionNotice) setActionNotice(null)
    else dismissLocationNotice()
  }
  const { atmospherePhase, onAtmosphereChange } = useAtmosphereTheme({
    simulationRef,
    latitude: observer.latitude,
    longitude: observer.longitude,
    daylightEffect: layers.daylightEffect,
  })
  const magnitudesRefreshRef = useRef<() => void>(() => {})
  const objectCardStatsRef = useRef<ObjectCardStats>({ altitude: null, azimuth: null, magnitude: null })

  const locateTarget = useLocateTarget({
    catalog,
    simulationRef,
    bodySnapshotRef,
    setView,
    setSelected,
    setNotice: setActionNotice,
  })

  const resetNow = () => {
    playback.pausePlayback()
    playback.commitTime(Date.now())
    resetView()
    setSelected(null)
    setActionNotice(null)
  }

  return (
    <main className="app-shell">
      <SkyViewport
        catalog={catalog}
        catalogError={catalogError}
        onCatalogRetry={retry}
        simulationRef={simulationRef}
        bodySnapshotRef={bodySnapshotRef}
        onBodiesReady={() => magnitudesRefreshRef.current()}
        onViewChange={setView}
        onViewLive={(next) => {
          const node = viewLabelRef.current
          if (node) node.textContent = formatViewBearing(next)
        }}
        onSelect={(item) => {
          setSelected(item)
          if (item) setActionNotice(null)
        }}
        selected={selected}
        objectCardRef={objectCardRef}
        objectCardStatsRef={objectCardStatsRef}
        onAtmosphereChange={onAtmosphereChange}
      >
        {selected && catalog && (
          <ObjectCard
            selected={selected}
            catalog={catalog}
            onClose={() => setSelected(null)}
            ref={objectCardRef}
            statsRef={objectCardStatsRef}
            simulationRef={simulationRef}
            bodySnapshotRef={bodySnapshotRef}
          />
        )}
      </SkyViewport>

      <div className={styles.atmosphere} />
      <TopBar
        location={location}
        view={view}
        viewLabelRef={viewLabelRef}
        datetimeDefault={formatDateTimeLocal(playback.currentTime.getTime(), observer.timeZone)}
        datetimeInputRef={datetimeInputRef}
        onNotice={setActionNotice}
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
          <QuickNav
            catalog={catalog}
            simulationRef={simulationRef}
            bodySnapshotRef={bodySnapshotRef}
            isPlaying={playback.isPlaying}
            refreshRef={magnitudesRefreshRef}
            onLocate={locateTarget}
          />
        ) : null}
      </HoverDock>

      <ControlPanel pinned={controlsPinned} onPinnedChange={pinControls}>
        <LayerSection layers={layers} onToggle={toggleLayer} />
        <MagnitudeSection magnitudeLimit={magnitudeLimit} onChange={setMagnitudeLimit} />
        <QuickViewSection view={view} onChange={setView} />
      </ControlPanel>

      <Notice
        message={notice}
        sticky={actionNotice == null && locateStatus === 'pending'}
        onDismiss={dismissNotice}
      />

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
