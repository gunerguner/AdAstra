import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, stringify } from 'yaml'

const root = resolve(import.meta.dirname, '../..')
const existingPath = resolve(root, 'src/data/stars.yaml')
const additionalPath = resolve(root, 'scripts/catalog/additional-stars.yaml')

const existing = parse(readFileSync(existingPath, 'utf8'))
const additional = parse(readFileSync(additionalPath, 'utf8'))

const ids = new Set()
const merged = [...existing.stars, ...additional.stars].map((row) => {
  if (!row.id || ids.has(row.id)) throw new Error(`duplicate or invalid id: ${row.id}`)
  ids.add(row.id)
  return row
}).sort((a, b) => a.magnitude - b.magnitude)

const overLimit = merged.filter((star) => star.magnitude > 4.5)
if (overLimit.length > 3) {
  throw new Error(`too many stars above V 4.5: ${overLimit.map((star) => star.id).join(', ')}`)
}

writeFileSync(existingPath, stringify({
  source: existing.source,
  stars: merged,
}, { lineWidth: 0 }))

console.info(`Merged ${additional.stars.length} stars; catalog now has ${merged.length} records.`)
