import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse } from 'yaml'

const root = resolve(import.meta.dirname, '../..')
const sourcePath = resolve(root, 'src/data/stars.yaml')
const policyPath = resolve(root, 'data/licenses/catalog-sources.json')
const outputDir = resolve(root, 'public/data/v1')
const production = process.argv.includes('--production')

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

async function writeIfChanged(path, content) {
  const next = typeof content === 'string' ? Buffer.from(content) : Buffer.from(content)
  let current = null
  try {
    current = await readFile(path)
  } catch {
    // First build has no generated artifact yet.
  }
  if (current && current.equals(next)) return false
  await writeFile(path, next)
  return true
}

const policy = JSON.parse(await readFile(policyPath, 'utf8'))
if (production && !policy.productionAllowed) {
  throw new Error('生产星表构建已阻止：data/licenses/catalog-sources.json 未给出完整书面授权结论。')
}

const source = parse(await readFile(sourcePath, 'utf8'))
if (!source || !Array.isArray(source.stars)) throw new Error('开发星表格式无效')
const ids = new Set()
const rows = source.stars
  .map((row) => ({
    id: String(row.id),
    name: String(row.name),
    constellation: String(row.constellation),
    color: String(row.color),
    raHours: Number(row.raHours),
    decDeg: Number(row.decDeg),
    magnitude: Number(row.magnitude),
    properMotionRa: Number(row.properMotionRa ?? 0),
    properMotionDec: Number(row.properMotionDec ?? 0),
  }))
  .map((row) => {
    if (!row.id || !row.name || !row.constellation || !row.color || !Number.isFinite(row.raHours) || !Number.isFinite(row.decDeg) || !Number.isFinite(row.magnitude)) {
      throw new Error(`星表记录无效: ${row.id || 'unknown'}`)
    }
    if (ids.has(row.id)) throw new Error(`星表 id 重复: ${row.id}`)
    ids.add(row.id)
    return row
  })
  .sort((a, b) => a.magnitude - b.magnitude)

// Structure of Arrays: field offsets are recorded in the manifest and values are
// Float32, enabling a single transferable catalog buffer in a Worker.
const floatsPerStar = 5
const numericBuffer = new Float32Array(rows.length * floatsPerStar)
rows.forEach((row, index) => {
  numericBuffer.set([row.raHours, row.decDeg, row.magnitude, row.properMotionRa, row.properMotionDec], index * floatsPerStar)
})
const idIndex = rows.map(({ id, name, constellation, color }, index) => ({ id, name, constellation, color, index }))
const bytes = new Uint8Array(numericBuffer.buffer)
const sha256 = createHash('sha256').update(bytes).digest('hex')
const indexJson = JSON.stringify(idIndex, null, 2)
const catalogVersion = `fixture-${sha256.slice(0, 12)}`

await mkdir(outputDir, { recursive: true })
await writeIfChanged(resolve(outputDir, 'core-stars.bin'), bytes)
await writeIfChanged(resolve(outputDir, 'core-stars.index.json'), indexJson)
const manifestPath = resolve(outputDir, 'manifest.json')
const priorManifest = await readOptional(manifestPath)
const prior = priorManifest ? JSON.parse(priorManifest) : null
const manifest = {
  schemaVersion: 1,
  catalogVersion,
  generatedAt: prior?.catalogVersion === catalogVersion ? prior.generatedAt : new Date().toISOString(),
  production,
  source: 'fixture-bright-stars',
  files: [{
    name: 'core-stars.bin',
    indexName: 'core-stars.index.json',
    byteLength: bytes.byteLength,
    sha256,
    count: rows.length,
    layout: {
      type: 'float32-soa',
      fields: ['raHours', 'decDeg', 'magnitude', 'properMotionRaArcsecPerYear', 'properMotionDecArcsecPerYear'],
      floatsPerRecord: floatsPerStar,
    },
  }],
}
await writeIfChanged(manifestPath, JSON.stringify(manifest, null, 2))

console.info(`Built ${rows.length} fixture records, sha256=${sha256}`)
