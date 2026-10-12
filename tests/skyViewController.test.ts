import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SkyViewController } from '@/engine/interaction/SkyViewController'
import type { SkySceneContext } from '@/engine/render/skyContext'
import type { SkySimulation, SkyView } from '@/shared/types/sky'

function pointer(pointerId: number, clientX: number, clientY: number) {
  return { pointerId, clientX, clientY } as PointerEvent
}

function createController() {
  const element = {
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture() { return false },
    style: { cursor: '' },
  }
  const view: SkyView = { azimuth: 180, altitude: 0, fov: 60 }
  const simulation = {
    current: {
      utcMillis: 0,
      observer: { latitude: 0, longitude: 0 },
      magnitudeLimit: 5,
      layers: {},
      view,
    },
  }
  const commits: SkyView[] = []
  const live: SkyView[] = []
  const controller = new SkyViewController(
    { renderer: { domElement: element } } as unknown as SkySceneContext,
    simulation as unknown as { current: SkySimulation },
    {
      onViewChange: (next) => { commits.push({ ...next }) },
      onViewLive: (next) => { live.push({ ...next }) },
      onSelect: () => {},
    },
    () => [],
    [],
    () => 0,
    () => {},
    () => {},
    () => {},
  )
  return { controller, simulation, commits, live }
}

describe('天空视角控制器', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      setTimeout: globalThis.setTimeout.bind(globalThis),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('拖拽只改 ref，松手才写回 React', () => {
    const { controller, simulation, commits, live } = createController()
    controller.onPointerDown(pointer(1, 0, 0))
    controller.onPointerMove(pointer(1, 100, 0))
    expect(simulation.current.view.azimuth).toBeCloseTo(193.2)
    expect(live.at(-1)?.azimuth).toBeCloseTo(193.2)
    expect(commits).toHaveLength(0)
    controller.onPointerUp(pointer(1, 100, 0))
    expect(commits).toHaveLength(1)
    expect(commits[0]?.azimuth).toBeCloseTo(193.2)
  })

  it('捏合结束把视场写回 React', () => {
    const { controller, simulation, commits } = createController()
    controller.onPointerDown(pointer(1, 0, 0))
    controller.onPointerDown(pointer(2, 100, 0))
    controller.onPointerMove(pointer(2, 220, 0))
    expect(simulation.current.view.fov).toBeLessThan(60)
    expect(commits).toHaveLength(0)
    controller.onPointerUp(pointer(2, 220, 0))
    expect(commits).toHaveLength(0)
    controller.onPointerUp(pointer(1, 0, 0))
    expect(commits).toHaveLength(1)
    expect(commits[0]?.fov).toBe(simulation.current.view.fov)
  })
})
