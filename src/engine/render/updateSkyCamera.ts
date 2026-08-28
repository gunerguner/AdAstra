import { horizontalVectorInto, skyCameraUpInto } from '@/engine/coordinates/skyGeometry'
import type { SkyView } from '@/shared/types/sky'
import type { PerspectiveCamera } from 'three'
import type { SharedSkyUniforms, SkySceneContext } from './skyContext'

/** 按 SkyView 摆相机，并刷新 viewToHorizon（着色器里天球方向）。 */
export function updateSkyCamera(
  camera: PerspectiveCamera,
  uniforms: SharedSkyUniforms,
  scratch: SkySceneContext['scratch'],
  view: SkyView,
) {
  horizontalVectorInto(view.altitude, view.azimuth, scratch.lookTarget)
  skyCameraUpInto(view.altitude, view.azimuth, scratch.lookTarget, scratch.projected)
  camera.up.copy(scratch.projected)
  camera.lookAt(scratch.lookTarget)
  camera.updateMatrixWorld()
  uniforms.viewToHorizon.value.setFromMatrix4(camera.matrixWorld)
}
