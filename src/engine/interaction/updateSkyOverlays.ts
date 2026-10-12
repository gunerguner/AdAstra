/** 每帧把方位字、星座名、黄道极、hover、信息卡钉到天球方向上。 */
import type { ObjectCardStats, Slot } from '@/shared/types/slot'
import type { Camera, Vector3 } from 'three'
import type { ConstellationAnchor } from '@/engine/astronomy/constellationData'
import type { BodySnapshot } from '@/engine/astronomy/bodyInterpolation'
import { applyHorizonMatrixInto, equatorialUnitInto } from '@/engine/coordinates/skyMath'
import { horizontalVectorInto } from '@/engine/coordinates/skyGeometry'
import { applyOverlayPlacement, placeSkyOverlay, type OverlaySize } from './overlayProjection'
import { poseOfSkyObject } from './skyPose'
import { cardinals, eclipticPoles } from '@/engine/coordinates/astroConstants'
import type { LayerState, SelectedSkyObject } from '@/shared/types/sky'
import type { Star } from '@/shared/types/star'
import type { Vec3 } from '@/engine/render/skyContext'

export type SkyOverlayRefs = {
  cardinalRefs: Slot<Record<string, HTMLDivElement | null>>
  constellationNameRefs: Slot<Record<string, HTMLDivElement | null>>
  eclipticPoleRefs: Slot<Record<string, HTMLDivElement | null>>
  hoverRef: Slot<HTMLDivElement | null>
  hoverTargetRef: Slot<{ id: string; type: 'star' | 'body' } | null>
  objectCardRef?: Slot<HTMLElement | null>
  objectCardStatsRef?: Slot<ObjectCardStats>
  selectedRef: Slot<SelectedSkyObject | null>
}

export type SkyOverlayFrame = {
  width: number
  height: number
  fov: number
  aspect: number
  viewChanged: boolean
  sizeChanged: boolean
  layers: LayerState
  bodySnapshots: BodySnapshot[]
}

const HORIZON_LABEL_MIN_Y = 0.07

/** 返回每帧 update()：只在视角/尺寸/图层变了时重算 DOM 位置。 */
export function createSkyOverlayUpdater(options: {
  camera: Camera
  uniforms: { horizonMat: Float32Array; eqjHorizonMat: Float32Array }
  scratch: { horizon: Vec3; projected: Vector3 }
  starById: Map<string, Star>
  constellationAnchors: ConstellationAnchor[]
  overlays: SkyOverlayRefs
}) {
  const { camera, uniforms, scratch, starById, constellationAnchors, overlays } = options
  const overlayNdc = { x: 0, y: 0, z: 0 }
  let activeCard: HTMLElement | null = null
  let cardWidth = 0
  let cardHeight = 0
  let frameWidth = 0
  let frameHeight = 0
  let frameFov = 0
  let frameAspect = 1

  const hideOverlay = (node: HTMLElement) => applyOverlayPlacement(node, { visible: false, x: 0, y: 0 })

  const placeOverlay = (
    node: HTMLElement,
    world: Vector3,
    offsetX = 0,
    offsetY = 0,
    edge = 1,
    size?: OverlaySize,
  ) => placeSkyOverlay(
    node,
    world,
    camera,
    frameFov,
    frameAspect,
    frameWidth,
    frameHeight,
    overlayNdc,
    offsetX,
    offsetY,
    edge,
    size,
  )

  const poseOptions = () => ({
    bodies: [] as BodySnapshot[],
    starById,
    horizonMat: uniforms.horizonMat,
    eqjHorizonMat: uniforms.eqjHorizonMat,
    horizonScratch: scratch.horizon,
  })

  const placeTrackedOverlay = (
    node: HTMLElement,
    item: { id: string; type: 'star' | 'body' },
    bodies: BodySnapshot[],
    offsetX: number,
    offsetY: number,
    edge = 1,
    size?: OverlaySize,
  ) => {
    const pose = poseOfSkyObject(item, { ...poseOptions(), bodies })
    if (!pose) {
      hideOverlay(node)
      return null
    }
    const visible = placeOverlay(
      node,
      horizontalVectorInto(pose.altitude, pose.azimuth, scratch.projected),
      offsetX,
      offsetY,
      edge,
      size,
    )
    return visible ? pose : null
  }

  return {
    update(frame: SkyOverlayFrame) {
      frameWidth = frame.width
      frameHeight = frame.height
      frameFov = frame.fov
      frameAspect = frame.aspect

      if (frame.viewChanged || frame.sizeChanged) {
        cardinals.forEach((cardinal) => {
          const node = overlays.cardinalRefs.current[cardinal.id]
          if (!node) return
          placeOverlay(node, horizontalVectorInto(3.5, cardinal.azimuth, scratch.projected), 0, 0, 1.2)
        })
      }

      constellationAnchors.forEach((anchor) => {
        const node = overlays.constellationNameRefs.current[anchor.id]
        if (!node) return
        if (!frame.layers.constellationLines) {
          hideOverlay(node)
          return
        }
        applyHorizonMatrixInto(anchor, uniforms.eqjHorizonMat, scratch.horizon)
        if (scratch.horizon.y < HORIZON_LABEL_MIN_Y) {
          hideOverlay(node)
          return
        }
        placeOverlay(node, scratch.projected.set(scratch.horizon.x, scratch.horizon.y, scratch.horizon.z), 0, 0, 1.05)
      })

      eclipticPoles.forEach((pole) => {
        const node = overlays.eclipticPoleRefs.current[pole.id]
        if (!node) return
        if (!frame.layers.ecliptic) {
          hideOverlay(node)
          return
        }
        equatorialUnitInto(pole.raHours, pole.decDeg, scratch.horizon)
        applyHorizonMatrixInto(scratch.horizon, uniforms.eqjHorizonMat, scratch.projected)
        if (!frame.layers.showBelowHorizon && scratch.projected.y < HORIZON_LABEL_MIN_Y) {
          hideOverlay(node)
          return
        }
        placeOverlay(node, scratch.projected, 0, 0, 1.05)
      })

      const hoverNode = overlays.hoverRef.current
      const hoverTarget = overlays.hoverTargetRef.current
      if (hoverNode && hoverTarget) {
        if (overlays.selectedRef.current?.id === hoverTarget.id) {
          hideOverlay(hoverNode)
        } else {
          const pose = placeTrackedOverlay(hoverNode, hoverTarget, frame.bodySnapshots, 14, -18)
          if (!pose) overlays.hoverTargetRef.current = null
        }
      }

      const card = overlays.objectCardRef?.current
      const currentSelected = overlays.selectedRef.current
      if (!card) return
      if (card !== activeCard) {
        activeCard = card
        cardWidth = 0
        cardHeight = 0
      }
      if (!currentSelected) {
        hideOverlay(card)
        return
      }
      if (!cardWidth || !cardHeight) {
        cardWidth = card.offsetWidth
        cardHeight = card.offsetHeight
      }
      const pose = placeTrackedOverlay(
        card,
        currentSelected,
        frame.bodySnapshots,
        18,
        -36,
        1,
        { width: cardWidth, height: cardHeight },
      )
      if (!pose) {
        hideOverlay(card)
        return
      }
      const stats = overlays.objectCardStatsRef?.current
      if (stats?.altitude) stats.altitude.textContent = `${pose.altitude.toFixed(1)}°`
      if (stats?.azimuth) stats.azimuth.textContent = `${pose.azimuth.toFixed(1)}°`
      if (currentSelected.type === 'body' && stats?.magnitude) {
        const body = frame.bodySnapshots.find((item) => item.id === currentSelected.id)
        if (body) stats.magnitude.textContent = body.magnitude.toFixed(2)
      }
    },
  }
}
