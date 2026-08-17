import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const policy = JSON.parse(await readFile(resolve(root, 'data/licenses/catalog-sources.json'), 'utf8'))
const unresolved = policy.sources.filter((source) => source.role !== 'development-fixture' && source.writtenVerification !== 'approved')

if (unresolved.length) {
  console.error(`数据发布门禁未通过：${unresolved.map((source) => source.id).join(', ')} 尚无书面授权结论。`)
  process.exitCode = 1
} else if (!policy.productionAllowed) {
  console.error('数据发布门禁未通过：productionAllowed 必须在全部来源核验后显式启用。')
  process.exitCode = 1
} else {
  console.info('数据发布门禁通过。')
}
