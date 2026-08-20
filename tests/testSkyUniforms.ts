import { Matrix3, Vector3 } from 'three'
import { createSkyProjectionUniforms } from '../src/engine/render/skyProjection'
import type { SharedSkyUniforms } from '../src/engine/render/skyContext'

export function testSkyUniforms(): SharedSkyUniforms {
  return {
    sky: createSkyProjectionUniforms(),
    horizonMat: new Float32Array(9),
    eqjHorizonMat: new Float32Array(9),
    showBelow: { value: 1 },
    daylight: { value: 1 },
    twilight: { value: 0.2 },
    warmth: { value: 0.1 },
    groundLight: { value: 0.2 },
    sunDir: { value: new Vector3(0, -1, 0) },
    viewToHorizon: { value: new Matrix3() },
  }
}
