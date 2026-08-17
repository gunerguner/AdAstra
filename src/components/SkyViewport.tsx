import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Line,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  AdditiveBlending,
  DoubleSide,
} from 'three'
import { constellationLines, type Star } from '../data/catalog'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '../engine/astronomyService'
import { AppError, logAppError, toAppError } from '../engine/appError'
import type { RuntimeCatalog } from '../engine/catalogService'
import {
  applyHorizonMatrixInto,
  eclipticEquatorialUnit,
  equatorialUnit,
  fillHorizonMatrix,
} from '../engine/skyMath'
import { densifyGreatCircle, horizontalVector, toVector3 } from '../engine/skyGeometry'
import type { SkySimulation } from '../engine/simulationState'
import {
  SKY_FOV_DEG,
  clampSkyFov,
  createSkyProjectionUniforms,
  patchSkyProjection,
  projectSkyToNdc,
  skyOutsideViewGlsl,
  skyProjectionGlsl,
} from '../engine/skyProjection'
import { detectRenderCapabilities } from '../engine/renderCapabilities'
import ErrorPanel from './ErrorPanel'

export type SelectedSkyObject = {
  id: string
  name: string
  type: 'star' | 'body'
  magnitude?: number
  constellation?: string
  altitude: number
  azimuth: number
}

type Props = {
  catalog: RuntimeCatalog
  simulationRef: MutableRefObject<SkySimulation>
  onViewChange: (view: { azimuth: number; altitude: number; fov: number }) => void
  onSelect: (item: SelectedSkyObject | null) => void
  selected?: SelectedSkyObject | null
  objectCardRef?: RefObject<HTMLElement | null>
  children?: ReactNode
  onWebglReady?: (mode: 'webgl2' | 'canvas') => void
}

const bodyAppearance: Record<string, { color: string; size: number }> = {
  sun: { color: '#ffe69a', size: 20 },
  moon: { color: '#edf4ff', size: 16 },
  mercury: { color: '#c6b49d', size: 7 },
  venus: { color: '#ffe8bb', size: 10 },
  mars: { color: '#ff8e76', size: 9 },
  jupiter: { color: '#ffd2a2', size: 11 },
  saturn: { color: '#f8dea3', size: 9 },
}

const cardinals = [
  { id: 'north', label: '北', azimuth: 0 },
  { id: 'east', label: '东', azimuth: 90 },
  { id: 'south', label: '南', azimuth: 180 },
  { id: 'west', label: '西', azimuth: 270 },
] as const

export default function SkyViewport({ catalog, simulationRef, onViewChange, onSelect, selected, objectCardRef, children, onWebglReady }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HTMLDivElement>(null)
  const cardinalRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const constellationNameRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const bodySnapshotRef = useRef<BodySnapshotWindow | null>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const callbacksRef = useRef({ onSelect, onViewChange, onWebglReady })
  callbacksRef.current = { onSelect, onViewChange, onWebglReady }
  const [viewportError, setViewportError] = useState<AppError | null>(null)
  const constellationStars = useMemo(() => constellationLines.map((line) => ({
    name: line.name,
    segments: line.segments.map((segment) =>
      segment.map((id) => catalog.starById.get(id)).filter((star): star is Star => Boolean(star)),
    ),
  })), [catalog])
  const constellationAnchors = useMemo(() => constellationStars.map((line) => {
    let x = 0
    let y = 0
    let z = 0
    line.segments.forEach((segment) => {
      segment.forEach((star) => {
        const vector = equatorialUnit(star.raHours, star.decDeg)
        x += vector.x
        y += vector.y
        z += vector.z
      })
    })
    const length = Math.hypot(x, y, z) || 1
    return { name: line.name, x: x / length, y: y / length, z: z / length }
  }), [constellationStars])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const { stars, starById, countStarsThroughMagnitude } = catalog
    const worker = new Worker(new URL('../workers/astro.worker.ts', import.meta.url), { type: 'module' })
    let bodyGeneration = 0
    let lastBodyRequestAt = -Infinity
    const reportError = (error: unknown, code: 'webgl' | 'worker') => {
      const appError = toAppError(error, code)
      logAppError(appError, 'SkyViewport')
      setViewportError(appError)
    }
    worker.onmessage = (event: MessageEvent<{ type: 'snapshot' | 'error'; generation: number; window?: BodySnapshotWindow; message?: string }>) => {
      if (event.data.generation !== bodyGeneration) return
      if (event.data.type === 'error') {
        reportError(new AppError('worker', event.data.message ?? '天体计算失败', { retryable: true }), 'worker')
        return
      }
      if (event.data.window) {
        bodySnapshotRef.current = event.data.window
        setViewportError((current) => current?.code === 'worker' ? null : current)
      }
    }
    worker.onerror = (event) => {
      event.preventDefault()
      reportError(new AppError('worker', '天体计算线程异常', { cause: event.error, retryable: true }), 'worker')
    }

    let renderer: WebGLRenderer
    if (detectRenderCapabilities().activeFallback !== 'main-thread-webgl2') {
      reportError(new AppError('webgl', '当前浏览器不支持 WebGL2 星空渲染。'), 'webgl')
      callbacksRef.current.onWebglReady?.('canvas')
      worker.terminate()
      return
    }
    try {
      renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' })
    } catch (error) {
      reportError(error, 'webgl')
      callbacksRef.current.onWebglReady?.('canvas')
      worker.terminate()
      return
    }

    const scene = new Scene()
    const camera = new PerspectiveCamera(SKY_FOV_DEG, 1, 0.01, 10)
    camera.position.set(0, 0, 0)
    const skyUniforms = createSkyProjectionUniforms(SKY_FOV_DEG)
    const horizonMat = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
    const horizonScratch = { x: 0, y: 0, z: 0 }
    const showBelowUniform = { value: 1 }
    const daylightUniform = { value: 1 }
    const makeSkyLineMaterial = (color: string, opacity: number, useHorizon: boolean) =>
      new ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uHorizon: { value: horizonMat },
          uFov: skyUniforms.uFov,
          uAspect: skyUniforms.uAspect,
          uUseHorizon: { value: useHorizon ? 1 : 0 },
          uShowBelow: showBelowUniform,
          uColor: { value: new Color(color) },
          uOpacity: { value: opacity },
        },
        vertexShader: `
          uniform float uHorizon[9];
          uniform float uFov;
          uniform float uAspect;
          uniform float uUseHorizon;
          varying float vAlt;
          varying vec3 vViewDir;
          ${skyProjectionGlsl}
          void main() {
            vec3 h = position;
            if (uUseHorizon > 0.5) {
              h = vec3(
                uHorizon[0] * position.x + uHorizon[1] * position.y + uHorizon[2] * position.z,
                uHorizon[3] * position.x + uHorizon[4] * position.y + uHorizon[5] * position.z,
                uHorizon[6] * position.x + uHorizon[7] * position.y + uHorizon[8] * position.z
              );
            }
            vAlt = h.y;
            vViewDir = skyViewDir(h);
            gl_Position = projectSkyDir(vViewDir);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uShowBelow;
          uniform float uFov;
          uniform float uAspect;
          varying float vAlt;
          varying vec3 vViewDir;
          ${skyOutsideViewGlsl}
          void main() {
            if (skyOutsideView(vViewDir) > 0.5) discard;
            float visible = max(step(-0.08, vAlt), uShowBelow);
            if (visible < 0.5) discard;
            gl_FragColor = vec4(uColor, uOpacity);
          }
        `,
      })
    const makeLine = (color: string, opacity = 0.7, useHorizon = false) =>
      makeSkyLineMaterial(color, opacity, useHorizon)
    const makeBodyMaterial = (color: string) => {
      const material = new MeshBasicMaterial({ color, transparent: true })
      patchSkyProjection(material, skyUniforms)
      return material
    }
    let qualityPixelRatio = Math.min(window.devicePixelRatio, 1.5)
    renderer.setPixelRatio(qualityPixelRatio)
    renderer.setClearColor(0x02040c, 1)
    renderer.setAnimationLoop(null)
    renderer.domElement.tabIndex = 0
    renderer.domElement.setAttribute('role', 'application')
    renderer.domElement.setAttribute('aria-label', '实时星空。使用方向键旋转视角，减号和加号缩放。')
    mount.appendChild(renderer.domElement)
    callbacksRef.current.onWebglReady?.(renderer.capabilities.isWebGL2 ? 'webgl2' : 'canvas')

    const starGeometry = new BufferGeometry()
    const starPositions = new Float32Array(stars.length * 3)
    const starColors = new Float32Array(stars.length * 3)
    const starSizes = new Float32Array(stars.length)
    const starBrightness = new Float32Array(stars.length)
    const color = new Color()
    stars.forEach((star, index) => {
      const vector = equatorialUnit(star.raHours, star.decDeg)
      starPositions.set([vector.x, vector.y, vector.z], index * 3)
      color.set(star.color)
      starColors.set([color.r, color.g, color.b], index * 3)
      const brightness = Math.max(0, Math.min(1, (3.1 - star.magnitude) / 4.6))
      starBrightness[index] = brightness
      starSizes[index] = 9 + brightness * 44
    })
    starGeometry.setAttribute('position', new BufferAttribute(starPositions, 3))
    starGeometry.setAttribute('color', new BufferAttribute(starColors, 3))
    starGeometry.setAttribute('size', new BufferAttribute(starSizes, 1))
    starGeometry.setAttribute('brightness', new BufferAttribute(starBrightness, 1))

    const starMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uHorizon: { value: horizonMat },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uShowBelow: showBelowUniform,
        uDaylight: daylightUniform,
        uFov: skyUniforms.uFov,
        uAspect: skyUniforms.uAspect,
      },
      vertexShader: `
        attribute float size;
        attribute float brightness;
        attribute vec3 color;
        uniform float uHorizon[9];
        uniform float uPixelRatio;
        uniform float uShowBelow;
        uniform float uDaylight;
        uniform float uFov;
        uniform float uAspect;
        varying vec3 vColor;
        varying float vBright;
        ${skyProjectionGlsl}
        void main() {
          vec3 h = vec3(
            uHorizon[0] * position.x + uHorizon[1] * position.y + uHorizon[2] * position.z,
            uHorizon[3] * position.x + uHorizon[4] * position.y + uHorizon[5] * position.z,
            uHorizon[6] * position.x + uHorizon[7] * position.y + uHorizon[8] * position.z
          );
          vec3 viewDir = skyViewDir(h);
          float visible = max(step(0.0, h.y), uShowBelow) * (1.0 - skyOutsideView(viewDir));
          float fade = mix(1.0, clamp((h.y + 0.08) * 5.2, 0.08, 1.0), uDaylight);
          vColor = color;
          vBright = brightness * visible * fade;
          gl_Position = projectSkyDir(viewDir);
          gl_PointSize = size * uPixelRatio * visible * step(gl_Position.z, 1.2) * clamp(1.22 / uFov, 0.52, 1.9);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vBright;
        void main() {
          vec2 q = gl_PointCoord * 2.0 - 1.0;
          float rr = dot(q, q);
          if (rr > 1.0) discard;

          float core = exp(-rr * 42.0);
          float glow = exp(-rr * 9.0) * 0.42;
          float halo = exp(-rr * 2.6) * 0.16;

          float spike = 0.0;
          if (vBright > 0.22) {
            float sx = exp(-abs(q.x) * 26.0) * exp(-q.y * q.y * 110.0);
            float sy = exp(-abs(q.y) * 26.0) * exp(-q.x * q.x * 110.0);
            spike = (sx + sy) * smoothstep(0.22, 0.85, vBright) * 0.7;
          }

          float energy = (core * 1.55 + glow + halo + spike) * (0.28 + vBright * 1.15);
          vec3 hot = mix(vColor, vec3(1.0), clamp(core * 1.35, 0.0, 0.92));
          gl_FragColor = vec4(hot * energy, energy);
        }
      `,
    })
    const starPoints = new Points(starGeometry, starMaterial)
    starPoints.renderOrder = 1
    scene.add(starPoints)

    const ngp = equatorialUnit(12.857298, 27.12825)
    const gc = equatorialUnit(17.760333, -28.936175)
    const galZ = new Vector3(ngp.x, ngp.y, ngp.z).normalize()
    const galX = new Vector3(gc.x, gc.y, gc.z)
    galX.sub(galZ.clone().multiplyScalar(galX.dot(galZ))).normalize()
    const galY = new Vector3().crossVectors(galZ, galX).normalize()
    const milkyMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      uniforms: {
        uHorizon: { value: horizonMat },
        uShowBelow: showBelowUniform,
        uDaylight: daylightUniform,
        uGalX: { value: galX },
        uGalY: { value: galY },
        uGalZ: { value: galZ },
        uFov: skyUniforms.uFov,
        uAspect: skyUniforms.uAspect,
      },
      vertexShader: `
        uniform float uHorizon[9];
        uniform vec3 uGalX;
        uniform vec3 uGalY;
        uniform vec3 uGalZ;
        uniform float uFov;
        uniform float uAspect;
        varying vec3 vGal;
        varying float vAlt;
        varying vec3 vViewDir;
        ${skyProjectionGlsl}
        void main() {
          vec3 h = vec3(
            uHorizon[0] * position.x + uHorizon[1] * position.y + uHorizon[2] * position.z,
            uHorizon[3] * position.x + uHorizon[4] * position.y + uHorizon[5] * position.z,
            uHorizon[6] * position.x + uHorizon[7] * position.y + uHorizon[8] * position.z
          );
          vGal = vec3(dot(position, uGalX), dot(position, uGalY), dot(position, uGalZ));
          vAlt = h.y;
          vViewDir = skyViewDir(h);
          gl_Position = projectSkyDir(vViewDir);
        }
      `,
        fragmentShader: `
        uniform float uShowBelow;
        uniform float uDaylight;
        uniform float uFov;
        uniform float uAspect;
        varying vec3 vGal;
        varying float vAlt;
        varying vec3 vViewDir;
        ${skyOutsideViewGlsl}
        float hash13(vec3 p) {
          p = fract(p * vec3(443.8975, 441.423, 437.195));
          p += dot(p, p.yzx + 19.19);
          return fract((p.x + p.y) * p.z);
        }
        float vnoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n000 = hash13(i);
          float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
          float nxy0 = mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y);
          float nxy1 = mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y);
          return mix(nxy0, nxy1, f.z);
        }
        float fbm(vec3 p) {
          float sum = 0.0;
          float amp = 0.52;
          for (int i = 0; i < 3; i++) {
            sum += amp * vnoise(p);
            p = p * 2.11 + vec3(0.17, 0.31, 0.13);
            amp *= 0.55;
          }
          return sum;
        }
        void main() {
          if (skyOutsideView(vViewDir) > 0.5) discard;
          float visible = max(step(-0.02, vAlt), uShowBelow);
          float fade = mix(1.0, clamp((vAlt + 0.06) * 4.4, 0.0, 1.0), uDaylight);
          if (visible * fade < 0.01) discard;

          vec3 g = normalize(vGal);
          float lat = abs(g.z);
          float plane = exp(-lat * lat * 34.0);
          float halo = exp(-lat * lat * 7.5) * 0.42;
          float towardCenter = clamp(g.x * 0.58 + 0.42, 0.0, 1.0);
          float bulge = exp(-length(g - vec3(1.0, 0.0, 0.0)) * 2.15);

          float clouds = fbm(g * 7.4);
          float wisps = fbm(g * 16.5 + 2.7);
          float lanes = smoothstep(0.38, 0.78, fbm(g * 11.2 + vec3(4.1, 1.3, 2.0)));
          float dust = lanes * plane * (0.25 + 0.75 * towardCenter);

          float glow = (plane * 0.72 + halo) * (0.28 + 0.85 * towardCenter);
          glow += bulge * 0.28;
          glow *= 0.42 + clouds * 0.55 + wisps * 0.18;
          glow *= 1.0 - dust * 0.78;
          glow *= fade * visible * 0.32;

          vec3 cold = vec3(0.58, 0.66, 0.82);
          vec3 warm = vec3(0.78, 0.72, 0.62);
          vec3 lane = vec3(0.28, 0.22, 0.2);
          vec3 col = mix(cold, warm, clamp(bulge * 0.8 + towardCenter * 0.15, 0.0, 1.0));
          col = mix(col, lane, dust * 0.45);
          float sparkle = pow(vnoise(g * 92.0), 18.0) * plane * 0.12;
          col += vec3(0.9, 0.9, 1.0) * sparkle;

          gl_FragColor = vec4(col * glow, clamp(glow * 0.85, 0.0, 0.22));
        }
      `,
    })
    const milkyWay = new Mesh(new SphereGeometry(1, 96, 48), milkyMaterial)
    milkyWay.frustumCulled = false
    milkyWay.renderOrder = 0
    scene.add(milkyWay)

    const linesGroup = new Group()
    scene.add(linesGroup)
    const bodiesGroup = new Group()
    scene.add(bodiesGroup)
    const bodyMeshes = new Map<string, Mesh>()
    const helperGroup = new Group()
    scene.add(helperGroup)

    const constellationLineMaterial = makeLine('#9da7e7', 0.5, true)
    const equatorialGridMaterial = makeLine('#8eb4d8', 0.55, true)
    const horizontalGridMaterial = makeLine('#6f9a7a', 0.5, false)
    constellationStars.forEach((line) => {
      line.segments.forEach((segment) => {
        const points = densifyGreatCircle(segment.map((star) => toVector3(equatorialUnit(star.raHours, star.decDeg))))
        if (points.length > 1) {
          const mesh = new Line(new BufferGeometry().setFromPoints(points), constellationLineMaterial)
          mesh.frustumCulled = false
          mesh.userData.kind = 'constellation'
          linesGroup.add(mesh)
        }
      })
    })
    const addSkyLine = (points: Vector3[], kind: string, material: ShaderMaterial) => {
      const densified = densifyGreatCircle(points)
      if (densified.length < 2) return
      const mesh = new Line(new BufferGeometry().setFromPoints(densified), material)
      mesh.frustumCulled = false
      mesh.userData.kind = kind
      linesGroup.add(mesh)
    }
    ;[-60, -30, 0, 30, 60].forEach((dec) => {
      for (let start = 0; start < 360; start += 90) {
        addSkyLine(
          Array.from({ length: 19 }, (_, index) => toVector3(equatorialUnit((start + index * 5) / 15, dec))),
          'equatorialGrid',
          equatorialGridMaterial,
        )
      }
    })
    for (let raHours = 0; raHours < 24; raHours += 2) {
      addSkyLine(
        [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75].map((dec) => toVector3(equatorialUnit(raHours, dec))),
        'equatorialGrid',
        equatorialGridMaterial,
      )
    }
    ;[15, 30, 45, 60, 75].forEach((alt) => {
      for (let start = 0; start < 360; start += 90) {
        addSkyLine(
          Array.from({ length: 19 }, (_, index) => horizontalVector(alt, start + index * 5)),
          'horizontalGrid',
          horizontalGridMaterial,
        )
      }
    })
    for (let az = 0; az < 360; az += 30) {
      addSkyLine(
        [2, 15, 30, 45, 60, 75, 88].map((alt) => horizontalVector(alt, az)),
        'horizontalGrid',
        horizontalGridMaterial,
      )
    }

    const groundMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
      uniforms: {
        uFov: skyUniforms.uFov,
        uAspect: skyUniforms.uAspect,
      },
      vertexShader: `
        uniform float uFov;
        uniform float uAspect;
        varying vec3 vViewDir;
        ${skyProjectionGlsl}
        void main() {
          vViewDir = skyViewDir(position);
          gl_Position = projectSkyDir(vViewDir);
        }
      `,
      fragmentShader: `
        uniform float uFov;
        uniform float uAspect;
        varying vec3 vViewDir;
        ${skyOutsideViewGlsl}
        void main() {
          if (skyOutsideView(vViewDir) > 0.5) discard;
          gl_FragColor = vec4(0.015, 0.02, 0.035, 0.88);
        }
      `,
    })
    const ground = new Mesh(new SphereGeometry(1, 96, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), groundMaterial)
    ground.frustumCulled = false
    ground.renderOrder = 0
    const horizon = new LineLoop(
      new BufferGeometry().setFromPoints(Array.from({ length: 257 }, (_, index) => {
        const angle = (index / 256) * Math.PI * 2
        return new Vector3(Math.sin(angle), 0, Math.cos(angle))
      })),
      makeLine('#f3e1b0', 1, false),
    )
    const horizonGlow = new LineLoop(
      new BufferGeometry().setFromPoints(Array.from({ length: 257 }, (_, index) => {
        const angle = (index / 256) * Math.PI * 2
        return new Vector3(Math.sin(angle), 0.004, Math.cos(angle))
      })),
      makeLine('#c9a15a', 0.45, false),
    )
    helperGroup.add(ground, horizonGlow, horizon)

    const ecliptic = new Line(
      new BufferGeometry().setFromPoints(Array.from({ length: 145 }, (_, index) => toVector3(eclipticEquatorialUnit(index * 2.5)))),
      makeLine('#f0a03a', 0.92, true),
    )
    const equator = new Line(
      new BufferGeometry().setFromPoints(Array.from({ length: 145 }, (_, index) => toVector3(equatorialUnit((index / 144) * 24, 0)))),
      makeLine('#4cc4e8', 0.88, true),
    )
    helperGroup.add(ecliptic, equator)

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect()
      camera.aspect = width / Math.max(height, 1)
      skyUniforms.uAspect.value = camera.aspect
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    let drag: { x: number; y: number; azimuth: number; altitude: number; moved: boolean } | null = null
    const pointers = new Map<number, { x: number; y: number }>()
    let pinch: { distance: number; fov: number } | null = null
    const pointerDistance = () => {
      const points = [...pointers.values()]
      if (points.length < 2) return 0
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
    }
    let lastViewSyncAt = 0
    const emitView = (next: { azimuth: number; altitude: number; fov: number }, forceUiSync = false) => {
      simulationRef.current.azimuth = next.azimuth
      simulationRef.current.altitude = next.altitude
      simulationRef.current.fov = next.fov
      const now = performance.now()
      if (forceUiSync || now - lastViewSyncAt >= 100) {
        lastViewSyncAt = now
        callbacksRef.current.onViewChange(next)
      }
    }
    const hoverNode = hoverRef.current
    let hoverTarget: { id: string; name: string; type: 'star' | 'body' } | null = null
    let activeCard: HTMLElement | null = null
    let altitudeStatNode: Element | null = null
    let azimuthStatNode: Element | null = null
    const hideHover = () => {
      hoverTarget = null
      if (hoverNode) hoverNode.style.display = 'none'
      renderer.domElement.style.cursor = ''
    }
    const bodiesAt = (utcMillis: number) => interpolateBodySnapshots(bodySnapshotRef.current, utcMillis)
    const requestBodySnapshot = (now: number, latest: SkySimulation) => {
      if (document.hidden || now - lastBodyRequestAt < 120) return
      bodyGeneration += 1
      lastBodyRequestAt = now
      worker.postMessage({
        type: 'snapshot',
        generation: bodyGeneration,
        utcMillis: latest.utcMillis,
        lookAheadMillis: 6 * 60 * 60 * 1000,
        observer: latest.observer,
      })
    }
    const poseOf = (item: { id: string; name: string; type: 'star' | 'body' }) => {
      if (item.type === 'body') {
        const body = bodiesAt(simulationRef.current.utcMillis).find((entry) => entry.id === item.id)
        if (!body) return null
        applyHorizonMatrixInto(equatorialUnit(body.raHours, body.decDeg), horizonMat, horizonScratch)
        return {
          altitude: Math.asin(Math.max(-1, Math.min(1, horizonScratch.y))) * 180 / Math.PI,
          azimuth: (Math.atan2(horizonScratch.x, horizonScratch.z) * 180 / Math.PI + 360) % 360,
        }
      }
      const star = starById.get(item.id)
      if (!star) return null
      applyHorizonMatrixInto(equatorialUnit(star.raHours, star.decDeg), horizonMat, horizonScratch)
      return {
        altitude: Math.asin(Math.max(-1, Math.min(1, horizonScratch.y))) * 180 / Math.PI,
        azimuth: (Math.atan2(horizonScratch.x, horizonScratch.z) * 180 / Math.PI + 360) % 360,
      }
    }
    const placeOverlay = (
      node: HTMLElement,
      altitude: number,
      azimuth: number,
      offsetX: number,
      offsetY: number,
      size?: { width: number; height: number },
    ) => {
      const ndc = projectSkyToNdc(horizontalVector(altitude, azimuth), camera, simulationRef.current.fov, camera.aspect)
      const width = renderer.domElement.clientWidth
      const height = renderer.domElement.clientHeight
      if (!ndc || Math.abs(ndc.x) > 1.18 || Math.abs(ndc.y) > 1.18) {
        node.style.display = 'none'
        return false
      }
      let x = (ndc.x * 0.5 + 0.5) * width + offsetX
      let y = (-ndc.y * 0.5 + 0.5) * height + offsetY
      if (size) {
        if (x + size.width > width - 12) x = (ndc.x * 0.5 + 0.5) * width - size.width - 16
        if (y < 12) y = 12
        if (y + size.height > height - 12) y = height - size.height - 12
        if (x < 12) x = 12
      }
      node.style.display = 'block'
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`
      return true
    }
    const pickPoint = new Vector2()
    const hitAt = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pickPoint.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      const latest = simulationRef.current
      fillHorizonMatrix(new Date(latest.utcMillis), latest.observer, horizonMat)
      const minScreenSize = Math.max(1, Math.min(rect.width, rect.height))
      const ndcRadiusForPixels = (pixels: number) => pixels * 2 / minScreenSize
      const pickBody = () => {
        if (!latest.layers.bodies) return null
        let best: { id: string; name: string; magnitude: number; altitude: number; azimuth: number; distance: number } | null = null
        for (const item of bodiesAt(latest.utcMillis)) {
          if (!latest.layers.showBelowHorizon && item.altitude < -3) continue
          const ndc = projectSkyToNdc(horizontalVector(item.altitude, item.azimuth), camera, latest.fov, camera.aspect)
          if (!ndc) continue
          const distance = Math.hypot(ndc.x - pickPoint.x, ndc.y - pickPoint.y)
          const appearance = bodyAppearance[item.id]
          const radius = ndcRadiusForPixels((appearance?.size ?? 8) * renderer.getPixelRatio() + 10)
          if (distance > radius || (best && distance >= best.distance)) continue
          best = { ...item, distance }
        }
        return best
          ? { id: best.id, name: best.name, type: 'body' as const, magnitude: best.magnitude, altitude: best.altitude, azimuth: best.azimuth }
          : null
      }
      if (!latest.layers.stars) return pickBody()
      const limit = countStarsThroughMagnitude(latest.magnitudeLimit)
      let best: { star: Star; altitude: number; azimuth: number; distance: number } | null = null
      for (let index = 0; index < limit; index += 1) {
        const star = stars[index]
        const horizonDir = applyHorizonMatrixInto(equatorialUnit(star.raHours, star.decDeg), horizonMat, horizonScratch)
        if (!latest.layers.showBelowHorizon && horizonDir.y < -0.05) continue
        const ndc = projectSkyToNdc(projected.set(horizonDir.x, horizonDir.y, horizonDir.z), camera, latest.fov, camera.aspect)
        if (!ndc) continue
        const distance = Math.hypot(ndc.x - pickPoint.x, ndc.y - pickPoint.y)
        const brightness = Math.max(0, Math.min(1, (3.1 - star.magnitude) / 4.6))
        const size = 9 + brightness * 44
        const radius = ndcRadiusForPixels(size * renderer.getPixelRatio() * 0.65 + 8)
        if (distance > radius || (best && distance >= best.distance)) continue
        best = {
          star,
          altitude: Math.asin(Math.max(-1, Math.min(1, horizonDir.y))) * 180 / Math.PI,
          azimuth: (Math.atan2(horizonDir.x, horizonDir.z) * 180 / Math.PI + 360) % 360,
          distance,
        }
      }
      if (best) {
        return {
          id: best.star.id,
          name: best.star.name,
          type: 'star' as const,
          magnitude: best.star.magnitude,
          constellation: best.star.constellation,
          altitude: best.altitude,
          azimuth: best.azimuth,
        }
      }
      if (!latest.layers.bodies) return null
      return pickBody()
    }
    const onPointerDown = (event: PointerEvent) => {
      renderer.domElement.setPointerCapture(event.pointerId)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const latest = simulationRef.current
      if (pointers.size >= 2) {
        drag = null
        pinch = { distance: Math.max(pointerDistance(), 1), fov: latest.fov }
        return
      }
      drag = { x: event.clientX, y: event.clientY, azimuth: latest.azimuth, altitude: latest.altitude, moved: false }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pinch && pointers.size >= 2) {
        hideHover()
        const latest = simulationRef.current
        const distance = Math.max(pointerDistance(), 1)
        emitView({
          azimuth: latest.azimuth,
          altitude: latest.altitude,
          fov: clampSkyFov(pinch.fov * (pinch.distance / distance)),
        })
        return
      }
      if (drag) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) drag.moved = true
        if (!drag.moved) return
        hideHover()
        emitView({
          azimuth: (drag.azimuth - (event.clientX - drag.x) * 0.22 + 360) % 360,
          altitude: Math.max(-30, Math.min(89, drag.altitude + (event.clientY - drag.y) * 0.16)),
          fov: simulationRef.current.fov,
        })
        return
      }
      const hit = hitAt(event.clientX, event.clientY)
      if (hit && hoverNode) {
        hoverTarget = { id: hit.id, name: hit.name, type: hit.type }
        hoverNode.textContent = hit.name
        renderer.domElement.style.cursor = 'pointer'
        const pose = poseOf(hit)
        if (pose) placeOverlay(hoverNode, pose.altitude, pose.azimuth, 14, -18)
      } else hideHover()
    }
    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size < 2) pinch = null
      if (drag && !drag.moved && pointers.size === 0) {
        const hit = hitAt(event.clientX, event.clientY)
        callbacksRef.current.onSelect(hit)
      }
      if (drag?.moved && pointers.size === 0) {
        const latest = simulationRef.current
        emitView({ azimuth: latest.azimuth, altitude: latest.altitude, fov: latest.fov }, true)
      }
      if (pointers.size === 0) drag = null
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
    }
    const onPointerLeave = () => {
      if (!drag) hideHover()
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const latest = simulationRef.current
      emitView({
        azimuth: latest.azimuth,
        altitude: latest.altitude,
        fov: clampSkyFov(latest.fov * Math.exp(event.deltaY * 0.0016)),
      }, true)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const latest = simulationRef.current
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        emitView({
          azimuth: (latest.azimuth + (event.key === 'ArrowLeft' ? 6 : -6) + 360) % 360,
          altitude: latest.altitude,
          fov: latest.fov,
        }, true)
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        emitView({
          azimuth: latest.azimuth,
          altitude: Math.max(-30, Math.min(89, latest.altitude + (event.key === 'ArrowUp' ? 4 : -4))),
          fov: latest.fov,
        }, true)
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        emitView({ ...latest, fov: clampSkyFov(latest.fov * 0.9) }, true)
      } else if (event.key === '-') {
        event.preventDefault()
        emitView({ ...latest, fov: clampSkyFov(latest.fov * 1.1) }, true)
      }
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    renderer.domElement.addEventListener('keydown', onKeyDown)

    const lookTarget = new Vector3()
    const projected = new Vector3()
    let lastFrameAt = performance.now()
    const recentFrameTimes: number[] = []
    let running = true
    let frame = 0
    const render = () => {
      if (!running) return
      if (document.hidden) {
        frame = requestAnimationFrame(render)
        return
      }
      const frameStartedAt = performance.now()
      const latest = simulationRef.current
      requestBodySnapshot(frameStartedAt, latest)
      const date = new Date(latest.utcMillis)
      fillHorizonMatrix(date, latest.observer, horizonMat)
      showBelowUniform.value = latest.layers.showBelowHorizon ? 1 : 0
      const bodySnapshots = bodiesAt(latest.utcMillis)
      const sunAltitude = bodySnapshots.find((body) => body.id === 'sun')?.altitude ?? -18
      daylightUniform.value = latest.layers.daylightEffect ? Math.min(1, Math.max(0, (sunAltitude + 12) / 18)) : 0
      skyUniforms.uFov.value = latest.fov * Math.PI / 180
      starMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio()
      starGeometry.setDrawRange(0, countStarsThroughMagnitude(latest.magnitudeLimit))
      starPoints.visible = latest.layers.stars
      milkyWay.visible = latest.layers.milkyWay
      linesGroup.children.forEach((child) => {
        const kind = child.userData.kind
        child.visible = kind === 'constellation' ? latest.layers.constellationLines
          : kind === 'equatorialGrid' ? latest.layers.equatorialGrid
          : kind === 'horizontalGrid' ? latest.layers.horizontalGrid
          : child.visible
      })

      const viewAltitude = latest.altitude * Math.PI / 180
      const viewAzimuth = latest.azimuth * Math.PI / 180
      lookTarget.set(
        Math.cos(viewAltitude) * Math.sin(viewAzimuth),
        Math.sin(viewAltitude),
        Math.cos(viewAltitude) * Math.cos(viewAzimuth),
      )
      camera.lookAt(lookTarget)
      camera.updateMatrixWorld()

      const width = renderer.domElement.clientWidth
      const height = renderer.domElement.clientHeight
      cardinals.forEach((cardinal) => {
        const node = cardinalRefs.current[cardinal.id]
        if (!node) return
        const ndc = projectSkyToNdc(horizontalVector(3.5, cardinal.azimuth), camera, latest.fov, camera.aspect)
        const onScreen = Boolean(ndc && Math.abs(ndc.x) < 1.2 && Math.abs(ndc.y) < 1.2)
        node.style.display = onScreen ? 'block' : 'none'
        if (!ndc || !onScreen) return
        node.style.transform = `translate3d(${(ndc.x * 0.5 + 0.5) * width}px, ${(-ndc.y * 0.5 + 0.5) * height}px, 0)`
      })

      constellationAnchors.forEach((anchor) => {
        const node = constellationNameRefs.current[anchor.name]
        if (!node) return
        const show = latest.layers.constellationNames && latest.layers.constellationLines
        if (!show) {
          node.style.display = 'none'
          return
        }
        applyHorizonMatrixInto(anchor, horizonMat, horizonScratch)
        if (horizonScratch.y < 0.07) {
          node.style.display = 'none'
          return
        }
        const ndc = projectSkyToNdc(projected.set(horizonScratch.x, horizonScratch.y, horizonScratch.z), camera, latest.fov, camera.aspect)
        const onScreen = Boolean(ndc && Math.abs(ndc.x) < 1.05 && Math.abs(ndc.y) < 1.05)
        node.style.display = onScreen ? 'block' : 'none'
        if (!ndc || !onScreen) return
        node.style.transform = `translate3d(${(ndc.x * 0.5 + 0.5) * width}px, ${(-ndc.y * 0.5 + 0.5) * height}px, 0)`
      })

      if (hoverNode && hoverTarget) {
        if (selectedRef.current?.id === hoverTarget.id) hoverNode.style.display = 'none'
        else {
          const pose = poseOf(hoverTarget)
          if (pose) placeOverlay(hoverNode, pose.altitude, pose.azimuth, 14, -18)
        }
      }
      const card = objectCardRef?.current
      const currentSelected = selectedRef.current
      if (card) {
        if (card !== activeCard) {
          activeCard = card
          altitudeStatNode = card.querySelector('[data-stat="altitude"]')
          azimuthStatNode = card.querySelector('[data-stat="azimuth"]')
        }
        if (!currentSelected) card.style.display = 'none'
        else {
          const pose = poseOf(currentSelected)
          if (pose) {
            if (altitudeStatNode) altitudeStatNode.textContent = `${pose.altitude.toFixed(1)}°`
            if (azimuthStatNode) azimuthStatNode.textContent = `${pose.azimuth.toFixed(1)}°`
            placeOverlay(card, pose.altitude, pose.azimuth, 18, -36, { width: card.offsetWidth, height: card.offsetHeight })
          } else card.style.display = 'none'
        }
      }

      helperGroup.visible = latest.layers.horizon || latest.layers.ecliptic || latest.layers.celestialEquator
      horizon.visible = latest.layers.horizon
      horizonGlow.visible = latest.layers.horizon
      ground.visible = latest.layers.horizon
      ecliptic.visible = latest.layers.ecliptic
      equator.visible = latest.layers.celestialEquator

      if (latest.layers.bodies) {
        bodySnapshots.forEach((body) => {
          const appearance = bodyAppearance[body.id]
          if (!appearance) return
          let bodyMesh = bodyMeshes.get(body.id)
          if (!bodyMesh) {
            bodyMesh = new Mesh(
              new SphereGeometry(appearance.size / 1000, 16, 16),
              makeBodyMaterial(appearance.color),
            )
            bodyMeshes.set(body.id, bodyMesh)
            bodiesGroup.add(bodyMesh)
          }
          applyHorizonMatrixInto(equatorialUnit(body.raHours, body.decDeg), horizonMat, horizonScratch)
          bodyMesh.position.set(horizonScratch.x, horizonScratch.y, horizonScratch.z)
          const magScale = Math.max(0.42, Math.min(2.1, (2.6 - body.magnitude) / 5.2))
          bodyMesh.scale.setScalar(magScale)
          bodyMesh.visible = horizonScratch.y >= -0.12 || latest.layers.showBelowHorizon
          ;(bodyMesh.material as MeshBasicMaterial).opacity = horizonScratch.y > 0 ? 1 : 0.25
        })
      }
      bodiesGroup.visible = latest.layers.bodies

      renderer.render(scene, camera)
      renderer.domElement.dataset.visibleStars = String(countStarsThroughMagnitude(latest.magnitudeLimit))
      recentFrameTimes.push(frameStartedAt - lastFrameAt)
      if (recentFrameTimes.length > 45) recentFrameTimes.shift()
      lastFrameAt = frameStartedAt
      if (recentFrameTimes.length === 45) {
        const averageFrame = recentFrameTimes.reduce((sum, value) => sum + value, 0) / recentFrameTimes.length
        const nextPixelRatio = averageFrame > 22 ? 1 : averageFrame < 17 ? Math.min(window.devicePixelRatio, 1.5) : qualityPixelRatio
        if (nextPixelRatio !== qualityPixelRatio) {
          qualityPixelRatio = nextPixelRatio
          renderer.setPixelRatio(qualityPixelRatio)
          resize()
        }
      }
      if (running) frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      renderer.domElement.removeEventListener('wheel', onWheel)
      renderer.domElement.removeEventListener('keydown', onKeyDown)
      worker.terminate()
      starGeometry.dispose()
      starMaterial.dispose()
      milkyWay.geometry.dispose()
      milkyMaterial.dispose()
      linesGroup.children.forEach((child) => {
        const line = child as Line
        line.geometry.dispose()
      })
      constellationLineMaterial.dispose()
      equatorialGridMaterial.dispose()
      horizontalGridMaterial.dispose()
      ecliptic.geometry.dispose()
      ;(ecliptic.material as ShaderMaterial).dispose()
      equator.geometry.dispose()
      ;(equator.material as ShaderMaterial).dispose()
      horizon.geometry.dispose()
      ;(horizon.material as ShaderMaterial).dispose()
      horizonGlow.geometry.dispose()
      ;(horizonGlow.material as ShaderMaterial).dispose()
      ground.geometry.dispose()
      groundMaterial.dispose()
      bodyMeshes.forEach((mesh) => {
        mesh.geometry.dispose()
        ;(mesh.material as MeshBasicMaterial).dispose()
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [catalog, constellationAnchors, constellationStars, objectCardRef, simulationRef])

  return (
    <div className={`sky-viewport ${viewportError?.code === 'webgl' ? 'is-fallback' : ''}`} ref={mountRef}>
      {viewportError && (
        <ErrorPanel
          error={viewportError}
          onRetry={viewportError.code === 'worker' ? () => setViewportError(null) : undefined}
        />
      )}
      <div className="star-hover" ref={hoverRef} />
      <div className="sky-grain" />
      <div className="sky-vignette" />
      {cardinals.map((cardinal) => (
        <div
          key={cardinal.id}
          className={`cardinal-label cardinal-${cardinal.id}`}
          ref={(node) => {
            cardinalRefs.current[cardinal.id] = node
          }}
        >
          {cardinal.label}
        </div>
      ))}
      {constellationStars.map((line) => (
        <div
          key={line.name}
          className="constellation-name"
          ref={(node) => {
            constellationNameRefs.current[line.name] = node
          }}
        >
          {line.name}
        </div>
      ))}
      {children}
    </div>
  )
}
