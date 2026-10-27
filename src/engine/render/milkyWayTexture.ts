/**
 * 可选的真实银河纹理加载：/data/dev/milkyway.{json,png}。
 * 由 scripts/milkyway/build-milkyway.mjs 在本地烘焙生成（HYG 星表派生数据，
 * 见 data/licenses/catalog-sources.json 的门禁候选条目）。
 * 文件不存在（例如生产构建未含门禁外数据）时返回 null，银河退回程序噪声着色。
 */
import { ClampToEdgeWrapping, LinearFilter, RepeatWrapping, Texture } from 'three'
import { isAbortError } from '@/shared/errors/appError'

export type MilkyWayTextureMeta = {
  schemaVersion: number
  width: number
  height: number
  generatedAt: string
  source: { id: string; name: string; license: string; url: string }
}

export type MilkyWayTextureHandle = {
  promise: Promise<Texture | null>
  /** 中止加载；已完成的纹理不会因此被释放，由调用方随场景一起 dispose。 */
  cancel: () => void
}

/** 拉取烘焙元数据与 PNG，解码成 Three 纹理。任何失败都安静地回退到程序噪声。 */
export function beginMilkyWayTextureLoad(root = '/data/dev'): MilkyWayTextureHandle {
  const controller = new AbortController()
  const promise = (async () => {
    try {
      const metaResponse = await fetch(`${root}/milkyway.json`, { signal: controller.signal, cache: 'no-cache' })
      if (!metaResponse.ok) return null
      const meta = await metaResponse.json() as MilkyWayTextureMeta
      if (meta.schemaVersion !== 1 || !meta.width || !meta.height) return null
      const version = encodeURIComponent(meta.generatedAt)
      const imageResponse = await fetch(`${root}/milkyway.png?v=${version}`, { signal: controller.signal, cache: 'force-cache' })
      if (!imageResponse.ok) return null
      const blob = await imageResponse.blob()
      const bitmap = await createImageBitmap(blob)
      const texture = new Texture(bitmap)
      texture.wrapS = RepeatWrapping
      texture.wrapT = ClampToEdgeWrapping
      texture.minFilter = LinearFilter
      texture.magFilter = LinearFilter
      texture.generateMipmaps = false
      texture.needsUpdate = true
      return texture
    } catch (error) {
      if (isAbortError(error)) return null
      return null
    }
  })()
  return {
    promise,
    cancel: () => controller.abort(),
  }
}
