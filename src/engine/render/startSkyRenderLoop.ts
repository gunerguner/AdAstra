import type { RefObject } from 'react'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import type { ConstellationAnchor } from '@/engine/astronomy/constellationData'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/astronomyService'
import { applyHorizonMatrixInto, fillHorizonMatrix } from '@/engine/coordinates/skyMath'
import { horizontalVector } from '@/engine/coordinates/skyGeometry'
import { projectSkyToNdc } from './skyProjection'
import { daylightFactor } from './bodyAppearance'
import { updateBodiesLayer } from './layers/bodyLayer'
import { decidePixelRatio } from '@/engine/performance/pixelRatio'
import { applyOverlayPlacement, overlayScreenPosition } from '@/engine/interaction/overlayProjection'
import { poseOfSkyObject } from '@/engine/interaction/skyPose'
import type { SelectedSkyObject, SkySimulation } from '@/shared/types/sky'
import type { ShaderMaterial } from 'three'
import type { SkySceneContext } from './skyContext'
import { cardinals } from '@/config/cardinals'

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
}) {
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
  } = options
  const { renderer, scene, camera, uniforms, scratch, layers } = ctx
  let lastFrameAt = performance.now()
  const recentFrameTimes: number[] = []
  let qualityPixelRatio = renderer.getPixelRatio()
  let running = true
  let frame = 0
  let activeCard: HTMLElement | null = null
  let altitudeStatNode: Element | null = null
  let azimuthStatNode: Element | null = null

  const render = () => {
    if (!running) return
    if (document.hidden) {
      frame = requestAnimationFrame(render)
      return
    }
    const frameStartedAt = performance.now()
    const latest = simulationRef.current
    requestBodySnapshot(frameStartedAt, latest.utcMillis, latest.observer)
    fillHorizonMatrix(new Date(latest.utcMillis), latest.observer, uniforms.horizonMat)
    uniforms.showBelow.value = latest.layers.showBelowHorizon ? 1 : 0
    const bodySnapshots = interpolateBodySnapshots(bodySnapshotRef.current, latest.utcMillis)
    const sunAltitude = bodySnapshots.find((body) => body.id === 'sun')?.altitude ?? -18
    uniforms.daylight.value = daylightFactor(sunAltitude, latest.layers.daylightEffect)
    uniforms.sky.uFov.value = latest.fov * Math.PI / 180
    const pixelRatio = renderer.getPixelRatio()
    layers.starMaterial.uniforms.uPixelRatio.value = pixelRatio
    ;(layers.bodyPoints.material as ShaderMaterial).uniforms.uPixelRatio.value = pixelRatio
    layers.starGeometry.setDrawRange(0, catalog.countStarsThroughMagnitude(latest.magnitudeLimit))
    layers.starPoints.visible = latest.layers.stars
    layers.milkyWay.visible = latest.layers.milkyWay
    layers.linesGroup.children.forEach((child) => {
      const kind = child.userData.kind
      child.visible = kind === 'constellation' ? latest.layers.constellationLines
        : kind === 'equatorialGrid' ? latest.layers.equatorialGrid
        : kind === 'horizontalGrid' ? latest.layers.horizontalGrid
        : child.visible
    })

    const viewAltitude = latest.altitude * Math.PI / 180
    const viewAzimuth = latest.azimuth * Math.PI / 180
    scratch.lookTarget.set(
      Math.cos(viewAltitude) * Math.sin(viewAzimuth),
      Math.sin(viewAltitude),
      Math.cos(viewAltitude) * Math.cos(viewAzimuth),
    )
    camera.lookAt(scratch.lookTarget)
    camera.updateMatrixWorld()

    const width = renderer.domElement.clientWidth
    const height = renderer.domElement.clientHeight
    cardinals.forEach((cardinal) => {
      const node = cardinalRefs.current[cardinal.id]
      if (!node) return
      const ndc = projectSkyToNdc(horizontalVector(3.5, cardinal.azimuth), camera, latest.fov, camera.aspect)
      const placement = overlayScreenPosition(ndc, width, height, 0, 0, 1.2)
      applyOverlayPlacement(node, placement)
    })

    constellationAnchors.forEach((anchor) => {
      const node = constellationNameRefs.current[anchor.name]
      if (!node) return
      const show = latest.layers.constellationNames && latest.layers.constellationLines
      if (!show) {
        node.style.display = 'none'
        return
      }
      applyHorizonMatrixInto(anchor, uniforms.horizonMat, scratch.horizon)
      if (scratch.horizon.y < 0.07) {
        node.style.display = 'none'
        return
      }
      const ndc = projectSkyToNdc(scratch.projected.set(scratch.horizon.x, scratch.horizon.y, scratch.horizon.z), camera, latest.fov, camera.aspect)
      applyOverlayPlacement(node, overlayScreenPosition(ndc, width, height, 0, 0, 1.05))
    })

    const hoverNode = hoverRef.current
    const hoverTarget = hoverTargetRef.current
    if (hoverNode && hoverTarget) {
      if (selectedRef.current?.id === hoverTarget.id) hoverNode.style.display = 'none'
      else {
        const pose = poseOfSkyObject(hoverTarget, {
          bodies: bodySnapshots,
          starById: catalog.starById,
          horizonMat: uniforms.horizonMat,
          horizonScratch: scratch.horizon,
        })
        if (pose) {
          const ndc = projectSkyToNdc(horizontalVector(pose.altitude, pose.azimuth), camera, latest.fov, camera.aspect)
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
      }
      if (!currentSelected) card.style.display = 'none'
      else {
        const pose = poseOfSkyObject(currentSelected, {
          bodies: bodySnapshots,
          starById: catalog.starById,
          horizonMat: uniforms.horizonMat,
          horizonScratch: scratch.horizon,
        })
        if (pose) {
          const ndc = projectSkyToNdc(horizontalVector(pose.altitude, pose.azimuth), camera, latest.fov, camera.aspect)
          const visible = applyOverlayPlacement(card, overlayScreenPosition(ndc, width, height, 18, -36, 1, {
            width: card.offsetWidth,
            height: card.offsetHeight,
          }))
          if (visible) {
            if (altitudeStatNode) altitudeStatNode.textContent = `${pose.altitude.toFixed(1)}°`
            if (azimuthStatNode) azimuthStatNode.textContent = `${pose.azimuth.toFixed(1)}°`
          } else onSelect(null)
        } else {
          card.style.display = 'none'
          onSelect(null)
        }
      }
    }

    layers.helperGroup.visible = latest.layers.horizon || latest.layers.ecliptic || latest.layers.celestialEquator
    layers.horizon.visible = latest.layers.horizon
    layers.horizonGlow.visible = latest.layers.horizon
    layers.ground.visible = latest.layers.horizon
    layers.ecliptic.visible = latest.layers.ecliptic
    layers.equator.visible = latest.layers.celestialEquator

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
    renderer.domElement.dataset.visibleStars = String(catalog.countStarsThroughMagnitude(latest.magnitudeLimit))
    recentFrameTimes.push(frameStartedAt - lastFrameAt)
    if (recentFrameTimes.length > 45) recentFrameTimes.shift()
    lastFrameAt = frameStartedAt
    if (recentFrameTimes.length === 45) {
      const averageFrame = recentFrameTimes.reduce((sum, value) => sum + value, 0) / recentFrameTimes.length
      const nextPixelRatio = decidePixelRatio(averageFrame, qualityPixelRatio, window.devicePixelRatio)
      if (nextPixelRatio !== qualityPixelRatio) {
        qualityPixelRatio = nextPixelRatio
        renderer.setPixelRatio(qualityPixelRatio)
        ctx.resize()
      }
    }
    if (running) frame = requestAnimationFrame(render)
  }

  frame = requestAnimationFrame(render)
  return () => {
    running = false
    cancelAnimationFrame(frame)
  }
}
