import { describe, expect, it } from 'vitest'
import { Camera, Vector3 } from 'three'
import { createSkyOverlayUpdater, type SkyOverlayRefs } from '../src/engine/interaction/updateSkyOverlays'
import { defaultLayers } from '../src/config/defaultLayers'
import type { BodySnapshot } from '../src/engine/astronomy/bodyInterpolation'
import type { LayerState, SelectedSkyObject } from '../src/shared/types/sky'
import type { Star } from '../src/shared/types/star'

const identityCamera = {
  matrixWorldInverse: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
} as Camera

const identityMat = () => new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])

function overlayNode() {
  const style = { display: '', transform: '' }
  return {
    style,
    offsetWidth: 80,
    offsetHeight: 40,
    querySelector: () => null,
  } as unknown as HTMLElement
}

function ref<T>(current: T) {
  return { current }
}

function overlays(partial: Partial<{
  constellation: HTMLElement
  pole: HTMLElement
  hover: HTMLElement
  card: HTMLElement
  selected: SelectedSkyObject | null
  hoverTarget: { id: string; name: string; type: 'star' | 'body' } | null
}> = {}): SkyOverlayRefs {
  return {
    cardinalRefs: ref<Record<string, HTMLDivElement | null>>({}),
    constellationNameRefs: ref<Record<string, HTMLDivElement | null>>({
      Orion: (partial.constellation ?? null) as HTMLDivElement | null,
    }),
    eclipticPoleRefs: ref<Record<string, HTMLDivElement | null>>({
      north: (partial.pole ?? null) as HTMLDivElement | null,
    }),
    hoverRef: ref((partial.hover ?? null) as HTMLDivElement | null),
    hoverTargetRef: ref(partial.hoverTarget ?? null),
    objectCardRef: ref(partial.card ?? null),
    selectedRef: ref(partial.selected ?? null),
  }
}

function updater(overlayRefs: SkyOverlayRefs) {
  return createSkyOverlayUpdater({
    camera: identityCamera,
    uniforms: { horizonMat: identityMat(), eqjHorizonMat: identityMat() },
    scratch: { horizon: { x: 0, y: 0, z: 0 }, projected: new Vector3() },
    starById: new Map<string, Star>(),
    constellationAnchors: [{ name: 'Orion', x: 0, y: 0.45, z: -0.89 }],
    overlays: overlayRefs,
  })
}

function frame(layers: Partial<LayerState> = {}, bodySnapshots: BodySnapshot[] = []) {
  return {
    width: 800,
    height: 600,
    fov: 72,
    aspect: 800 / 600,
    viewChanged: true,
    sizeChanged: true,
    layers: { ...defaultLayers, ...layers },
    bodySnapshots,
  }
}

const polarBody: BodySnapshot = {
  id: 'moon',
  name: '月亮',
  altitude: 90,
  azimuth: 0,
  raHours: 0,
  decDeg: 90,
  magnitude: -12.6,
  phaseAngle: 0,
  phaseFraction: 1,
}

describe('updateSkyOverlays', () => {
  it('hides constellation names when the constellation layer is off', () => {
    const node = overlayNode()
    updater(overlays({ constellation: node })).update(frame({ constellationLines: false }))
    expect(node.style.display).toBe('none')
  })

  it('hides constellation names below the horizon', () => {
    const node = overlayNode()
    const overlayRefs = overlays({ constellation: node })
    const sky = createSkyOverlayUpdater({
      camera: identityCamera,
      uniforms: { horizonMat: identityMat(), eqjHorizonMat: identityMat() },
      scratch: { horizon: { x: 0, y: 0, z: 0 }, projected: new Vector3() },
      starById: new Map(),
      constellationAnchors: [{ name: 'Orion', x: 0, y: 0.01, z: -1 }],
      overlays: overlayRefs,
    })
    sky.update(frame())
    expect(node.style.display).toBe('none')
  })

  it('hides ecliptic poles when the ecliptic layer is off', () => {
    const node = overlayNode()
    updater(overlays({ pole: node })).update(frame({ ecliptic: false }))
    expect(node.style.display).toBe('none')
  })

  it('hides hover when the selected object is the same target', () => {
    const hover = overlayNode()
    const selected: SelectedSkyObject = {
      id: 'moon',
      name: '月亮',
      type: 'body',
      altitude: 12,
      azimuth: 80,
    }
    const overlayRefs = overlays({
      hover,
      selected,
      hoverTarget: { id: 'moon', name: '月亮', type: 'body' },
    })
    updater(overlayRefs).update(frame())
    expect(hover.style.display).toBe('none')
    expect(overlayRefs.hoverTargetRef.current?.id).toBe('moon')
  })

  it('clears hover when the target is off-screen', () => {
    const hover = overlayNode()
    const overlayRefs = overlays({
      hover,
      hoverTarget: { id: 'moon', name: '月亮', type: 'body' },
    })
    updater(overlayRefs).update(frame({}, [polarBody]))
    expect(hover.style.display).toBe('none')
    expect(overlayRefs.hoverTargetRef.current).toBeNull()
  })

  it('hides the object card when it leaves the view without clearing selection', () => {
    const card = overlayNode()
    const selected: SelectedSkyObject = {
      id: 'moon',
      name: '月亮',
      type: 'body',
      altitude: 90,
      azimuth: 0,
    }
    const overlayRefs = overlays({ card, selected })
    updater(overlayRefs).update(frame({}, [polarBody]))
    expect(card.style.display).toBe('none')
    expect(overlayRefs.selectedRef.current?.id).toBe('moon')
  })
})
