import {
  Line,
  Matrix3,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { Star } from '@/shared/types/star'
import type { ConstellationStars } from '@/engine/astronomy/constellationData'
import { SKY_FOV_DEG, SKY_VOID_HEX, createSkyProjectionUniforms } from './skyProjection'
import { createStarLayer } from './layers/starLayer'
import { createMilkyWayLayer } from './layers/milkyWayLayer'
import { createGridLayer } from './layers/gridLayer'
import { createHelperLayer } from './layers/helperLayer'
import { createSkyDomeLayer, disposeSkyDomeLayer } from './layers/skyDomeLayer'
import { createSkyLimbLayer, disposeSkyLimbLayer } from './layers/skyLimbLayer'
import { createBodiesLayer, disposeBodiesLayer } from './layers/bodyLayer'
import type { SkySceneContext } from './skyContext'

export function createSkyScene(options: {
  mount: HTMLElement
  stars: Star[]
  constellationStars: ConstellationStars[]
}): SkySceneContext {
  const { mount, stars, constellationStars } = options
  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  const scene = new Scene()
  const camera = new PerspectiveCamera(SKY_FOV_DEG, 1, 0.01, 10)
  camera.position.set(0, 0, 0)
  const sky = createSkyProjectionUniforms(SKY_FOV_DEG)
  const horizonMat = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
  const showBelow = { value: 1 }
  const daylight = { value: 0 }
  const twilight = { value: 0 }
  const warmth = { value: 0 }
  const groundLight = { value: 0.06 }
  const sunDir = { value: new Vector3(0, -1, 0) }
  const viewToHorizon = { value: new Matrix3() }
  const sharedUniforms = { horizonMat, sky, showBelow, daylight, twilight, warmth, groundLight, sunDir, viewToHorizon }

  let qualityPixelRatio = Math.min(window.devicePixelRatio, 1.5)
  renderer.setPixelRatio(qualityPixelRatio)
  renderer.setClearColor(SKY_VOID_HEX, 1)
  renderer.setAnimationLoop(null)
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('role', 'application')
  renderer.domElement.setAttribute(
    'aria-label',
    '实时星空画布。使用方向键旋转视角，加号和减号缩放。',
  )
  mount.appendChild(renderer.domElement)

  const skyDome = createSkyDomeLayer(sharedUniforms)
  scene.add(skyDome.mesh)
  const milkyWay = createMilkyWayLayer(sharedUniforms)
  scene.add(milkyWay.mesh)
  const starLayer = createStarLayer(stars, { ...sharedUniforms, pixelRatio: renderer.getPixelRatio() })
  scene.add(starLayer.points)
  const grids = createGridLayer(constellationStars, sharedUniforms)
  scene.add(grids.group)
  const bodies = createBodiesLayer(sky, renderer.getPixelRatio(), { daylight, twilight })
  scene.add(bodies.points)
  const helpers = createHelperLayer(sharedUniforms)
  scene.add(helpers.group)
  const skyLimb = createSkyLimbLayer(sharedUniforms)
  scene.add(skyLimb.mesh)

  const resize = () => {
    const { width, height } = mount.getBoundingClientRect()
    camera.aspect = width / Math.max(height, 1)
    sky.uAspect.value = camera.aspect
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  resize()

  return {
    renderer,
    scene,
    camera,
    uniforms: { sky, horizonMat, showBelow, daylight, twilight, warmth, groundLight, sunDir, viewToHorizon },
    scratch: {
      horizon: { x: 0, y: 0, z: 0 },
      lookTarget: new Vector3(),
      pickPoint: new Vector2(),
      projected: new Vector3(),
    },
    layers: {
      starPoints: starLayer.points,
      starGeometry: starLayer.geometry,
      starMaterial: starLayer.material,
      milkyWay: milkyWay.mesh,
      linesGroup: grids.group,
      bodyPoints: bodies.points,
      helperGroup: helpers.group,
      skyDome: skyDome.mesh,
      ground: helpers.ground,
      horizon: helpers.horizon,
      horizonGlow: helpers.horizonGlow,
      ecliptic: helpers.ecliptic,
      equator: helpers.equator,
      skyLimb: skyLimb.mesh,
    },
    materials: {
      constellationLine: grids.constellationLine,
      equatorialGrid: grids.equatorialGrid,
      horizontalGrid: grids.horizontalGrid,
      skyDome: skyDome.material,
      ground: helpers.groundMaterial,
      skyLimb: skyLimb.material,
    },
    resize,
  }
}

export function disposeSkyScene(ctx: SkySceneContext) {
  ctx.layers.starGeometry.dispose()
  ctx.layers.starMaterial.dispose()
  disposeSkyDomeLayer(ctx.layers.skyDome)
  ctx.layers.milkyWay.geometry.dispose()
  ;(ctx.layers.milkyWay.material as ShaderMaterial).dispose()
  ctx.layers.linesGroup.children.forEach((child) => {
    ;(child as Line).geometry.dispose()
  })
  ctx.materials.constellationLine.dispose()
  ctx.materials.equatorialGrid.dispose()
  ctx.materials.horizontalGrid.dispose()
  ctx.layers.ecliptic.geometry.dispose()
  ;(ctx.layers.ecliptic.material as ShaderMaterial).dispose()
  ctx.layers.equator.geometry.dispose()
  ;(ctx.layers.equator.material as ShaderMaterial).dispose()
  ctx.layers.horizon.geometry.dispose()
  ;(ctx.layers.horizon.material as ShaderMaterial).dispose()
  ctx.layers.horizonGlow.geometry.dispose()
  ;(ctx.layers.horizonGlow.material as ShaderMaterial).dispose()
  ctx.layers.ground.geometry.dispose()
  ctx.materials.ground.dispose()
  disposeSkyLimbLayer(ctx.layers.skyLimb)
  disposeBodiesLayer(ctx.layers.bodyPoints)
  ctx.renderer.dispose()
  ctx.renderer.domElement.remove()
}
