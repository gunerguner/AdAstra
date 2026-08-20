import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import type { SelectedSkyObject, SkySimulation, SkyView } from '@/shared/types/sky'
import type { AtmosphereState } from '@/engine/render/bodyAppearance'
import { AppError, logAppError, toAppError } from '@/shared/errors/appError'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { buildConstellationAnchors, buildConstellationStars } from '@/engine/astronomy/constellationData'
import { attachAstroWorker } from '@/engine/astronomy/attachAstroWorker'
import { createSkyScene, disposeSkyScene } from '@/engine/render/createSkyScene'
import { startSkyRenderLoop } from '@/engine/render/startSkyRenderLoop'
import { SkyViewController } from '@/engine/interaction/SkyViewController'
import { ErrorPanel } from '@/shared/ui'
import { cardinals } from '@/config/cardinals'
import styles from './skyViewer.module.css'

type Props = {
  catalog: RuntimeCatalog
  simulationRef: RefObject<SkySimulation>
  onViewChange: (view: SkyView) => void
  onSelect: (item: SelectedSkyObject | null) => void
  selected?: SelectedSkyObject | null
  objectCardRef?: RefObject<HTMLElement | null>
  onAtmosphereChange?: (state: AtmosphereState) => void
  children?: ReactNode
}

export default function SkyViewport({
  catalog,
  simulationRef,
  onViewChange,
  onSelect,
  selected,
  objectCardRef,
  onAtmosphereChange,
  children,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HTMLDivElement>(null)
  const cardinalRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const constellationNameRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const bodySnapshotRef = useRef<BodySnapshotWindow | null>(null)
  const hoverTargetRef = useRef<{ id: string; name: string; type: 'star' | 'body' } | null>(null)
  const selectedRef = useRef<SelectedSkyObject | null>(selected ?? null)
  selectedRef.current = selected ?? null
  const [viewportError, setViewportError] = useState<AppError | null>(null)
  const selectObject = useEffectEvent(onSelect)
  const changeView = useEffectEvent(onViewChange)
  const changeAtmosphere = useEffectEvent(onAtmosphereChange ?? (() => {}))

  const constellationStars = useMemo(() => buildConstellationStars(catalog), [catalog])
  const constellationAnchors = useMemo(() => buildConstellationAnchors(constellationStars), [constellationStars])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const { stars, countStarsThroughMagnitude } = catalog
    const worker = attachAstroWorker({
      onSnapshot: (window) => {
        bodySnapshotRef.current = window
        setViewportError((current) => current?.code === 'worker' ? null : current)
      },
      onError: (error) => {
        logAppError(error, 'SkyViewport')
        setViewportError(error)
      },
    })
    const reportError = (error: unknown, code: 'webgl' | 'worker') => {
      const appError = toAppError(error, code)
      logAppError(appError, 'SkyViewport')
      setViewportError(appError)
    }

    if (!document.createElement('canvas').getContext('webgl2')) {
      reportError(new AppError('webgl', '当前浏览器不支持 WebGL2 星空渲染。'), 'webgl')
      worker.terminate()
      return
    }

    let ctx
    try {
      ctx = createSkyScene({ mount, stars, constellationStars })
    } catch (error) {
      reportError(error, 'webgl')
      worker.terminate()
      return
    }

    const resizeObserver = new ResizeObserver(ctx.resize)
    resizeObserver.observe(mount)

    const hideHover = () => {
      hoverTargetRef.current = null
      if (hoverRef.current) hoverRef.current.style.display = 'none'
      ctx.renderer.domElement.style.cursor = ''
    }
    const bodiesAt = () => interpolateBodySnapshots(bodySnapshotRef.current, simulationRef.current.utcMillis)
    const scheduler = { wake() {} }
    const controller = new SkyViewController(
      ctx,
      simulationRef,
      { onSelect: selectObject, onViewChange: changeView },
      bodiesAt,
      stars,
      countStarsThroughMagnitude,
      (hit) => {
        const hoverNode = hoverRef.current
        if (hit && hoverNode) {
          hoverTargetRef.current = { id: hit.id, name: hit.name, type: hit.type }
          hoverNode.textContent = hit.name
          ctx.renderer.domElement.style.cursor = 'pointer'
        } else hideHover()
      },
      hideHover,
      () => scheduler.wake(),
    )
    controller.bind()
    const loop = startSkyRenderLoop({
      ctx,
      catalog,
      simulationRef,
      selectedRef,
      objectCardRef,
      constellationAnchors,
      cardinalRefs,
      constellationNameRefs,
      hoverRef,
      hoverTargetRef,
      bodySnapshotRef,
      requestBodySnapshot: worker.requestSnapshot,
      onSelect: selectObject,
      onAtmosphereChange: changeAtmosphere,
    })
    scheduler.wake = loop.wake

    return () => {
      loop.stop()
      resizeObserver.disconnect()
      controller.unbind()
      worker.terminate()
      disposeSkyScene(ctx)
    }
  }, [catalog, objectCardRef, simulationRef, constellationAnchors, constellationStars])

  return (
    <div className={`${styles.viewport} ${viewportError?.code === 'webgl' ? styles.fallback : ''}`} ref={mountRef}>
      {viewportError && (
        <ErrorPanel
          error={viewportError}
          onRetry={viewportError.code === 'worker' ? () => setViewportError(null) : undefined}
        />
      )}
      <div className={styles.hover} ref={hoverRef} />
      <div className={styles.grain} />
      <div className={styles.vignette} />
      {cardinals.map((cardinal) => (
        <div
          key={cardinal.id}
          className={`${styles.cardinal} ${cardinal.id === 'north' ? styles.cardinalNorth : ''}`}
          ref={(node) => {
            cardinalRefs.current[cardinal.id] = node
          }}
        >
          {cardinal.label}
        </div>
      ))}
      {constellationStars.map((line) => (
        <div
          key={line.name}
          className={styles.constellationName}
          ref={(node) => {
            constellationNameRefs.current[line.name] = node
          }}
        >
          {line.name}
        </div>
      ))}
      {children}
    </div>
  )
}
