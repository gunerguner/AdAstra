import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const sourcePath = resolve(root, 'data/sources/fixture-bright-stars.csv')
const policyPath = resolve(root, 'data/licenses/catalog-sources.json')
const outputDir = resolve(root, 'public/data/v1')
const production = process.argv.includes('--production')

const policy = JSON.parse(await readFile(policyPath, 'utf8'))
if (production && !policy.productionAllowed) {
  throw new Error('生产星表构建已阻止：data/licenses/catalog-sources.json 未给出完整书面授权结论。')
}

const rawRows = (await readFile(sourcePath, 'utf8')).trim().split(/\r?\n/)
const headers = rawRows.shift().split(',')
const rows = rawRows.map((line) => Object.fromEntries(line.split(',').map((value, index) => [headers[index], value])))
  .map((row) => ({
    id: row.id,
    name: row.name,
    raHours: Number(row.raHours),
    decDeg: Number(row.decDeg),
    magnitude: Number(row.magnitude),
    properMotionRa: Number(row.properMotionRa),
    properMotionDec: Number(row.properMotionDec),
  }))
  .sort((a, b) => a.magnitude - b.magnitude)

// Structure of Arrays: field offsets are recorded in the manifest and values are
// Float32, enabling a single transferable catalog buffer in a Worker.
const floatsPerStar = 5
const numericBuffer = new Float32Array(rows.length * floatsPerStar)
rows.forEach((row, index) => {
  numericBuffer.set([row.raHours, row.decDeg, row.magnitude, row.properMotionRa, row.properMotionDec], index * floatsPerStar)
})
const idIndex = rows.map(({ id, name }, index) => ({ id, name, index }))
const bytes = new Uint8Array(numericBuffer.buffer)
const sha256 = createHash('sha256').update(bytes).digest('hex')

await mkdir(outputDir, { recursive: true })
await writeFile(resolve(outputDir, 'core-stars.bin'), bytes)
await writeFile(resolve(outputDir, 'core-stars.index.json'), JSON.stringify(idIndex, null, 2))
await writeFile(resolve(outputDir, 'manifest.json'), JSON.stringify({
  schemaVersion: 1,
  catalogVersion: 'fixture-1',
  generatedAt: new Date().toISOString(),
  production,
  source: 'fixture-bright-stars',
  files: [{
    name: 'core-stars.bin',
    byteLength: bytes.byteLength,
    sha256,
    count: rows.length,
    layout: {
      type: 'float32-soa',
      fields: ['raHours', 'decDeg', 'magnitude', 'properMotionRaArcsecPerYear', 'properMotionDecArcsecPerYear'],
      floatsPerRecord: floatsPerStar,
    },
  }],
}, null, 2))

console.info(`Built ${rows.length} fixture records, sha256=${sha256}`)
