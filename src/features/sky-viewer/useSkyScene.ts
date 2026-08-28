/** 创建 Three 场景、渲染循环和视角控制器；卸载时释放 GPU。 */
import { useEffect, useEffectEvent, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import type { SelectedSkyObject, SkySimulation, SkyView } from '@/shared/types/sky'
import type { AtmosphereState } from '@/engine/render/atmosphereState'
import { AppError, logAppError, toAppError } from '@/shared/errors/appError'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import type { ConstellationAnchor, ConstellationStars } from '@/engine/astronomy/constellationData'
import { attachAstroWorker } from '@/engine/astronomy/attachAstroWorker'
import { createSkyScene, disposeSkyScene } from '@/engine/render/createSkyScene'
import { startSkyRenderLoop } from '@/engine/render/startSkyRenderLoop'
import { SkyViewController } from '@/engine/interaction/SkyViewController'
import { skyObjectLabel, useLocale } from '@/i18n'

export type SkyOverlayDomRefs = {
  mountRef: RefObject<HTMLDivElement | null>
  hoverRef: RefObject<HTMLDivElement | null>
  cardinalRefs: RefObject<Record<string, HTMLDivElement | null>>
  constellationNameRefs: RefObject<Record<string, HTMLDivElement | null>>
  eclipticPoleRefs: RefObject<Record<string, HTMLDivElement | null>>
  hoverTargetRef: RefObject<{ id: string; type: 'star' | 'body' } | null>
  selectedRef: RefObject<SelectedSkyObject | null>
}

export function useSkyScene(options: {
  catalog: RuntimeCatalog | null
  simulationRef: RefObject<SkySimulation>
  bodySnapshotRef: RefObject<BodySnapshotWindow | null>
  objectCardRef?: RefObject<HTMLElement | null>
  constellationStars: ConstellationStars[]
  constellationAnchors: ConstellationAnchor[]
  overlays: SkyOverlayDomRefs
  onViewChange: (view: SkyView) => void
  onSelect: (item: SelectedSkyObject | null) => void
  onBodiesReady?: () => void
  onAtmosphereChange?: (state: AtmosphereState) => void
  setViewportError: Dispatch<SetStateAction<AppError | null>>
}) {
  const {
    catalog,
    simulationRef,
    bodySnapshotRef,
    objectCardRef,
    constellationStars,
    constellationAnchors,
    overlays,
    setViewportError,
  } = options
  const { locale, t } = useLocale()
  const localeRef = useRef(locale)
  const tRef = useRef(t)
  localeRef.current = locale
  tRef.current = t
  const selectObject = useEffectEvent(options.onSelect)
  const changeView = useEffectEvent(options.onViewChange)
  const changeAtmosphere = useEffectEvent(options.onAtmosphereChange ?? (() => {}))
  const bodiesReady = useEffectEvent(options.onBodiesReady ?? (() => {}))

  useEffect(() => {
    if (!catalog) return
    const mount = overlays.mountRef.current
    if (!mount) return
    const { stars, countStarsThroughMagnitude } = catalog
    const worker = attachAstroWorker({
      onSnapshot: (window) => {
        bodySnapshotRef.current = window
        bodiesReady()
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
      reportError(new AppError('webgl', 'error.webgl.unsupported'), 'webgl')
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
    ctx.renderer.domElement.setAttribute('aria-label', tRef.current('sky.canvasLabel'))

    const resizeObserver = new ResizeObserver(ctx.resize)
    resizeObserver.observe(mount)

    const hideHover = () => {
      overlays.hoverTargetRef.current = null
      if (overlays.hoverRef.current) overlays.hoverRef.current.style.display = 'none'
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
        const hoverNode = overlays.hoverRef.current
        if (hit && hoverNode) {
          overlays.hoverTargetRef.current = { id: hit.id, type: hit.type }
          hoverNode.textContent = skyObjectLabel(hit, catalog, localeRef.current, tRef.current)
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
      constellationAnchors,
      overlays: {
        cardinalRefs: overlays.cardinalRefs,
        constellationNameRefs: overlays.constellationNameRefs,
        eclipticPoleRefs: overlays.eclipticPoleRefs,
        hoverRef: overlays.hoverRef,
        hoverTargetRef: overlays.hoverTargetRef,
        objectCardRef,
        selectedRef: overlays.selectedRef,
      },
      bodySnapshotRef,
      requestBodySnapshot: worker.requestSnapshot,
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
  }, [catalog, objectCardRef, bodySnapshotRef, simulationRef, constellationAnchors, constellationStars, overlays, setViewportError])

  useEffect(() => {
    if (!catalog) return
    const canvas = overlays.mountRef.current?.querySelector('canvas')
    canvas?.setAttribute('aria-label', t('sky.canvasLabel'))
    const hover = overlays.hoverTargetRef.current
    if (hover && overlays.hoverRef.current) {
      overlays.hoverRef.current.textContent = skyObjectLabel(hover, catalog, locale, t)
    }
  }, [catalog, locale, overlays, t])
}
