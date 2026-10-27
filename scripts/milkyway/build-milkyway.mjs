// 从 HYG 星表烘焙全天空银河亮度纹理（银道坐标 equirect）。
//
// 亮度模型：把每颗未解析恒星的光通量按银道坐标累计到等距圆柱网格，
// 再做高斯平滑模拟"肉眼无法分辨单颗暗星"的连续发光效果。
// 结果纹理只保留大尺度结构（亮带、核球、大暗隙），细部絮状感仍由着色器 fbm 提供。
//
// 用法：pnpm milkyway:dev
// 输出：public/data/dev/milkyway.png + milkyway.json（元数据）
//
// 数据来源 HYG Database（CC BY-SA 4.0），属于门禁候选源：
// 在 data/licenses/catalog-sources.json 完成书面核验前不得进入生产构建。
import { createHash } from 'node:crypto'
import { deflateSync, gunzipSync } from 'node:zlib'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const WIDTH = 1024
const HEIGHT = 512
// 各向异性平滑：横向（沿银道）少一点保结构，纵向（垂直银道）多一点补密度。
const SMOOTH_SIGMA_X_PX = 3.0
const SMOOTH_SIGMA_Y_PX = 4.5
// 亮于该星等的恒星不参与烘焙：它们已由恒星点精灵单独绘制。
const MIN_BAKED_MAG = 2.5
const MAX_BAKED_MAG = 10.2
// 单星贡献封顶 + 密度底噪：通量项画出亮带亮度，底噪项让"星数密度"
// 也参与成像——大暗隙（尘埃带挡住后方恒星）因此能在纹理里显形。
const FLUX_CAP_MAG = 6.0
const DENSITY_FLOOR_WEIGHT = 0.0002
// 归一化用高分位数而不是最大值，避免个别星云/星团尖峰压暗整条带。
const NORMALIZE_PERCENTILE = 0.99
const TONE_GAMMA = 0.68
// 黑场：低于该归一化强度的背景噪声清零，保持非银道区干净。
const BLACK_POINT = 0.12
// 强平滑"带底光"层在混合中的权重。
const BROAD_WEIGHT = 0.55
const SOURCE_URL = 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/v3/hyg_v36_1.csv.gz'

const archiveGz = resolve(root, 'data/milkyway/hyg_v36_1.csv.gz')
const outputDir = resolve(root, 'public/data/dev')

// 与运行时同一套银道基向量（见 astroConstants 与 milkyWayLayer），
// 保证纹理坐标约定和着色器里的 (l, b) 完全一致。
const DEG_PER_HOUR = 15
const NORTH_GALACTIC_POLE = { raHours: 12.857298, decDeg: 27.12825 }
const GALACTIC_CENTER = { raHours: 17.760333, decDeg: -28.936175 }

function equatorialUnit(raHours, decDeg) {
  const ra = (raHours * DEG_PER_HOUR * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  return {
    x: Math.cos(dec) * Math.cos(ra),
    y: Math.cos(dec) * Math.sin(ra),
    z: Math.sin(dec),
  }
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y, v.z)
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

const galZ = normalize(equatorialUnit(NORTH_GALACTIC_POLE.raHours, NORTH_GALACTIC_POLE.decDeg))
const gcFull = equatorialUnit(GALACTIC_CENTER.raHours, GALACTIC_CENTER.decDeg)
const gcOrtho = { x: gcFull.x - galZ.x * dot(gcFull, galZ), y: gcFull.y - galZ.y * dot(gcFull, galZ), z: gcFull.z - galZ.z * dot(gcFull, galZ) }
const galX = normalize(gcOrtho)
const galY = cross(galZ, galX)

async function loadStars() {
  const gz = await readFile(archiveGz)
  const csv = gunzipSync(gz).toString('utf8')
  const lines = csv.split('\n')
  const header = lines[0].split(',')
  const col = Object.fromEntries(header.map((name, index) => [name, index]))
  const stars = []
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line) continue
    const f = line.split(',')
    const raHours = Number.parseFloat(f[col.ra])
    const decDeg = Number.parseFloat(f[col.dec])
    const mag = Number.parseFloat(f[col.mag])
    const ci = f[col.ci] ? Number.parseFloat(f[col.ci]) : Number.NaN
    if (!Number.isFinite(raHours) || !Number.isFinite(decDeg) || !Number.isFinite(mag)) continue
    if (mag < MIN_BAKED_MAG || mag > MAX_BAKED_MAG) continue
    stars.push({ raDeg: raHours * DEG_PER_HOUR, decDeg, mag, ci: Number.isFinite(ci) ? ci : 0.9 })
  }
  return stars
}

function accumulate(stars) {
  const flux = new Float64Array(WIDTH * HEIGHT)
  const ciSum = new Float64Array(WIDTH * HEIGHT)
  for (const star of stars) {
    const raRad = (star.raDeg * Math.PI) / 180
    const decRad = (star.decDeg * Math.PI) / 180
    const v = { x: Math.cos(decRad) * Math.cos(raRad), y: Math.cos(decRad) * Math.sin(raRad), z: Math.sin(decRad) }
    const gx = dot(v, galX)
    const gy = dot(v, galY)
    const gz = dot(v, galZ)
    const l = Math.atan2(gy, gx)
    const b = Math.asin(Math.max(-1, Math.min(1, gz)))
    const lDeg = (l * 180) / Math.PI
    const bDeg = (b * 180) / Math.PI
    // 像素中心约定：u = (l+180)/360，v = (90-b)/180（顶部 b=+90）
    const px = ((lDeg + 180) / 360) * WIDTH - 0.5
    const py = ((90 - bDeg) / 180) * HEIGHT - 0.5
    const x0 = Math.floor(px)
    const y0 = Math.floor(py)
    const tx = px - x0
    const ty = py - y0
    const weight = 10 ** (-0.4 * Math.max(star.mag, FLUX_CAP_MAG)) + DENSITY_FLOOR_WEIGHT
    for (let dy = 0; dy <= 1; dy += 1) {
      const y = y0 + dy
      if (y < 0 || y >= HEIGHT) continue
      const wy = dy === 0 ? 1 - ty : ty
      for (let dx = 0; dx <= 1; dx += 1) {
        const x = ((x0 + dx) % WIDTH + WIDTH) % WIDTH
        const wx = dx === 0 ? 1 - tx : tx
        const index = y * WIDTH + x
        flux[index] += weight * wx * wy
        ciSum[index] += weight * wx * wy * star.ci
      }
    }
  }
  return { flux, ciSum }
}

function gaussianKernel(sigma) {
  const radius = Math.ceil(sigma * 3)
  const kernel = new Float64Array(radius * 2 + 1)
  let sum = 0
  for (let i = -radius; i <= radius; i += 1) {
    const value = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel[i + radius] = value
    sum += value
  }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] /= sum
  return kernel
}

/** 各向异性高斯平滑：横向（沿银道）环绕，纵向（垂直银道）钳制边界。 */
function smooth(field, kernelX, kernelY) {
  const tmp = new Float64Array(WIDTH * HEIGHT)
  const rx = (kernelX.length - 1) / 2
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      let sum = 0
      for (let k = -rx; k <= rx; k += 1) {
        sum += field[y * WIDTH + ((x + k) % WIDTH + WIDTH) % WIDTH] * kernelX[k + rx]
      }
      tmp[y * WIDTH + x] = sum
    }
  }
  const out = new Float64Array(WIDTH * HEIGHT)
  const ry = (kernelY.length - 1) / 2
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      let sum = 0
      for (let k = -ry; k <= ry; k += 1) {
        const yy = Math.min(HEIGHT - 1, Math.max(0, y + k))
        sum += tmp[yy * WIDTH + x] * kernelY[k + ry]
      }
      out[y * WIDTH + x] = sum
    }
  }
  return out
}

/** 灰度强度 → RGB：高分位数归一 + gamma 压缩，色调由色指数给出（核球偏暖）。 */
function toneMap(flux, ciSum) {
  const sorted = Float64Array.from(flux).sort()
  const norm = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * NORMALIZE_PERCENTILE))] || 1
  const data = new Uint8Array(WIDTH * HEIGHT * 3)
  let used = 0
  for (let i = 0; i < flux.length; i += 1) {
    const v = Math.min(1, Math.max(0, (flux[i] / norm - BLACK_POINT) / (1 - BLACK_POINT)))
    const value = v <= 0 ? 0 : Math.min(255, Math.round(255 * v ** TONE_GAMMA))
    if (value > 6) used += 1
    const meanCi = flux[i] > 0 ? ciSum[i] / flux[i] : 0.9
    const t = Math.max(0, Math.min(1, (meanCi + 0.2) / 1.6))
    // 冷灰蓝 → 暖黄白
    const r = 0.74 + 0.26 * t
    const g = 0.84 - 0.05 * t
    const b = 1.0 - 0.34 * t
    data[i * 3] = Math.round(value * r)
    data[i * 3 + 1] = Math.round(value * g)
    data[i * 3 + 2] = Math.round(value * b)
  }
  return { data, norm, used }
}

// ---- 最小 PNG 编码器（8-bit RGB，filter 0）----
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, payload) {
  const out = Buffer.alloc(8 + payload.length + 4)
  out.writeUInt32BE(payload.length, 0)
  out.write(type, 4, 'ascii')
  payload.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + payload.length)), 8 + payload.length)
  return out
}

function encodePng(data, width, height) {
  const raw = Buffer.alloc(height * (width * 3 + 1))
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0
    Buffer.from(data.buffer, y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const stars = await loadStars()
console.log(`HYG 恒星：${stars.length} 颗参与烘焙（${MIN_BAKED_MAG} ≤ mag ≤ ${MAX_BAKED_MAG}）`)
const { flux, ciSum } = accumulate(stars)
// 两层平滑：紧凑层保结构（星云团、暗隙），强平滑层当连续的"带底光"，
// 混合后银河读作一条连续亮带而不是碎块。
const compact = smooth(flux, gaussianKernel(SMOOTH_SIGMA_X_PX), gaussianKernel(SMOOTH_SIGMA_Y_PX))
const broad = smooth(compact, gaussianKernel(SMOOTH_SIGMA_X_PX * 3), gaussianKernel(SMOOTH_SIGMA_Y_PX * 3))
const smoothed = broad.map((v, i) => v * BROAD_WEIGHT + compact[i] * (1 - BROAD_WEIGHT))
const { data, norm, used } = toneMap(smoothed, ciSum)
console.log(`网格：${WIDTH}×${HEIGHT}，归一化通量 ${norm.toExponential(3)}，非零像素 ${(used / (WIDTH * HEIGHT) * 100).toFixed(1)}%`)

await mkdir(outputDir, { recursive: true })
const png = encodePng(data, WIDTH, HEIGHT)
const pngPath = resolve(outputDir, 'milkyway.png')
await writeFile(pngPath, png)
const meta = {
  schemaVersion: 1,
  width: WIDTH,
  height: HEIGHT,
  generatedAt: new Date().toISOString(),
  smoothingSigmaPx: [SMOOTH_SIGMA_X_PX, SMOOTH_SIGMA_Y_PX],
  starCount: stars.length,
  magnitudeRange: [MIN_BAKED_MAG, MAX_BAKED_MAG],
  source: {
    id: 'hyg-v36-1',
    name: 'HYG Database v3.6.1',
    license: 'CC BY-SA 4.0',
    url: SOURCE_URL,
    sha256: createHash('sha256').update(await readFile(archiveGz)).digest('hex'),
  },
  textureSha256: createHash('sha256').update(png).digest('hex'),
}
await writeFile(resolve(outputDir, 'milkyway.json'), `${JSON.stringify(meta, null, 2)}\n`)
const size = (await stat(pngPath)).size
console.log(`已写出 ${pngPath}（${(size / 1024).toFixed(1)} KB）与 milkyway.json`)
