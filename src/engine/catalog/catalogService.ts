/** 加载 manifest + 二进制星表：校验长度/SHA-256/条数，解析为按视星等排序的运行时目录。 */
import type { Star } from '@/shared/types/star'
import { countStarsThroughMagnitude } from '@/shared/types/star'
import { AppError, isAbortError, isAppError, toAppError } from '@/shared/errors/appError'

function catalogError(message: string, cause?: unknown, params?: Record<string, string | number>) {
  return new AppError('catalog', message, { cause, retryable: true, params })
}

async function fetchCatalog(url: string, init: RequestInit) {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (isAbortError(error)) throw error
    throw catalogError('error.catalog.unreachable', error)
  }
}

export type CatalogFile = {
  name: string
  indexName: string
  byteLength: number
  sha256: string
  count: number
  layout: { type: 'float32-soa'; fields: string[]; floatsPerRecord: number }
}

export type DataManifest = {
  schemaVersion: number
  catalogVersion: string
  generatedAt: string
  production: boolean
  source: string
  files: CatalogFile[]
}

export type CatalogBuffer = {
  manifest: DataManifest
  file: CatalogFile
  values: Float32Array
}

export type CatalogIndexEntry = {
  id: string
  name: string
  nameEn: string
  constellation: string
  color: string
  index: number
}

/** 运行时星表：按视星等排序的恒星数组 + id 索引。 */
export type RuntimeCatalog = {
  manifest: DataManifest
  stars: Star[]
  starById: Map<string, Star>
  countStarsThroughMagnitude: (limit: number) => number
}

async function digestHex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

/** 从 /data/v1 拉星表并解析成 RuntimeCatalog。 */
export class CatalogService {
  constructor(private readonly root = '/data/v1') {}

  /** 拉 manifest + bin，校验长度和 SHA-256，还不解析恒星记录。 */
  async loadCoreCatalogBuffer(signal?: AbortSignal): Promise<CatalogBuffer> {
    const manifestResponse = await fetchCatalog(`${this.root}/manifest.json`, { signal, cache: 'no-cache' })
    if (!manifestResponse.ok) throw catalogError('error.catalog.manifestHttp', undefined, { status: manifestResponse.status })
    const manifest = await manifestResponse.json() as DataManifest
    const file = manifest.files.at(0)
    if (!file || file.layout.type !== 'float32-soa') throw catalogError('error.catalog.unsupported')

    const version = encodeURIComponent(manifest.catalogVersion)
    const catalogResponse = await fetchCatalog(`${this.root}/${file.name}?v=${version}`, { signal, cache: 'force-cache' })
    if (!catalogResponse.ok) throw catalogError('error.catalog.coreHttp', undefined, { status: catalogResponse.status })
    const buffer = await catalogResponse.arrayBuffer()
    if (buffer.byteLength !== file.byteLength) throw catalogError('error.catalog.length')
    if (await digestHex(buffer) !== file.sha256) throw catalogError('error.catalog.integrity')
    return { manifest, file, values: new Float32Array(buffer) }
  }

  /** 解析 index.json，合成按视星等排序的 RuntimeCatalog。 */
  async loadCoreCatalog(signal?: AbortSignal): Promise<RuntimeCatalog> {
    try {
      return await this.readCoreCatalog(signal)
    } catch (error) {
      if (isAbortError(error) || isAppError(error)) throw error
      throw toAppError(error, 'catalog')
    }
  }

  private async readCoreCatalog(signal?: AbortSignal): Promise<RuntimeCatalog> {
    const { manifest, file, values } = await this.loadCoreCatalogBuffer(signal)
    const version = encodeURIComponent(manifest.catalogVersion)
    const indexResponse = await fetchCatalog(`${this.root}/${file.indexName}?v=${version}`, { signal, cache: 'force-cache' })
    if (!indexResponse.ok) throw catalogError('error.catalog.indexHttp', undefined, { status: indexResponse.status })
    const index = await indexResponse.json() as CatalogIndexEntry[]
    if (!Array.isArray(index) || index.length !== file.count) throw catalogError('error.catalog.indexCount')
    if (values.length !== file.count * file.layout.floatsPerRecord) throw catalogError('error.catalog.recordCount')

    const stars = index.map((entry) => {
      const offset = entry.index * file.layout.floatsPerRecord
      if (!entry.id || !entry.name || !entry.nameEn || !Number.isInteger(entry.index) || offset < 0 || offset >= values.length) {
        throw catalogError('error.catalog.indexEntry')
      }
      return {
        id: entry.id,
        names: { zh: entry.name, en: entry.nameEn },
        constellationId: entry.constellation,
        color: entry.color,
        raHours: values[offset],
        decDeg: values[offset + 1],
        magnitude: values[offset + 2],
      }
    }).toSorted((a, b) => a.magnitude - b.magnitude)
    const starById = new Map(stars.map((star) => [star.id, star]))
    return {
      manifest,
      stars,
      starById,
      countStarsThroughMagnitude: (limit: number) => countStarsThroughMagnitude(stars, limit),
    }
  }
}

export const catalogService = new CatalogService()
