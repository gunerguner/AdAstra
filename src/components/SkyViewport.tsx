import { useEffect, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react'
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
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  AdditiveBlending,
  DoubleSide,
} from 'three'
import { constellationLines, countStarsThroughMagnitude, starById, stars } from '../data/catalog'
import type { BodySnapshot } from '../engine/astronomyService'
import {
  applyHorizonMatrixInto,
  eclipticEquatorialUnit,
  equatorialUnit,
  fillHorizonMatrix,
} from '../engine/skyMath'
import type { LayerState, SkySimulation } from '../engine/simulationState'
import {
  SKY_FOV_DEG,
  clampSkyFov,
  createSkyProjectionUniforms,
  patchSkyProjection,
  projectSkyToNdc,
  skyOutsideViewGlsl,
  skyProjectionGlsl,
  viewDirectionFromNdc,
} from '../engine/skyProjection'

export type { LayerState }

export type SelectedSkyObject = {
  name: string
  type: 'star' | 'body'
  magnitude?: number
  constellation?: string
  altitude: number
  azimuth: number
}

type Props = {
  simulationRef: MutableRefObject<SkySimulation>
  onViewChange: (view: { azimuth: number; altitude: number; fov: number }) => void
  onSelect: (item: SelectedSkyObject | null) => void
  selected?: SelectedSkyObject | null
  objectCardRef?: RefObject<HTMLElement | null>
  children?: ReactNode
  onWebglReady?: (mode: 'webgl2' | 'canvas') => void
}

const toVector = (point: { x: number; y: number; z: number }) => new Vector3(point.x, point.y, point.z)
const horizontalPoint = (altitude: number, azimuth: number) => {
  const alt = altitude * Math.PI / 180
  const az = azimuth * Math.PI / 180
  return new Vector3(Math.cos(alt) * Math.sin(az), Math.sin(alt), Math.cos(alt) * Math.cos(az))
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

const constellationStars = constellationLines.map((line) => ({
  name: line.name,
  segments: line.segments.map((segment) =>
    segment.map((id) => starById.get(id)).filter((star): star is NonNullable<typeof star> => Boolean(star)),
  ),
}))

const constellationAnchors = constellationStars.map((line) => {
  let x = 0
  let y = 0
  let z = 0
  let count = 0
  line.segments.forEach((segment) => {
    segment.forEach((star) => {
      const vector = equatorialUnit(star.raHours, star.decDeg)
      x += vector.x
      y += vector.y
      z += vector.z
      count += 1
    })
  })
  const length = Math.hypot(x, y, z) || 1
  return { name: line.name, x: x / length, y: y / length, z: z / length }
})

const densifyArc = (points: Vector3[]) => {
  if (points.length < 2) return points
  const out: Vector3[] = [points[0].clone().normalize()]
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index].clone().normalize()
    const b = points[index + 1].clone().normalize()
    const omega = a.angleTo(b)
    const steps = Math.max(1, Math.ceil(omega / (Math.PI / 36)))
    const sine = Math.sin(omega)
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps
      if (sine < 1e-5) out.push(b.clone())
      else {
        out.push(a.clone().multiplyScalar(Math.sin((1 - t) * omega) / sine).add(b.clone().multiplyScalar(Math.sin(t * omega) / sine)))
      }
    }
  }
  return out
}

export default function SkyViewport({ simulationRef, onViewChange, onSelect, selected, objectCardRef, children, onWebglReady }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HTMLDivElement>(null)
  const cardinalRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const constellationNameRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const bodySnapshotRef = useRef<BodySnapshot[]>([])
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const [status, setStatus] = useState<'ready' | 'fallback'>('ready')

  useEffect(() => {
    const worker = new Worker(new URL('../workers/astro.worker.ts', import.meta.url), { type: 'module' })
    let generation = 0
    let raf = 0
    let lastSentAt = 0
    worker.onmessage = (event: MessageEvent<{ generation: number; bodies: BodySnapshot[] }>) => {
      if (event.data.generation === generation) bodySnapshotRef.current = event.data.bodies
    }
    const requestSnapshot = (now: number) => {
      if (now - lastSentAt >= 120) {
        generation += 1
        lastSentAt = now
        const latest = simulationRef.current
        worker.postMessage({
          type: 'snapshot',
          generation,
          utcMillis: latest.utcMillis,
          observer: latest.observer,
        })
      }
      raf = requestAnimationFrame(requestSnapshot)
    }
    raf = requestAnimationFrame(requestSnapshot)
    return () => {
      cancelAnimationFrame(raf)
      worker.terminate()
    }
  }, [simulationRef])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' })
    } catch {
      setStatus('fallback')
      onWebglReady?.('canvas')
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
    mount.appendChild(renderer.domElement)
    onWebglReady?.(renderer.capabilities.isWebGL2 ? 'webgl2' : 'canvas')

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
          for (int i = 0; i < 5; i++) {
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
    const milkyWay = new Mesh(new SphereGeometry(1, 160, 96), milkyMaterial)
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
        const points = densifyArc(segment.map((star) => toVector(equatorialUnit(star.raHours, star.decDeg))))
        if (points.length > 1) {
          const mesh = new Line(new BufferGeometry().setFromPoints(points), constellationLineMaterial)
          mesh.frustumCulled = false
          mesh.userData.kind = 'constellation'
          linesGroup.add(mesh)
        }
      })
    })
    const addSkyLine = (points: Vector3[], kind: string, material: ShaderMaterial) => {
      const densified = densifyArc(points)
      if (densified.length < 2) return
      const mesh = new Line(new BufferGeometry().setFromPoints(densified), material)
      mesh.frustumCulled = false
      mesh.userData.kind = kind
      linesGroup.add(mesh)
    }
    ;[-60, -30, 0, 30, 60].forEach((dec) => {
      for (let start = 0; start < 360; start += 90) {
        addSkyLine(
          Array.from({ length: 19 }, (_, index) => toVector(equatorialUnit((start + index * 5) / 15, dec))),
          'equatorialGrid',
          equatorialGridMaterial,
        )
      }
    })
    for (let raHours = 0; raHours < 24; raHours += 2) {
      addSkyLine(
        [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75].map((dec) => toVector(equatorialUnit(raHours, dec))),
        'equatorialGrid',
        equatorialGridMaterial,
      )
    }
    ;[15, 30, 45, 60, 75].forEach((alt) => {
      for (let start = 0; start < 360; start += 90) {
        addSkyLine(
          Array.from({ length: 19 }, (_, index) => horizontalPoint(alt, start + index * 5)),
          'horizontalGrid',
          horizontalGridMaterial,
        )
      }
    })
    for (let az = 0; az < 360; az += 30) {
      addSkyLine(
        [2, 15, 30, 45, 60, 75, 88].map((alt) => horizontalPoint(alt, az)),
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
      new BufferGeometry().setFromPoints(Array.from({ length: 145 }, (_, index) => toVector(eclipticEquatorialUnit(index * 2.5)))),
      makeLine('#f0a03a', 0.92, true),
    )
    const equator = new Line(
      new BufferGeometry().setFromPoints(Array.from({ length: 145 }, (_, index) => toVector(equatorialUnit((index / 144) * 24, 0)))),
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
    const emitView = (next: { azimuth: number; altitude: number; fov: number }) => {
      simulationRef.current.azimuth = next.azimuth
      simulationRef.current.altitude = next.altitude
      simulationRef.current.fov = next.fov
      onViewChange(next)
    }
    const hoverNode = hoverRef.current
    let hoverTarget: { name: string; type: 'star' | 'body' } | null = null
    const hideHover = () => {
      hoverTarget = null
      if (hoverNode) hoverNode.style.display = 'none'
      renderer.domElement.style.cursor = ''
    }
    const poseOf = (item: { name: string; type: 'star' | 'body' }) => {
      if (item.type === 'body') {
        const body = bodySnapshotRef.current.find((entry) => entry.name === item.name)
        if (!body) return null
        applyHorizonMatrixInto(equatorialUnit(body.raHours, body.decDeg), horizonMat, horizonScratch)
        return {
          altitude: Math.asin(Math.max(-1, Math.min(1, horizonScratch.y))) * 180 / Math.PI,
          azimuth: (Math.atan2(horizonScratch.x, horizonScratch.z) * 180 / Math.PI + 360) % 360,
        }
      }
      const star = stars.find((entry) => entry.name === item.name)
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
      const ndc = projectSkyToNdc(horizontalPoint(altitude, azimuth), camera, simulationRef.current.fov, camera.aspect)
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
    const hitAt = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect()
      const pointer = new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      const fov = simulationRef.current.fov
      const look = viewDirectionFromNdc(pointer.x, pointer.y, fov, camera.aspect).applyQuaternion(camera.quaternion)
      const ray = new Raycaster(new Vector3(0, 0, 0), look)
      const latest = simulationRef.current
      fillHorizonMatrix(new Date(latest.utcMillis), latest.observer, horizonMat)
      const pickBody = () => {
        if (!latest.layers.bodies) return null
        const body = bodySnapshotRef.current
          .map((item) => {
            applyHorizonMatrixInto(equatorialUnit(item.raHours, item.decDeg), horizonMat, horizonScratch)
            return {
              item,
              altitude: Math.asin(Math.max(-1, Math.min(1, horizonScratch.y))) * 180 / Math.PI,
              azimuth: (Math.atan2(horizonScratch.x, horizonScratch.z) * 180 / Math.PI + 360) % 360,
              angle: ray.ray.direction.angleTo(new Vector3(horizonScratch.x, horizonScratch.y, horizonScratch.z)),
            }
          })
          .filter(({ altitude, angle, item }) => item.magnitude <= latest.magnitudeLimit && (latest.layers.horizon || altitude > -3) && angle < 0.08)
          .sort((a, b) => a.angle - b.angle)[0]
        return body
          ? { name: body.item.name, type: 'body' as const, magnitude: body.item.magnitude, altitude: body.altitude, azimuth: body.azimuth }
          : null
      }
      if (!latest.layers.stars) return pickBody()
      const limit = countStarsThroughMagnitude(latest.magnitudeLimit)
      const hits: { star: (typeof stars)[number]; altitude: number; azimuth: number; angle: number }[] = []
      for (let index = 0; index < limit; index += 1) {
        const star = stars[index]
        const horizon = applyHorizonMatrixInto(equatorialUnit(star.raHours, star.decDeg), horizonMat, horizonScratch)
        if (!latest.layers.horizon && horizon.y < -0.05) continue
        const angle = ray.ray.direction.angleTo(toVector(horizon))
        if (angle > 0.08) continue
        hits.push({
          star,
          altitude: Math.asin(Math.max(-1, Math.min(1, horizon.y))) * 180 / Math.PI,
          azimuth: (Math.atan2(horizon.x, horizon.z) * 180 / Math.PI + 360) % 360,
          angle,
        })
      }
      hits.sort((a, b) => {
        const namedDelta = Number(b.star.id.startsWith('fixture-')) - Number(a.star.id.startsWith('fixture-'))
        return namedDelta || a.angle - b.angle || a.star.magnitude - b.star.magnitude
      })
      const hit = hits[0]
      if (hit) {
        return {
          name: hit.star.name,
          type: 'star' as const,
          magnitude: hit.star.magnitude,
          constellation: hit.star.constellation,
          altitude: hit.altitude,
          azimuth: hit.azimuth,
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
        hoverTarget = { name: hit.name, type: hit.type }
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
        onSelect(hit)
      }
      if (pointers.size === 0) drag = null
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
      })
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

    const lookTarget = new Vector3()
    const projected = new Vector3()
    let lastFrameAt = performance.now()
    const recentFrameTimes: number[] = []
    let running = true
    const render = () => {
      if (!running) return
      const frameStartedAt = performance.now()
      const latest = simulationRef.current
      const date = new Date(latest.utcMillis)
      fillHorizonMatrix(date, latest.observer, horizonMat)
      showBelowUniform.value = latest.layers.horizon ? 1 : 0
      daylightUniform.value = latest.layers.daylightEffect ? 1 : 0
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
        const ndc = projectSkyToNdc(horizontalPoint(3.5, cardinal.azimuth), camera, latest.fov, camera.aspect)
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
        if (selectedRef.current?.name === hoverTarget.name) hoverNode.style.display = 'none'
        else {
          const pose = poseOf(hoverTarget)
          if (pose) placeOverlay(hoverNode, pose.altitude, pose.azimuth, 14, -18)
        }
      }
      const card = objectCardRef?.current
      const currentSelected = selectedRef.current
      if (card) {
        if (!currentSelected) card.style.display = 'none'
        else {
          const pose = poseOf(currentSelected)
          if (pose) {
            const altitudeNode = card.querySelector('[data-stat="altitude"]')
            const azimuthNode = card.querySelector('[data-stat="azimuth"]')
            if (altitudeNode) altitudeNode.textContent = `${pose.altitude.toFixed(1)}°`
            if (azimuthNode) azimuthNode.textContent = `${pose.azimuth.toFixed(1)}°`
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
        bodySnapshotRef.current.forEach((body) => {
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
          bodyMesh.visible = body.magnitude <= latest.magnitudeLimit && (horizonScratch.y >= -0.12 || latest.layers.horizon)
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
      requestAnimationFrame(render)
    }
    const frame = requestAnimationFrame(render)

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
  }, [onSelect, onViewChange, onWebglReady, simulationRef])

  return (
    <div className={`sky-viewport ${status === 'fallback' ? 'is-fallback' : ''}`} ref={mountRef}>
      {status === 'fallback' && <div className="canvas-fallback">需要 WebGL2</div>}
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
