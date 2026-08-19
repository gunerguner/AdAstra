/** 加载 manifest + 二进制星表：校验长度/SHA-256/条数，解析为按视星等排序的运行时目录。 */
import type { Star } from '@/shared/types/star'
import { countStarsThroughMagnitude } from '@/shared/types/star'
import { AppError, isAbortError, isAppError, toAppError } from '@/shared/errors/appError'

function catalogError(message: string, cause?: unknown) {
  return new AppError('catalog', message, { cause, retryable: true })
}

async function fetchCatalog(url: string, init: RequestInit) {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (isAbortError(error)) throw error
    throw catalogError('无法连接星表服务', error)
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

export type CatalogIndexEntry = Pick<Star, 'id' | 'name' | 'constellation' | 'color'> & {
  index: number
}

export type RuntimeCatalog = {
  manifest: DataManifest
  stars: Star[]
  starById: Map<string, Star>
  countStarsThroughMagnitude: (limit: number) => number
}

async function digestHex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export class CatalogService {
  constructor(private readonly root = '/data/v1') {}

  async loadCoreCatalogBuffer(signal?: AbortSignal): Promise<CatalogBuffer> {
    const manifestResponse = await fetchCatalog(`${this.root}/manifest.json`, { signal, cache: 'no-cache' })
    if (!manifestResponse.ok) throw catalogError(`无法加载星表清单（${manifestResponse.status}）`)
    const manifest = await manifestResponse.json() as DataManifest
    const file = manifest.files[0]
    if (!file || file.layout.type !== 'float32-soa') throw catalogError('星表格式不受支持')

    const version = encodeURIComponent(manifest.catalogVersion)
    const catalogResponse = await fetchCatalog(`${this.root}/${file.name}?v=${version}`, { signal, cache: 'force-cache' })
    if (!catalogResponse.ok) throw catalogError(`无法加载核心星表（${catalogResponse.status}）`)
    const buffer = await catalogResponse.arrayBuffer()
    if (buffer.byteLength !== file.byteLength) throw catalogError('星表长度校验失败')
    if (await digestHex(buffer) !== file.sha256) throw catalogError('星表完整性校验失败')
    return { manifest, file, values: new Float32Array(buffer) }
  }

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
    if (!indexResponse.ok) throw catalogError(`无法加载星表索引（${indexResponse.status}）`)
    const index = await indexResponse.json() as CatalogIndexEntry[]
    if (!Array.isArray(index) || index.length !== file.count) throw catalogError('星表索引数量校验失败')
    if (values.length !== file.count * file.layout.floatsPerRecord) throw catalogError('星表记录数量校验失败')

    const stars = index.map((entry) => {
      const offset = entry.index * file.layout.floatsPerRecord
      if (!entry.id || !entry.name || !Number.isInteger(entry.index) || offset < 0 || offset >= values.length) {
        throw catalogError('星表索引记录无效')
      }
      return {
        id: entry.id,
        name: entry.name,
        constellation: entry.constellation,
        color: entry.color,
        raHours: values[offset],
        decDeg: values[offset + 1],
        magnitude: values[offset + 2],
      }
    }).sort((a, b) => a.magnitude - b.magnitude)
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
