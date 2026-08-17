import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CatalogService } from '../src/engine/catalogService'

const catalogBuffer = new Float32Array([6.75, -16.7, -1.46, 0, 0]).buffer
const sha256 = createHash('sha256').update(new Uint8Array(catalogBuffer)).digest('hex')

afterEach(() => vi.unstubAllGlobals())

describe('CatalogService', () => {
  it('校验二进制星表后按视星等排序并建立索引', async () => {
    const fetch = vi.fn(async (input: string) => {
      if (input.includes('manifest.json')) {
        return new Response(JSON.stringify({
          schemaVersion: 1,
          catalogVersion: 'fixture-test',
          generatedAt: '2024-01-01T00:00:00.000Z',
          production: false,
          source: 'fixture',
          files: [{
            name: 'core-stars.bin',
            indexName: 'core-stars.index.json',
            byteLength: catalogBuffer.byteLength,
            sha256,
            count: 1,
            layout: { type: 'float32-soa', fields: [], floatsPerRecord: 5 },
          }],
        }))
      }
      if (input.includes('index.json')) {
        return new Response(JSON.stringify([{
          id: 'sirius',
          name: '天狼星',
          constellation: '大犬座',
          color: '#c9e4ff',
          index: 0,
        }]))
      }
      return new Response(catalogBuffer)
    })
    vi.stubGlobal('fetch', fetch)

    const catalog = await new CatalogService('/data/v1').loadCoreCatalog()
    expect(catalog.stars).toHaveLength(1)
    expect(catalog.starById.get('sirius')?.name).toBe('天狼星')
    expect(catalog.countStarsThroughMagnitude(-1.5)).toBe(0)
    expect(catalog.countStarsThroughMagnitude(-1)).toBe(1)
  })

  it('把加载失败规范成可重试的 catalog 错误', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('missing', { status: 404 })))
    await expect(new CatalogService('/data/v1').loadCoreCatalog()).rejects.toMatchObject({
      name: 'AppError',
      code: 'catalog',
      retryable: true,
    })
  })
})
