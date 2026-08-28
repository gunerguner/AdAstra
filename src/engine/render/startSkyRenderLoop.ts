/**
 * 每帧编排：地平矩阵、大气、恒星 drawRange、相机、DOM 标签、太阳系点、render。
 * 时间由 SimulationClock 推进；太阳系位置来自 Worker 窗口插值。
 */
import type { RefObject } from 'react'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import type { ConstellationAnchor } from '@/engine/astronomy/constellationData'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { fillEqjHorizonMatrices } from '@/engine/coordinates/skyMath'
import type { AtmosphereState } from './atmosphereState'
import { updateBodiesLayer } from './layers/bodyLayer'
import { createFrameStats, publishFrameStats } from '@/engine/performance/frameStats'
import { isFullRateFrame, nextFrameDelayMs } from '@/engine/performance/renderScheduler'
import { createSkyOverlayUpdater, type SkyOverlayRefs } from '@/engine/interaction/updateSkyOverlays'
import { degToRad } from '@/shared/math'
import type { SkySimulation } from '@/shared/types/sky'
import type { ShaderMaterial } from 'three'
import type { SkySceneContext } from './skyContext'
import { syncAtmosphereUniforms } from './syncAtmosphereUniforms'
import { syncLayerVisibility } from './syncLayerVisibility'
import { updateSkyCamera } from './updateSkyCamera'

export type SkyRenderLoop = {
  stop: () => void
  wake: () => void
}

/** 启动 rAF 循环；返回 stop / wake（交互后拉回满帧）。 */
export function startSkyRenderLoop(options: {
  ctx: SkySceneContext
  catalog: RuntimeCatalog
  simulationRef: RefObject<SkySimulation>
  constellationAnchors: ConstellationAnchor[]
  overlays: SkyOverlayRefs
  bodySnapshotRef: RefObject<BodySnapshotWindow | null>
  requestBodySnapshot: (now: number, utcMillis: number, observer: SkySimulation['observer']) => void
  onAtmosphereChange?: (state: AtmosphereState) => void
}): SkyRenderLoop {
  const {
    ctx,
    catalog,
    simulationRef,
    constellationAnchors,
    overlays,
    bodySnapshotRef,
    requestBodySnapshot,
    onAtmosphereChange,
  } = options
  const { renderer, scene, camera, uniforms, scratch, layers } = ctx
  const frameStats = createFrameStats(45)
  const skyOverlays = createSkyOverlayUpdater({
    camera,
    uniforms,
    scratch,
    starById: catalog.starById,
    constellationAnchors,
    overlays,
  })
  let running = true
  let frame = 0
  let idleTimer = 0
  let lastWakeAt = performance.now()
  let lastUtcMillis = Number.NaN
  let lastAzimuth = Number.NaN
  let lastAltitude = Number.NaN
  let lastFov = Number.NaN
  let lastMagnitude = Number.NaN
  let lastLayersKey = ''
  let lastVisibleStars = -1
  let lastWidth = -1
  let lastHeight = -1
  const atmosphereCache = {
    lastSunAltitude: Number.NaN,
    lastSunAzimuth: Number.NaN,
    lastUiPhase: '',
  }

  const cancelScheduled = () => {
    cancelAnimationFrame(frame)
    window.clearTimeout(idleTimer)
    frame = 0
    idleTimer = 0
  }

  const scheduleNext = (fullRate: boolean) => {
    if (!running || document.hidden) return
    const delay = nextFrameDelayMs(fullRate)
    if (delay === 0) {
      frame = requestAnimationFrame(render)
      return
    }
    idleTimer = window.setTimeout(() => {
      idleTimer = 0
      if (!running || document.hidden) return
      frame = requestAnimationFrame(render)
    }, delay)
  }

  const wake = () => {
    lastWakeAt = performance.now()
    if (!running || document.hidden) return
    cancelScheduled()
    frame = requestAnimationFrame(render)
  }
  simulationRef.current.wake = wake

  const onVisibility = () => {
    if (!running) return
    if (document.hidden) {
      cancelScheduled()
      return
    }
    wake()
  }

  const render = () => {
    if (!running) return
    if (document.hidden) return
    const frameStartedAt = performance.now()
    const latest = simulationRef.current
    // 键序来自 defaultLayers + spread 更新，插入序稳定。
    const nextLayersKey = Object.values(latest.layers).join(':')
    const view = latest.view
    const viewChanged = view.azimuth !== lastAzimuth || view.altitude !== lastAltitude || view.fov !== lastFov
    const layersChanged = nextLayersKey !== lastLayersKey
    const fullRate = isFullRateFrame({
      hidden: false,
      now: frameStartedAt,
      lastWakeAt,
      utcMillis: latest.utcMillis,
      lastUtcMillis,
      viewChanged,
      layersChanged,
    })
    requestBodySnapshot(frameStartedAt, latest.utcMillis, latest.observer)
    fillEqjHorizonMatrices(latest.utcMillis, latest.observer, uniforms.horizonMat, uniforms.eqjHorizonMat)
    uniforms.showBelow.value = latest.layers.showBelowHorizon ? 1 : 0
    const bodySnapshots = interpolateBodySnapshots(bodySnapshotRef.current, latest.utcMillis)
    syncAtmosphereUniforms({
      uniforms,
      scratch,
      sun: bodySnapshots.find((body) => body.id === 'sun'),
      utcMillis: latest.utcMillis,
      observer: latest.observer,
      daylightEffect: latest.layers.daylightEffect,
      layersChanged,
      cache: atmosphereCache,
      onAtmosphereChange,
    })
    uniforms.sky.uFov.value = degToRad(view.fov)
    const pixelRatio = renderer.getPixelRatio()
    layers.starMaterial.uniforms.uPixelRatio.value = pixelRatio
    ;(layers.bodyPoints.material as ShaderMaterial).uniforms.uPixelRatio.value = pixelRatio
    if (latest.magnitudeLimit !== lastMagnitude) {
      lastVisibleStars = catalog.countStarsThroughMagnitude(latest.magnitudeLimit)
      layers.starGeometry.setDrawRange(0, lastVisibleStars)
      lastMagnitude = latest.magnitudeLimit
    }
    if (layersChanged) syncLayerVisibility(layers, latest.layers)
    else {
      layers.starPoints.visible = latest.layers.stars
      layers.milkyWay.visible = latest.layers.milkyWay
    }

    updateSkyCamera(camera, uniforms, scratch, view)

    const width = renderer.domElement.clientWidth
    const height = renderer.domElement.clientHeight
    const sizeChanged = width !== lastWidth || height !== lastHeight
    lastWidth = width
    lastHeight = height
    skyOverlays.update({
      width,
      height,
      fov: view.fov,
      aspect: camera.aspect,
      viewChanged,
      sizeChanged,
      layers: latest.layers,
      bodySnapshots,
    })

    updateBodiesLayer(
      layers.bodyPoints,
      bodySnapshots,
      latest.layers,
      uniforms.horizonMat,
      scratch.horizon,
      camera,
      view.fov,
      camera.aspect,
      scratch.projected,
    )

    renderer.render(scene, camera)
    const renderDurationMs = performance.now() - frameStartedAt
    if (lastVisibleStars >= 0) renderer.domElement.dataset.visibleStars = String(lastVisibleStars)
    if (fullRate) frameStats.push(renderDurationMs)
    if (import.meta.env.DEV && fullRate && frameStats.filled === frameStats.capacity) {
      publishFrameStats(renderer.domElement, frameStats.snapshot(), renderer.info.memory, renderer.info.render.calls)
    }
    lastUtcMillis = latest.utcMillis
    lastAzimuth = view.azimuth
    lastAltitude = view.altitude
    lastFov = view.fov
    lastLayersKey = nextLayersKey
    if (running) scheduleNext(fullRate)
  }

  document.addEventListener('visibilitychange', onVisibility)
  frame = requestAnimationFrame(render)
  return {
    wake,
    stop() {
      running = false
      if (simulationRef.current.wake === wake) simulationRef.current.wake = undefined
      simulationRef.current.scrubbing = false
      document.removeEventListener('visibilitychange', onVisibility)
      cancelScheduled()
    },
  }
}
