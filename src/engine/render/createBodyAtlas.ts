/** 运行时画出 3×3 天体贴图（日、月、行星），避免带外部贴图授权。 */
import { ClampToEdgeWrapping, DataTexture, LinearFilter, RGBAFormat, UnsignedByteType } from 'three'

const CELL = 128
const GRID = 3
const SIZE = CELL * GRID

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function noise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy
}

function paintCell(data: Uint8Array, index: number, paint: (nx: number, ny: number) => [number, number, number]) {
  const col = index % GRID
  const row = Math.floor(index / GRID)
  const radius = CELL * 0.5 - 1
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      const nx = (x + 0.5 - CELL * 0.5) / radius
      const ny = (CELL * 0.5 - y - 0.5) / radius
      const rr = nx * nx + ny * ny
      const i = ((row * CELL + y) * SIZE + col * CELL + x) * 4
      if (rr > 1) {
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
        data[i + 3] = 0
        continue
      }
      const [r, g, b] = paint(nx, ny)
      data[i] = Math.max(0, Math.min(255, r))
      data[i + 1] = Math.max(0, Math.min(255, g))
      data[i + 2] = Math.max(0, Math.min(255, b))
      data[i + 3] = 255
    }
  }
}

export function createBodyAtlasTexture() {
  const data = new Uint8Array(SIZE * SIZE * 4)
  const painters: Array<(nx: number, ny: number) => [number, number, number]> = [
    (nx, ny) => {
      const n = noise(nx * 9, ny * 9)
      const core = 1 - Math.hypot(nx, ny) * 0.22
      return [255 * core, 186 + n * 40, 64 + n * 36]
    },
    (nx, ny) => {
      const crater = noise(nx * 16 + 2, ny * 16)
      let r = 228, g = 224, b = 214
      const maria = [
        [-0.32, -0.08, 0.36],
        [-0.08, -0.3, 0.24],
        [0.24, -0.12, 0.22],
        [0.1, 0.2, 0.18],
        [-0.44, 0.24, 0.16],
      ]
      for (const [mx, my, rad] of maria) {
        if (Math.hypot(nx - mx, ny - my) < rad) {
          r = 92
          g = 96
          b = 104
        }
      }
      const shade = 0.78 + crater * 0.28
      return [r * shade, g * shade, b * shade]
    },
    (nx, ny) => {
      const n = noise(nx * 22, ny * 22)
      return [168 + n * 50, 142 + n * 32, 118 + n * 22]
    },
    (nx, ny) => {
      const swirl = 0.5 + 0.5 * Math.sin(ny * 6 + nx * 3 + noise(nx * 4, ny * 5) * 2)
      return [248, 232 + swirl * 10, 186 + swirl * 16]
    },
    (nx, ny) => {
      const n = noise(nx * 8, ny * 8)
      const cap = ny < -0.68 || ny > 0.74 ? 1 : 0
      return [
        196 + n * 36 + cap * 50,
        78 + n * 18 + cap * 130,
        48 + n * 14 + cap * 140,
      ]
    },
    (nx, ny) => {
      const band = 0.5 + 0.5 * Math.sin(ny * 18 + noise(nx * 2, ny * 8) * 2.2)
      const spot = Math.hypot(nx - 0.32, ny - 0.14) < 0.16 ? 1 : 0
      return [
        228 + band * 22 - spot * 30,
        168 + band * 28 - spot * 95,
        108 + band * 12 - spot * 55,
      ]
    },
    (_nx, ny) => {
      const band = 0.5 + 0.5 * Math.sin(ny * 11)
      return [236, 196 + band * 28, 128 + band * 18]
    },
    (nx, ny) => {
      const n = noise(nx * 4, ny * 6)
      return [118 + n * 24, 204, 210]
    },
    (nx, ny) => {
      const spot = Math.hypot(nx + 0.22, ny - 0.1) < 0.18 ? 0.35 : 0
      return [70 - spot * 24, 110 - spot * 36, 214]
    },
  ]
  painters.forEach((paint, index) => paintCell(data, index, paint))
  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType)
  texture.flipY = true
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

export const BODY_ATLAS_SIZE = SIZE
export const BODY_ATLAS_CELL = CELL
