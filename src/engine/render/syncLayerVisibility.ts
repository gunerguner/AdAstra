/**
 * 把控制面板的图层开关写回 Three 对象的 visible。
 * 星座连线 / 赤道网 / 地平网挂在同一 Group 里，用 userData.kind 对上 LayerState。
 */
import type { LayerState } from '@/shared/types/sky'
import type { SkySceneContext } from './skyContext'

const LINE_LAYER_KEY = {
  constellation: 'constellationLines',
  equatorialGrid: 'equatorialGrid',
  horizontalGrid: 'horizontalGrid',
} as const satisfies Record<string, keyof LayerState>

/** 按 layerState 同步场景各层显隐；未知 kind 的折线保持原 visible。 */
export function syncLayerVisibility(layers: SkySceneContext['layers'], layerState: LayerState) {
  layers.starPoints.visible = layerState.stars
  layers.milkyWay.visible = layerState.milkyWay
  layers.linesGroup.children.forEach((child) => {
    const key = LINE_LAYER_KEY[child.userData.kind as keyof typeof LINE_LAYER_KEY]
    if (key) child.visible = layerState[key]
  })
  layers.helperGroup.visible = layerState.horizon || layerState.landscape || layerState.ecliptic || layerState.celestialEquator
  layers.horizon.visible = layerState.horizon && !layerState.landscape
  layers.horizonGlow.visible = layerState.horizon && !layerState.landscape
  layers.ground.visible = layerState.landscape
  layers.ecliptic.visible = layerState.ecliptic
  layers.equator.visible = layerState.celestialEquator
}
