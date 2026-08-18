import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import type { SelectedSkyObject, SkySimulation } from '@/shared/types/sky'
import { AppError, logAppError, toAppError } from '@/shared/errors/appError'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/astronomyService'
import { buildConstellationAnchors, buildConstellationStars } from '@/engine/astronomy/constellationData'
import { attachAstroWorker } from '@/engine/astronomy/attachAstroWorker'
import { detectRenderCapabilities } from '@/engine/render/renderCapabilities'
import { createSkyScene, disposeSkyScene } from '@/engine/render/createSkyScene'
import { disposeBodiesLayer } from '@/engine/render/layers/bodyLayer'
import { startSkyRenderLoop } from '@/engine/render/startSkyRenderLoop'
import { SkyViewController } from '@/engine/interaction/SkyViewController'
import { poseOfSkyObject } from '@/engine/interaction/skyPose'
import { projectSkyToNdc } from '@/engine/render/skyProjection'
import { horizontalVector } from '@/engine/coordinates/skyGeometry'
import { applyOverlayPlacement, overlayScreenPosition } from '@/engine/interaction/overlayProjection'
import { ErrorPanel } from '@/shared/ui'
import { cardinals } from '@/config/cardinals'
import styles from './skyViewer.module.css'

type Props = {
  catalog: RuntimeCatalog
  simulationRef: MutableRefObject<SkySimulation>
  onViewChange: (view: { azimuth: number; altitude: number; fov: number }) => void
  onSelect: (item: SelectedSkyObject | null) => void
  selected?: SelectedSkyObject | null
  objectCardRef?: RefObject<HTMLElement | null>
  children?: ReactNode
  onWebglReady?: (mode: 'webgl2' | 'canvas') => void
}

export default function SkyViewport({
  catalog,
  simulationRef,
  onViewChange,
  onSelect,
  selected,
  objectCardRef,
  children,
  onWebglReady,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HTMLDivElement>(null)
  const cardinalRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const constellationNameRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const bodySnapshotRef = useRef<BodySnapshotWindow | null>(null)
  const hoverTargetRef = useRef<{ id: string; name: string; type: 'star' | 'body' } | null>(null)
  const selectedRef = useRef<SelectedSkyObject | null>(selected ?? null)
  selectedRef.current = selected ?? null
  const callbacksRef = useRef({ onSelect, onViewChange, onWebglReady })
  callbacksRef.current = { onSelect, onViewChange, onWebglReady }
  const [viewportError, setViewportError] = useState<AppError | null>(null)

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

    if (detectRenderCapabilities().activeFallback !== 'main-thread-webgl2') {
      reportError(new AppError('webgl', '当前浏览器不支持 WebGL2 星空渲染。'), 'webgl')
      callbacksRef.current.onWebglReady?.('canvas')
      worker.terminate()
      return
    }

    let ctx
    try {
      ctx = createSkyScene({ mount, stars, constellationStars })
    } catch (error) {
      reportError(error, 'webgl')
      callbacksRef.current.onWebglReady?.('canvas')
      worker.terminate()
      return
    }

    callbacksRef.current.onWebglReady?.(ctx.renderer.capabilities.isWebGL2 ? 'webgl2' : 'canvas')
    const resizeObserver = new ResizeObserver(ctx.resize)
    resizeObserver.observe(mount)

    const hideHover = () => {
      hoverTargetRef.current = null
      if (hoverRef.current) hoverRef.current.style.display = 'none'
      ctx.renderer.domElement.style.cursor = ''
    }
    const bodiesAt = () => interpolateBodySnapshots(bodySnapshotRef.current, simulationRef.current.utcMillis)
    const controller = new SkyViewController(
      ctx,
      simulationRef,
      callbacksRef,
      bodiesAt,
      stars,
      countStarsThroughMagnitude,
      (hit) => {
        const hoverNode = hoverRef.current
        if (hit && hoverNode) {
          hoverTargetRef.current = { id: hit.id, name: hit.name, type: hit.type }
          hoverNode.textContent = hit.name
          ctx.renderer.domElement.style.cursor = 'pointer'
          const pose = poseOfSkyObject(hit, {
            bodies: bodiesAt(),
            starById: catalog.starById,
            horizonMat: ctx.uniforms.horizonMat,
            horizonScratch: ctx.scratch.horizon,
          })
          if (pose) {
            const ndc = projectSkyToNdc(
              horizontalVector(pose.altitude, pose.azimuth),
              ctx.camera,
              simulationRef.current.fov,
              ctx.camera.aspect,
            )
            applyOverlayPlacement(
              hoverNode,
              overlayScreenPosition(ndc, ctx.renderer.domElement.clientWidth, ctx.renderer.domElement.clientHeight, 14, -18),
            )
          }
        } else hideHover()
      },
      hideHover,
    )
    controller.bind()
    const stopLoop = startSkyRenderLoop({
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
      onSelect: (item) => callbacksRef.current.onSelect(item),
    })

    return () => {
      stopLoop()
      resizeObserver.disconnect()
      controller.unbind()
      worker.terminate()
      disposeBodiesLayer(ctx.layers.bodyPoints)
      disposeSkyScene(ctx)
    }
  }, [catalog, constellationAnchors, constellationStars, objectCardRef, simulationRef])

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
