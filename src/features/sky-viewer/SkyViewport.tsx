/** WebGL 天空视口：星表加载中/失败时盖面板，成功后挂渲染循环。 */
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import type { SelectedSkyObject, SkySimulation, SkyView } from '@/shared/types/sky'
import type { ObjectCardStats } from '@/shared/types/slot'
import type { AtmosphereState } from '@/engine/render/atmosphereState'
import type { AppError } from '@/shared/errors/appError'
import type { BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { buildConstellationAnchors, buildConstellationStars } from '@/engine/astronomy/constellationData'
import { ErrorPanel } from '@/shared/ui'
import SkyOverlayLabels from './SkyOverlayLabels'
import { useSkyScene } from './useSkyScene'
import styles from './skyViewer.module.css'

type Props = {
  catalog: RuntimeCatalog | null
  catalogError?: AppError | null
  onCatalogRetry?: () => void
  simulationRef: RefObject<SkySimulation>
  onViewChange: (view: SkyView) => void
  onViewLive: (view: SkyView) => void
  onSelect: (item: SelectedSkyObject | null) => void
  selected?: SelectedSkyObject | null
  objectCardRef?: RefObject<HTMLElement | null>
  objectCardStatsRef?: RefObject<ObjectCardStats>
  bodySnapshotRef: RefObject<BodySnapshotWindow | null>
  onBodiesReady?: () => void
  onAtmosphereChange?: (state: AtmosphereState) => void
  children?: ReactNode
}

export default function SkyViewport({
  catalog,
  catalogError,
  onCatalogRetry,
  simulationRef,
  onViewChange,
  onViewLive,
  onSelect,
  selected,
  objectCardRef,
  objectCardStatsRef,
  bodySnapshotRef,
  onBodiesReady,
  onAtmosphereChange,
  children,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HTMLDivElement>(null)
  const cardinalRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const constellationNameRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const eclipticPoleRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const hoverTargetRef = useRef<{ id: string; type: 'star' | 'body' } | null>(null)
  const selectedRef = useRef<SelectedSkyObject | null>(selected ?? null)
  selectedRef.current = selected ?? null
  const overlays = useMemo(() => ({
    mountRef,
    hoverRef,
    cardinalRefs,
    constellationNameRefs,
    eclipticPoleRefs,
    hoverTargetRef,
    selectedRef,
  }), [])
  const [viewportError, setViewportError] = useState<AppError | null>(null)
  const [sceneEpoch, setSceneEpoch] = useState(0)

  const constellationStars = useMemo(
    () => (catalog ? buildConstellationStars(catalog) : []),
    [catalog],
  )
  const constellationAnchors = useMemo(
    () => buildConstellationAnchors(constellationStars),
    [constellationStars],
  )

  useSkyScene({
    catalog,
    simulationRef,
    bodySnapshotRef,
    objectCardRef,
    objectCardStatsRef,
    constellationStars,
    constellationAnchors,
    overlays,
    onViewChange,
    onViewLive,
    onSelect,
    onBodiesReady,
    onAtmosphereChange,
    setViewportError,
    sceneEpoch,
    rebuildScene: () => setSceneEpoch((epoch) => epoch + 1),
  })

  const blockingError = catalogError ?? (viewportError?.code === 'webgl' ? viewportError : null)

  return (
    <div className={`${styles.viewport} ${blockingError ? styles.fallback : ''}`} ref={mountRef}>
      {blockingError && (
        <ErrorPanel
          error={blockingError}
          onRetry={blockingError.code === 'catalog' ? onCatalogRetry : undefined}
        />
      )}
      {viewportError?.code === 'worker' && (
        <ErrorPanel
          error={viewportError}
          onRetry={() => {
            setViewportError(null)
            setSceneEpoch((epoch) => epoch + 1)
          }}
        />
      )}
      <div className={styles.hover} ref={hoverRef} />
      <div className={styles.grain} />
      <div className={styles.vignette} />
      <SkyOverlayLabels
        constellationStars={constellationStars}
        cardinalRefs={cardinalRefs}
        eclipticPoleRefs={eclipticPoleRefs}
        constellationNameRefs={constellationNameRefs}
      />
      {children}
    </div>
  )
}
