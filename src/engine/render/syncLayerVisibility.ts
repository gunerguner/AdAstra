import type { LayerState } from '@/shared/types/sky'
import type { SkySceneContext } from './skyContext'

export function syncLayerVisibility(layers: SkySceneContext['layers'], layerState: LayerState) {
  layers.starPoints.visible = layerState.stars
  layers.milkyWay.visible = layerState.milkyWay
  layers.linesGroup.children.forEach((child) => {
    const kind = child.userData.kind
    child.visible = kind === 'constellation' ? layerState.constellationLines
      : kind === 'equatorialGrid' ? layerState.equatorialGrid
      : kind === 'horizontalGrid' ? layerState.horizontalGrid
      : child.visible
  })
  layers.helperGroup.visible = layerState.horizon || layerState.landscape || layerState.ecliptic || layerState.celestialEquator
  layers.horizon.visible = layerState.horizon && !layerState.landscape
  layers.horizonGlow.visible = layerState.horizon && !layerState.landscape
  layers.ground.visible = layerState.landscape
  layers.ecliptic.visible = layerState.ecliptic
  layers.equator.visible = layerState.celestialEquator
}
