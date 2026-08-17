export type CatalogFile = {
  name: string
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

async function digestHex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export class CatalogService {
  constructor(private readonly root = '/data/v1') {}

  async loadCoreCatalog(signal?: AbortSignal): Promise<CatalogBuffer> {
    const manifestResponse = await fetch(`${this.root}/manifest.json`, { signal, cache: 'no-cache' })
    if (!manifestResponse.ok) throw new Error(`无法加载星表 manifest: ${manifestResponse.status}`)
    const manifest = await manifestResponse.json() as DataManifest
    const file = manifest.files[0]
    if (!file || file.layout.type !== 'float32-soa') throw new Error('星表格式不受支持')

    const catalogResponse = await fetch(`${this.root}/${file.name}`, { signal, cache: 'force-cache' })
    if (!catalogResponse.ok) throw new Error(`无法加载核心星表: ${catalogResponse.status}`)
    const buffer = await catalogResponse.arrayBuffer()
    if (buffer.byteLength !== file.byteLength) throw new Error('星表长度校验失败')
    if (await digestHex(buffer) !== file.sha256) throw new Error('星表 SHA-256 校验失败')
    return { manifest, file, values: new Float32Array(buffer) }
  }
}

export const catalogService = new CatalogService()
