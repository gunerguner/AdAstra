/** 指针/滚轮/键盘：改方位仰角视场，并调用拾取。高频视角不进 React state。 */
import type { RefObject } from 'react'
import type { SkySimulation, SkyView } from '@/shared/types/sky'
import { clampSkyFov } from '@/engine/render/skyProjection'
import { fillEqjHorizonMatrices } from '@/engine/coordinates/skyMath'
import { pickSkyObject } from './skyPicker'
import { createStarPickGrid } from './starPickGrid'
import { nudgeView, panView, zoomView } from './viewConstraints'
import { releaseViewInertia, stepViewInertia, type InertiaSample, type InertiaVelocity } from './viewInertia'
import type { SkySceneContext } from '@/engine/render/skyContext'
import type { BodySnapshot } from '@/engine/astronomy/bodyInterpolation'
import type { Star } from '@/shared/types/star'
import type { SelectedSkyObject } from '@/shared/types/sky'

type Callbacks = {
  /** 松手、滚轮结束、键盘等离散操作：写回 React。 */
  onViewChange: (view: SkyView) => void
  /** 拖拽中的每一拍：只刷新方位读数，不触发整树重渲染。 */
  onViewLive: (view: SkyView) => void
  onSelect: (item: SelectedSkyObject | null) => void
}

/** 双击/双触判定窗口与位移容差。 */
const DOUBLE_TAP_MS = 320
const DOUBLE_TAP_RADIUS = 48

export class SkyViewController {
  private drag: { x: number; y: number; azimuth: number; altitude: number; moved: boolean } | null = null
  private pointers = new Map<number, { x: number; y: number }>()
  private pinch: { distance: number; fov: number } | null = null
  private lastTap: { x: number; y: number; time: number } | null = null
  /** 拖拽/捏合/滚轮改过 ref，但还没写回 React。 */
  private pendingUiSync = false
  private listeners: AbortController | null = null
  private viewSyncTimer = 0
  private hoverFrame = 0
  private inertiaFrame = 0
  private inertia: (InertiaVelocity & { lastT: number; startedAt: number }) | null = null
  private samples: InertiaSample[] = []
  private pendingHover: { x: number; y: number } | null = null
  private readonly starGrid = createStarPickGrid()
  private readonly starGridKey = { current: '' }

  constructor(
    private readonly ctx: SkySceneContext,
    private readonly simulationRef: RefObject<SkySimulation>,
    private readonly callbacks: Callbacks,
    private readonly bodiesAt: () => BodySnapshot[],
    private readonly stars: Star[],
    private readonly countStarsThroughMagnitude: (limit: number) => number,
    private readonly onHover: (hit: SelectedSkyObject | null) => void,
    private readonly hideHover: () => void,
    private readonly onActivity: () => void,
  ) {}

  /** 把新视角写入 simulation ref。拖拽中只刷读数；forceUiSync 才通知 React。 */
  emitView(next: SkyView, forceUiSync = false) {
    Object.assign(this.simulationRef.current.view, next)
    this.onActivity()
    this.callbacks.onViewLive(next)
    if (!forceUiSync) {
      this.pendingUiSync = true
      return
    }
    this.pendingUiSync = false
    window.clearTimeout(this.viewSyncTimer)
    this.callbacks.onViewChange(next)
  }

  private rememberSample(x: number, y: number) {
    this.samples.push({ t: performance.now(), x, y })
    if (this.samples.length > 8) this.samples.shift()
  }

  /** 新的按下或卸载取消滑行。sync 为真时把停住的视角写回 React。 */
  private stopInertia(sync: boolean) {
    if (this.inertiaFrame) cancelAnimationFrame(this.inertiaFrame)
    this.inertiaFrame = 0
    this.inertia = null
    if (sync && this.pendingUiSync) this.emitView({ ...this.simulationRef.current.view }, true)
  }

  private onInertiaFrame = (now: number) => {
    const inertia = this.inertia
    if (!inertia) return
    const dt = now - inertia.lastT
    inertia.lastT = now
    const stepped = stepViewInertia(
      this.simulationRef.current.view,
      inertia,
      dt,
      now - inertia.startedAt,
    )
    inertia.vx = stepped.velocity.vx
    inertia.vy = stepped.velocity.vy
    if (stepped.done) {
      this.inertia = null
      this.inertiaFrame = 0
      this.emitView(stepped.view, true)
      return
    }
    this.emitView(stepped.view)
    this.inertiaFrame = requestAnimationFrame(this.onInertiaFrame)
  }

  private beginInertia(now: number) {
    const velocity = releaseViewInertia(this.samples, now)
    this.samples = []
    if (!velocity) return false
    this.inertia = { ...velocity, lastT: now, startedAt: now }
    this.inertiaFrame = requestAnimationFrame(this.onInertiaFrame)
    return true
  }

  private flushViewSoon() {
    window.clearTimeout(this.viewSyncTimer)
    this.viewSyncTimer = window.setTimeout(() => {
      this.emitView({ ...this.simulationRef.current.view }, true)
    }, 80)
  }

  hitAt(clientX: number, clientY: number) {
    const { renderer, camera, uniforms, scratch } = this.ctx
    const rect = renderer.domElement.getBoundingClientRect()
    scratch.pickPoint.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    const latest = this.simulationRef.current
    fillEqjHorizonMatrices(latest.utcMillis, latest.observer, uniforms.horizonMat, uniforms.eqjHorizonMat)
    return pickSkyObject({
      ndcX: scratch.pickPoint.x,
      ndcY: scratch.pickPoint.y,
      minScreenSize: Math.max(1, Math.min(rect.width, rect.height)),
      pixelRatio: renderer.getPixelRatio(),
      camera,
      fov: latest.view.fov,
      aspect: camera.aspect,
      layers: latest.layers,
      magnitudeLimit: latest.magnitudeLimit,
      stars: this.stars,
      countStarsThroughMagnitude: this.countStarsThroughMagnitude,
      bodies: this.bodiesAt(),
      horizonMat: uniforms.horizonMat,
      eqjHorizonMat: uniforms.eqjHorizonMat,
      horizonScratch: scratch.horizon,
      projected: scratch.projected,
      starGrid: this.starGrid,
      starGridKey: this.starGridKey,
    })
  }

  private pointerDistance() {
    const points = [...this.pointers.values()]
    if (points.length < 2) return 0
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  }

  private queueHover(clientX: number, clientY: number) {
    this.onActivity()
    this.pendingHover = { x: clientX, y: clientY }
    if (this.hoverFrame) return
    this.hoverFrame = requestAnimationFrame(() => {
      this.hoverFrame = 0
      const pending = this.pendingHover
      if (!pending || this.drag || this.pinch) return
      this.onHover(this.hitAt(pending.x, pending.y))
    })
  }

  onPointerDown = (event: PointerEvent) => {
    this.onActivity()
    this.stopInertia(false)
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const view = this.simulationRef.current.view
    if (this.pointers.size >= 2) {
      this.drag = null
      this.samples = []
      this.pinch = { distance: Math.max(this.pointerDistance(), 1), fov: view.fov }
    } else {
      this.samples = []
      this.rememberSample(event.clientX, event.clientY)
      this.drag = { x: event.clientX, y: event.clientY, azimuth: view.azimuth, altitude: view.altitude, moved: false }
    }
    // 捕获失败不能挡住拖拽：部分触摸实现会在指针刚结束时抛 InvalidStateError。
    try {
      this.ctx.renderer.domElement.setPointerCapture(event.pointerId)
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
    }
  }

  onPointerMove = (event: PointerEvent) => {
    if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (this.pinch && this.pointers.size >= 2) {
      this.hideHover()
      const distance = Math.max(this.pointerDistance(), 1)
      this.emitView(zoomView({ ...this.simulationRef.current.view, fov: this.pinch.fov }, this.pinch.distance / distance))
      return
    }
    if (this.drag) {
      if (Math.hypot(event.clientX - this.drag.x, event.clientY - this.drag.y) > 5) this.drag.moved = true
      if (!this.drag.moved) return
      this.hideHover()
      this.rememberSample(event.clientX, event.clientY)
      this.emitView(panView(
        { azimuth: this.drag.azimuth, altitude: this.drag.altitude, fov: this.simulationRef.current.view.fov },
        event.clientX - this.drag.x,
        event.clientY - this.drag.y,
      ))
      return
    }
    this.queueHover(event.clientX, event.clientY)
  }

  onPointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    if (this.pointers.size < 2) this.pinch = null
    if (this.drag && !this.drag.moved && this.pointers.size === 0) {
      const now = performance.now()
      const last = this.lastTap
      this.lastTap = { x: event.clientX, y: event.clientY, time: now }
      // 短时间内的第二次轻点视为双击/双触:放大一档,不再重复拾取。
      const isDoubleTap = last !== null
        && now - last.time <= DOUBLE_TAP_MS
        && Math.hypot(event.clientX - last.x, event.clientY - last.y) <= DOUBLE_TAP_RADIUS
      if (isDoubleTap) {
        this.lastTap = null
        this.emitView(zoomView(this.simulationRef.current.view, 0.6), true)
      } else {
        this.callbacks.onSelect(this.hitAt(event.clientX, event.clientY))
      }
    }
    if (this.pointers.size === 0) {
      // 快拖才滑行；滑行结束再写回 React。慢拖和捏合在这里写回。
      const coast = this.drag?.moved ? this.beginInertia(performance.now()) : false
      if (!coast && this.pendingUiSync) this.emitView({ ...this.simulationRef.current.view }, true)
      this.drag = null
    }
    if (this.ctx.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.ctx.renderer.domElement.releasePointerCapture(event.pointerId)
    }
  }

  onPointerLeave = () => {
    this.pendingHover = null
    if (!this.drag) this.hideHover()
  }

  onWheel = (event: WheelEvent) => {
    event.preventDefault()
    const view = this.simulationRef.current.view
    const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 800 : event.deltaY
    this.emitView({
      azimuth: view.azimuth,
      altitude: view.altitude,
      fov: clampSkyFov(view.fov + pixels * 0.038),
    })
    this.flushViewSoon()
  }

  onKeyDown = (event: KeyboardEvent) => {
    const next = nudgeView(this.simulationRef.current.view, event.key)
    if (!next) return
    event.preventDefault()
    this.emitView(next, true)
  }

  /** 在 canvas 上挂指针/滚轮/键盘；重复 bind 会先卸旧监听。 */
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

  /** 卸监听并取消待处理的 hover / 视角同步。 */
  unbind() {
    this.stopInertia(false)
    window.clearTimeout(this.viewSyncTimer)
    cancelAnimationFrame(this.hoverFrame)
    this.hoverFrame = 0
    this.pendingHover = null
    this.listeners?.abort()
    this.listeners = null
  }
}
