import type {
  BufferGeometry,
  Group,
  Line,
  LineLoop,
  Mesh,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { createSkyProjectionUniforms } from './skyProjection'

export type SkyProjectionUniforms = ReturnType<typeof createSkyProjectionUniforms>

export type Vec3 = { x: number; y: number; z: number }

export type SkySceneContext = {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  uniforms: {
    sky: SkyProjectionUniforms
    horizonMat: Float32Array
    showBelow: { value: number }
    daylight: { value: number }
  }
  scratch: {
    horizon: Vec3
    lookTarget: Vector3
    pickPoint: Vector2
    projected: Vector3
  }
  layers: {
    starPoints: Points
    starGeometry: BufferGeometry
    starMaterial: ShaderMaterial
    milkyWay: Mesh
    linesGroup: Group
    bodyPoints: Points
    helperGroup: Group
    ground: Mesh
    horizon: LineLoop
    horizonGlow: LineLoop
    ecliptic: Line
    equator: Line
    skyLimb: Mesh
  }
  materials: {
    constellationLine: ShaderMaterial
    equatorialGrid: ShaderMaterial
    horizontalGrid: ShaderMaterial
    ground: ShaderMaterial
    skyLimb: ShaderMaterial
  }
  resize: () => void
}
