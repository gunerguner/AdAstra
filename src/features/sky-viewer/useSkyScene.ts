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
import { beginMilkyWayTextureLoad } from '@/engine/render/milkyWayTexture'
import type { Texture } from 'three'
import { bindWebglContextRecovery } from '@/engine/render/webglContextRecovery'
import { startSkyRenderLoop } from '@/engine/render/startSkyRenderLoop'
import { SkyViewController } from '@/engine/interaction/SkyViewController'
import { skyObjectLabel, useLocale } from '@/i18n'
import type { ObjectCardStats } from '@/shared/types/slot'
import { releaseSkySession } from './releaseSkySession'

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
  objectCardStatsRef?: RefObject<ObjectCardStats>
  constellationStars: ConstellationStars[]
  constellationAnchors: ConstellationAnchor[]
  overlays: SkyOverlayDomRefs
  onViewChange: (view: SkyView) => void
  onViewLive: (view: SkyView) => void
  onSelect: (item: SelectedSkyObject | null) => void
  onBodiesReady?: () => void
  onAtmosphereChange?: (state: AtmosphereState) => void
  setViewportError: Dispatch<SetStateAction<AppError | null>>
  /** 递增时拆掉当前场景和 Worker 再挂一次，用于 Worker 失败后的重试。 */
  sceneEpoch: number
  /** WebGL 上下文恢复后重建场景。 */
  rebuildScene: () => void
}) {
  const {
    catalog,
    simulationRef,
    bodySnapshotRef,
    objectCardRef,
    objectCardStatsRef,
    constellationStars,
    constellationAnchors,
    overlays,
    setViewportError,
    sceneEpoch,
  } = options
  const { locale, t } = useLocale()
  const localeRef = useRef(locale)
  const tRef = useRef(t)
  localeRef.current = locale
  tRef.current = t
  const selectObject = useEffectEvent(options.onSelect)
  const changeView = useEffectEvent(options.onViewChange)
  const previewView = useEffectEvent(options.onViewLive)
  const changeAtmosphere = useEffectEvent(options.onAtmosphereChange ?? (() => {}))
  const bodiesReady = useEffectEvent(options.onBodiesReady ?? (() => {}))
  const rebuildScene = useEffectEvent(options.rebuildScene)

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

    // 真实银河纹理是可选项：烘焙产物缺失时银河保持程序噪声着色。
    const milkyWayTexture = beginMilkyWayTextureLoad()
    let milkyWayMap: Texture | null = null
    milkyWayTexture.promise.then((texture) => {
      if (!texture) return
      milkyWayMap = texture
      ctx.materials.milkyWay.uniforms.uMap.value = texture
      ctx.materials.milkyWay.uniforms.uHasMap.value = 1
      ctx.materials.milkyWay.needsUpdate = true
    }).catch(() => {})

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
      { onSelect: selectObject, onViewChange: changeView, onViewLive: previewView },
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
        objectCardStatsRef,
        selectedRef: overlays.selectedRef,
      },
      bodySnapshotRef,
      requestBodySnapshot: worker.requestSnapshot,
      onAtmosphereChange: changeAtmosphere,
    })
    scheduler.wake = loop.wake
    const unbindRecovery = bindWebglContextRecovery(ctx.renderer.domElement, {
      onLost: () => loop.stop(),
      onRestored: () => rebuildScene(),
    })

    return () => {
      milkyWayTexture.cancel()
      unbindRecovery()
      releaseSkySession({
        stopLoop: () => loop.stop(),
        disconnectResize: () => resizeObserver.disconnect(),
        unbindController: () => controller.unbind(),
        terminateWorker: () => worker.terminate(),
        disposeScene: () => disposeSkyScene(ctx),
      })
      milkyWayMap?.dispose()
    }
  }, [catalog, objectCardRef, objectCardStatsRef, bodySnapshotRef, simulationRef, constellationAnchors, constellationStars, overlays, setViewportError, sceneEpoch])

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
