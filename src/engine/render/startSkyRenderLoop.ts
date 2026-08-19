import type { RefObject } from 'react'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import type { ConstellationAnchor } from '@/engine/astronomy/constellationData'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { applyHorizonMatrixInto, equatorialUnitInto, fillHorizonMatrix } from '@/engine/coordinates/skyMath'
import { horizontalVectorInto, skyCameraUpInto } from '@/engine/coordinates/skyGeometry'
import { projectSkyToNdc } from './skyProjection'
import { atmosphereState, type AtmosphereState } from './bodyAppearance'
import { updateBodiesLayer } from './layers/bodyLayer'
import { decidePixelRatio } from '@/engine/performance/pixelRatio'
import { createFrameStats, publishFrameStats } from '@/engine/performance/frameStats'
import { isFullRateFrame, nextFrameDelayMs } from '@/engine/performance/renderScheduler'
import { applyOverlayPlacement, overlayScreenPosition } from '@/engine/interaction/overlayProjection'
import { poseOfSkyObject } from '@/engine/interaction/skyPose'
import type { SelectedSkyObject, SkySimulation } from '@/shared/types/sky'
import type { ShaderMaterial } from 'three'
import type { SkySceneContext } from './skyContext'
import { cardinals } from '@/config/cardinals'

export type SkyRenderLoop = {
  stop: () => void
  wake: () => void
}

export function startSkyRenderLoop(options: {
  ctx: SkySceneContext
  catalog: RuntimeCatalog
  simulationRef: RefObject<SkySimulation>
  selectedRef: RefObject<SelectedSkyObject | null>
  objectCardRef?: RefObject<HTMLElement | null>
  constellationAnchors: ConstellationAnchor[]
  cardinalRefs: RefObject<Record<string, HTMLDivElement | null>>
  constellationNameRefs: RefObject<Record<string, HTMLDivElement | null>>
  hoverRef: RefObject<HTMLDivElement | null>
  hoverTargetRef: RefObject<{ id: string; name: string; type: 'star' | 'body' } | null>
  bodySnapshotRef: RefObject<BodySnapshotWindow | null>
  requestBodySnapshot: (now: number, utcMillis: number, observer: SkySimulation['observer']) => void
  onSelect: (item: SelectedSkyObject | null) => void
  onAtmosphereChange?: (state: AtmosphereState) => void
}): SkyRenderLoop {
  const {
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
    requestBodySnapshot,
    onSelect,
    onAtmosphereChange,
  } = options
  const { renderer, scene, camera, uniforms, scratch, layers } = ctx
  const frameStats = createFrameStats(45)
  let lastFrameAt = performance.now()
  let qualityPixelRatio = renderer.getPixelRatio()
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
  let lastSunAltitude = Number.NaN
  let lastSunAzimuth = Number.NaN
  let lastAtmosphereKey = ''
  let lastWidth = -1
  let lastHeight = -1
  let activeCard: HTMLElement | null = null
  let altitudeStatNode: Element | null = null
  let azimuthStatNode: Element | null = null
  let cardWidth = 0
  let cardHeight = 0
  const overlayNdc = { x: 0, y: 0, z: 0 }

  const layersKeyOf = (latest: SkySimulation) => {
    const layersState = latest.layers
    return `${layersState.stars}:${layersState.constellationLines}:${layersState.constellationNames}:${layersState.bodies}:${layersState.horizon}:${layersState.landscape}:${layersState.showBelowHorizon}:${layersState.ecliptic}:${layersState.celestialEquator}:${layersState.equatorialGrid}:${layersState.horizontalGrid}:${layersState.milkyWay}:${layersState.daylightEffect}`
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
    const nextLayersKey = layersKeyOf(latest)
    const viewChanged = latest.azimuth !== lastAzimuth || latest.altitude !== lastAltitude || latest.fov !== lastFov
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
    fillHorizonMatrix(latest.utcMillis, latest.observer, uniforms.horizonMat)
    uniforms.showBelow.value = latest.layers.showBelowHorizon ? 1 : 0
    const bodySnapshots = interpolateBodySnapshots(bodySnapshotRef.current, latest.utcMillis)
    const sun = bodySnapshots[0]?.id === 'sun'
      ? bodySnapshots[0]
      : bodySnapshots.find((body) => body.id === 'sun')
    const sunAltitude = sun?.altitude ?? -18
    const sunAzimuth = sun?.azimuth ?? 0
    if (sun) {
      applyHorizonMatrixInto(
        equatorialUnitInto(sun.raHours, sun.decDeg, scratch.horizon),
        uniforms.horizonMat,
        scratch.projected,
      )
      uniforms.sunDir.value.copy(scratch.projected).normalize()
    }
    if (
      sunAltitude !== lastSunAltitude
      || sunAzimuth !== lastSunAzimuth
      || layersChanged
    ) {
      const atmosphere = atmosphereState(sunAltitude, sunAzimuth, latest.layers.daylightEffect)
      uniforms.daylight.value = atmosphere.daylight
      uniforms.twilight.value = atmosphere.twilight
      uniforms.warmth.value = atmosphere.warmth
      uniforms.groundLight.value = atmosphere.groundLight
      if (!sun) uniforms.sunDir.value.set(atmosphere.sunDirX, atmosphere.sunDirY, atmosphere.sunDirZ)
      lastSunAltitude = sunAltitude
      lastSunAzimuth = sunAzimuth
      const atmosphereKey = `${atmosphere.phase}:${Math.round(atmosphere.daylight * 16)}:${Math.round(atmosphere.twilight * 16)}:${Math.round(atmosphere.warmth * 16)}`
      if (atmosphereKey !== lastAtmosphereKey) {
        lastAtmosphereKey = atmosphereKey
        onAtmosphereChange?.(atmosphere)
      }
    }
    uniforms.sky.uFov.value = latest.fov * Math.PI / 180
    const pixelRatio = renderer.getPixelRatio()
    layers.starMaterial.uniforms.uPixelRatio.value = pixelRatio
    ;(layers.bodyPoints.material as ShaderMaterial).uniforms.uPixelRatio.value = pixelRatio
    if (latest.magnitudeLimit !== lastMagnitude) {
      lastVisibleStars = catalog.countStarsThroughMagnitude(latest.magnitudeLimit)
      layers.starGeometry.setDrawRange(0, lastVisibleStars)
      lastMagnitude = latest.magnitudeLimit
    }
    layers.starPoints.visible = latest.layers.stars
    layers.milkyWay.visible = latest.layers.milkyWay
    if (layersChanged) {
      layers.linesGroup.children.forEach((child) => {
        const kind = child.userData.kind
        child.visible = kind === 'constellation' ? latest.layers.constellationLines
          : kind === 'equatorialGrid' ? latest.layers.equatorialGrid
          : kind === 'horizontalGrid' ? latest.layers.horizontalGrid
          : child.visible
      })
      layers.helperGroup.visible = latest.layers.horizon || latest.layers.landscape || latest.layers.ecliptic || latest.layers.celestialEquator
      layers.horizon.visible = latest.layers.horizon && !latest.layers.landscape
      layers.horizonGlow.visible = latest.layers.horizon && !latest.layers.landscape
      layers.ground.visible = latest.layers.landscape
      layers.ecliptic.visible = latest.layers.ecliptic
      layers.equator.visible = latest.layers.celestialEquator
    }

    const viewAltitude = latest.altitude * Math.PI / 180
    const viewAzimuth = latest.azimuth * Math.PI / 180
    scratch.lookTarget.set(
      Math.cos(viewAltitude) * Math.sin(viewAzimuth),
      Math.sin(viewAltitude),
      Math.cos(viewAltitude) * Math.cos(viewAzimuth),
    )
    skyCameraUpInto(latest.altitude, latest.azimuth, scratch.lookTarget, scratch.projected)
    camera.up.copy(scratch.projected)
    camera.lookAt(scratch.lookTarget)
    camera.updateMatrixWorld()
    uniforms.viewToHorizon.value.setFromMatrix4(camera.matrixWorld)

    const width = renderer.domElement.clientWidth
    const height = renderer.domElement.clientHeight
    const sizeChanged = width !== lastWidth || height !== lastHeight
    lastWidth = width
    lastHeight = height
    if (viewChanged || sizeChanged) {
      cardinals.forEach((cardinal) => {
        const node = cardinalRefs.current[cardinal.id]
        if (!node) return
        const ndc = projectSkyToNdc(
          horizontalVectorInto(3.5, cardinal.azimuth, scratch.projected),
          camera,
          latest.fov,
          camera.aspect,
          overlayNdc,
        )
        applyOverlayPlacement(node, overlayScreenPosition(ndc, width, height, 0, 0, 1.2))
      })
    }

    constellationAnchors.forEach((anchor) => {
      const node = constellationNameRefs.current[anchor.name]
      if (!node) return
      const show = latest.layers.constellationNames && latest.layers.constellationLines
      if (!show) {
        if (node.style.display !== 'none') node.style.display = 'none'
        return
      }
      applyHorizonMatrixInto(anchor, uniforms.horizonMat, scratch.horizon)
      if (scratch.horizon.y < 0.07) {
        if (node.style.display !== 'none') node.style.display = 'none'
        return
      }
      const ndc = projectSkyToNdc(
        scratch.projected.set(scratch.horizon.x, scratch.horizon.y, scratch.horizon.z),
        camera,
        latest.fov,
        camera.aspect,
        overlayNdc,
      )
      applyOverlayPlacement(node, overlayScreenPosition(ndc, width, height, 0, 0, 1.05))
    })

    const hoverNode = hoverRef.current
    const hoverTarget = hoverTargetRef.current
    if (hoverNode && hoverTarget) {
      if (selectedRef.current?.id === hoverTarget.id) {
        if (hoverNode.style.display !== 'none') hoverNode.style.display = 'none'
      } else {
        const pose = poseOfSkyObject(hoverTarget, {
          bodies: bodySnapshots,
          starById: catalog.starById,
          horizonMat: uniforms.horizonMat,
          horizonScratch: scratch.horizon,
        })
        if (pose) {
          const ndc = projectSkyToNdc(
            horizontalVectorInto(pose.altitude, pose.azimuth, scratch.projected),
            camera,
            latest.fov,
            camera.aspect,
            overlayNdc,
          )
          const visible = applyOverlayPlacement(hoverNode, overlayScreenPosition(ndc, width, height, 14, -18))
          if (!visible) hoverTargetRef.current = null
        } else hoverTargetRef.current = null
      }
    }

    const card = objectCardRef?.current
    const currentSelected = selectedRef.current
    if (card) {
      if (card !== activeCard) {
        activeCard = card
        altitudeStatNode = card.querySelector('[data-stat="altitude"]')
        azimuthStatNode = card.querySelector('[data-stat="azimuth"]')
        cardWidth = 0
        cardHeight = 0
      }
      if (!currentSelected) {
        if (card.style.display !== 'none') card.style.display = 'none'
      } else {
        const pose = poseOfSkyObject(currentSelected, {
          bodies: bodySnapshots,
          starById: catalog.starById,
          horizonMat: uniforms.horizonMat,
          horizonScratch: scratch.horizon,
        })
        if (pose) {
          if (!cardWidth || !cardHeight) {
            cardWidth = card.offsetWidth
            cardHeight = card.offsetHeight
          }
          const ndc = projectSkyToNdc(
            horizontalVectorInto(pose.altitude, pose.azimuth, scratch.projected),
            camera,
            latest.fov,
            camera.aspect,
            overlayNdc,
          )
          const visible = applyOverlayPlacement(card, overlayScreenPosition(ndc, width, height, 18, -36, 1, {
            width: cardWidth,
            height: cardHeight,
          }))
          if (visible) {
            if (altitudeStatNode) altitudeStatNode.textContent = `${pose.altitude.toFixed(1)}°`
            if (azimuthStatNode) azimuthStatNode.textContent = `${pose.azimuth.toFixed(1)}°`
          } else onSelect(null)
        } else {
          if (card.style.display !== 'none') card.style.display = 'none'
          onSelect(null)
        }
      }
    }

    updateBodiesLayer(
      layers.bodyPoints,
      bodySnapshots,
      latest.layers,
      uniforms.horizonMat,
      scratch.horizon,
      camera,
      latest.fov,
      camera.aspect,
      scratch.projected,
    )

    renderer.render(scene, camera)
    if (lastVisibleStars >= 0) renderer.domElement.dataset.visibleStars = String(lastVisibleStars)
    const frameDelta = frameStartedAt - lastFrameAt
    frameStats.push(frameDelta)
    lastFrameAt = frameStartedAt
    if (frameStats.filled === frameStats.capacity && !latest.scrubbing) {
      const snapshot = frameStats.snapshot()
      const nextPixelRatio = decidePixelRatio(snapshot.averageMs, qualityPixelRatio, window.devicePixelRatio)
      if (nextPixelRatio !== qualityPixelRatio) {
        qualityPixelRatio = nextPixelRatio
        renderer.setPixelRatio(qualityPixelRatio)
        ctx.resize()
      }
      if (import.meta.env.DEV) {
        publishFrameStats(renderer.domElement, snapshot, renderer.info.memory, renderer.info.render.calls)
      }
    }
    lastUtcMillis = latest.utcMillis
    lastAzimuth = latest.azimuth
    lastAltitude = latest.altitude
    lastFov = latest.fov
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
