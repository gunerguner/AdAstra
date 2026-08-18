import type { RefObject } from 'react'
import type { SkySimulation, SkyView } from '@/shared/types/sky'
import { fillHorizonMatrix } from '@/engine/coordinates/skyMath'
import { pickSkyObject } from './skyPicker'
import { nudgeView, panView, zoomView } from './viewConstraints'
import type { SkySceneContext } from '@/engine/render/skyContext'
import type { BodySnapshot } from '@/engine/astronomy/astronomyService'
import type { Star } from '@/shared/types/star'
import type { SelectedSkyObject } from '@/shared/types/sky'

type Callbacks = {
  onViewChange: (view: SkyView) => void
  onSelect: (item: SelectedSkyObject | null) => void
}

export class SkyViewController {
  private drag: { x: number; y: number; azimuth: number; altitude: number; moved: boolean } | null = null
  private pointers = new Map<number, { x: number; y: number }>()
  private pinch: { distance: number; fov: number } | null = null
  private lastViewSyncAt = 0
  private listeners: AbortController | null = null

  constructor(
    private readonly ctx: SkySceneContext,
    private readonly simulationRef: RefObject<SkySimulation>,
    private readonly callbacks: Callbacks,
    private readonly bodiesAt: () => BodySnapshot[],
    private readonly stars: Star[],
    private readonly countStarsThroughMagnitude: (limit: number) => number,
    private readonly onHover: (hit: SelectedSkyObject | null) => void,
    private readonly hideHover: () => void,
  ) {}

  emitView(next: SkyView, forceUiSync = false) {
    this.simulationRef.current.azimuth = next.azimuth
    this.simulationRef.current.altitude = next.altitude
    this.simulationRef.current.fov = next.fov
    const now = performance.now()
    if (forceUiSync || now - this.lastViewSyncAt >= 100) {
      this.lastViewSyncAt = now
      this.callbacks.onViewChange(next)
    }
  }

  hitAt(clientX: number, clientY: number) {
    const { renderer, camera, uniforms, scratch } = this.ctx
    const rect = renderer.domElement.getBoundingClientRect()
    scratch.pickPoint.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    const latest = this.simulationRef.current
    fillHorizonMatrix(new Date(latest.utcMillis), latest.observer, uniforms.horizonMat)
    return pickSkyObject({
      ndcX: scratch.pickPoint.x,
      ndcY: scratch.pickPoint.y,
      minScreenSize: Math.max(1, Math.min(rect.width, rect.height)),
      pixelRatio: renderer.getPixelRatio(),
      camera,
      fov: latest.fov,
      aspect: camera.aspect,
      layers: latest.layers,
      magnitudeLimit: latest.magnitudeLimit,
      stars: this.stars,
      countStarsThroughMagnitude: this.countStarsThroughMagnitude,
      bodies: this.bodiesAt(),
      horizonMat: uniforms.horizonMat,
      horizonScratch: scratch.horizon,
      projected: scratch.projected,
    })
  }

  private pointerDistance() {
    const points = [...this.pointers.values()]
    if (points.length < 2) return 0
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  }

  onPointerDown = (event: PointerEvent) => {
    this.ctx.renderer.domElement.setPointerCapture(event.pointerId)
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const latest = this.simulationRef.current
    if (this.pointers.size >= 2) {
      this.drag = null
      this.pinch = { distance: Math.max(this.pointerDistance(), 1), fov: latest.fov }
      return
    }
    this.drag = { x: event.clientX, y: event.clientY, azimuth: latest.azimuth, altitude: latest.altitude, moved: false }
  }

  onPointerMove = (event: PointerEvent) => {
    if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (this.pinch && this.pointers.size >= 2) {
      this.hideHover()
      const latest = this.simulationRef.current
      const distance = Math.max(this.pointerDistance(), 1)
      this.emitView(zoomView({ ...latest, fov: this.pinch.fov }, this.pinch.distance / distance))
      return
    }
    if (this.drag) {
      if (Math.hypot(event.clientX - this.drag.x, event.clientY - this.drag.y) > 5) this.drag.moved = true
      if (!this.drag.moved) return
      this.hideHover()
      this.emitView(panView(
        { azimuth: this.drag.azimuth, altitude: this.drag.altitude, fov: this.simulationRef.current.fov },
        event.clientX - this.drag.x,
        event.clientY - this.drag.y,
      ))
      return
    }
    this.onHover(this.hitAt(event.clientX, event.clientY))
  }

  onPointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    if (this.pointers.size < 2) this.pinch = null
    if (this.drag && !this.drag.moved && this.pointers.size === 0) {
      this.callbacks.onSelect(this.hitAt(event.clientX, event.clientY))
    }
    if (this.drag?.moved && this.pointers.size === 0) {
      const latest = this.simulationRef.current
      this.emitView({ azimuth: latest.azimuth, altitude: latest.altitude, fov: latest.fov }, true)
    }
    if (this.pointers.size === 0) this.drag = null
    if (this.ctx.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.ctx.renderer.domElement.releasePointerCapture(event.pointerId)
    }
  }

  onPointerLeave = () => {
    if (!this.drag) this.hideHover()
  }

  onWheel = (event: WheelEvent) => {
    event.preventDefault()
    const latest = this.simulationRef.current
    this.emitView(zoomView(latest, Math.exp(event.deltaY * 0.0016)), true)
  }

  onKeyDown = (event: KeyboardEvent) => {
    const next = nudgeView(this.simulationRef.current, event.key)
    if (!next) return
    event.preventDefault()
    this.emitView(next, true)
  }

  bind() {
    this.unbind()
    this.listeners = new AbortController()
    const { signal } = this.listeners
    const element = this.ctx.renderer.domElement
    element.addEventListener('pointerdown', this.onPointerDown, { signal })
    element.addEventListener('pointermove', this.onPointerMove, { signal })
    element.addEventListener('pointerup', this.onPointerUp, { signal })
    element.addEventListener('pointercancel', this.onPointerUp, { signal })
    element.addEventListener('pointerleave', this.onPointerLeave, { signal })
    element.addEventListener('wheel', this.onWheel, { passive: false, signal })
    element.addEventListener('keydown', this.onKeyDown, { signal })
  }

  unbind() {
    this.listeners?.abort()
    this.listeners = null
  }
}
