import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

const NAME_TO_IAU = {
  猎户座: 'Ori',
  大熊座: 'UMa',
  小熊座: 'UMi',
  仙后座: 'Cas',
  天鹅座: 'Cyg',
  天琴座: 'Lyr',
  天鹰座: 'Aql',
  狮子座: 'Leo',
  天蝎座: 'Sco',
  金牛座: 'Tau',
  双子座: 'Gem',
  室女座: 'Vir',
  牧夫座: 'Boo',
  仙女座: 'And',
  飞马座: 'Peg',
  英仙座: 'Per',
  御夫座: 'Aur',
  大犬座: 'CMa',
  小犬座: 'CMi',
  南十字座: 'Cru',
  半人马座: 'Cen',
  人马座: 'Sgr',
  白羊座: 'Ari',
  巨蟹座: 'Cnc',
  北冕座: 'CrB',
  武仙座: 'Her',
  天龙座: 'Dra',
  长蛇座: 'Hya',
  蛇夫座: 'Oph',
  船底座: 'Car',
  波江座: 'Eri',
  鲸鱼座: 'Cet',
  南鱼座: 'PsA',
  南三角座: 'TrA',
  孔雀座: 'Pav',
  仙王座: 'Cep',
  天秤座: 'Lib',
  摩羯座: 'Cap',
  宝瓶座: 'Aqr',
  双鱼座: 'Psc',
  海豚座: 'Del',
  天兔座: 'Lep',
  乌鸦座: 'Crv',
  猎犬座: 'CVn',
}

function angularSepDeg(ra1, dec1, ra2, dec2) {
  const d1 = (dec1 * Math.PI) / 180
  const d2 = (dec2 * Math.PI) / 180
  const r1 = (ra1 * Math.PI) / 180
  const r2 = (ra2 * Math.PI) / 180
  const cos = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2)
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI
}

function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function edgesFromSegments(segments) {
  const edges = new Set()
  for (const seg of segments) {
    for (let i = 0; i < seg.length - 1; i++) edges.add(edgeKey(seg[i], seg[i + 1]))
  }
  return edges
}

const csn = readFileSync('/tmp/IAU-CSN.txt', 'utf8')
const hipById = new Map()
for (const line of csn.split('\n')) {
  if (!line || line.startsWith('#') || line.startsWith('$') || line.startsWith('(')) continue
  const hipMatch = line.match(/\s(\d{1,6})\s+\d+\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s/)
  // Columns are space-padded; HIP is column 11. Parse more carefully.
}

// IAU-CSN is fixed-width-ish but messy. Parse HIP / RA / Dec from the known column pattern.
// Format after mag/bnd: HIP (int or _), HD, RA, Dec
const hipCoords = new Map()
for (const line of csn.split('\n')) {
  if (!line.trim() || line.startsWith('#') || line.startsWith('$') || line.startsWith('(')) continue
  const parts = line.trim().split(/\s+/)
  // Find a token that looks like RA (0-360 float) followed by Dec (-90-90) near the end,
  // with HIP a few tokens before.
  // Typical: ... mag bnd HIP HD RA Dec date notes
  // HIP can be "_"
  let raIdx = -1
  for (let i = parts.length - 1; i >= 4; i--) {
    const ra = Number(parts[i - 1])
    const dec = Number(parts[i])
    if (Number.isFinite(ra) && Number.isFinite(dec) && ra >= 0 && ra <= 360 && dec >= -90 && dec <= 90) {
      // date follows as YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(parts[i + 1] ?? '')) {
        raIdx = i - 1
        break
      }
    }
  }
  if (raIdx < 2) continue
  const hipTok = parts[raIdx - 2]
  if (hipTok === '_') continue
  const hip = Number(hipTok)
  if (!Number.isFinite(hip)) continue
  hipCoords.set(hip, { raDeg: Number(parts[raIdx]), decDeg: Number(parts[raIdx + 1]), ascii: parts[0] })
}

const stars = parse(readFileSync('/Users/zhangzhicheng2/Documents/other/AdAstra/src/data/stars.yaml', 'utf8')).stars
const hipToOur = new Map()
const ourToHip = new Map()
const unmatched = []
for (const star of stars) {
  const raDeg = star.raHours * 15
  let best = null
  let bestSep = 0.2
  for (const [hip, rec] of hipCoords) {
    const sep = angularSepDeg(raDeg, star.decDeg, rec.raDeg, rec.decDeg)
    if (sep < bestSep) {
      bestSep = sep
      best = hip
    }
  }
  if (best == null) unmatched.push(star.id)
  else {
    hipToOur.set(best, star.id)
    ourToHip.set(star.id, best)
  }
}

const fab = readFileSync('/tmp/constellationship.fab', 'utf8')
const stEdges = new Map()
for (const line of fab.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const toks = trimmed.split(/\s+/)
  const abbr = toks[0]
  const n = Number(toks[1])
  const hips = toks.slice(2).map(Number)
  const edges = new Set()
  for (let i = 0; i < n; i++) {
    const a = hips[i * 2]
    const b = hips[i * 2 + 1]
    if (!a || !b) continue
    const idA = hipToOur.get(a)
    const idB = hipToOur.get(b)
    if (idA && idB && idA !== idB) edges.add(edgeKey(idA, idB))
  }
  stEdges.set(abbr, edges)
}

const ours = parse(readFileSync('/Users/zhangzhicheng2/Documents/other/AdAstra/src/data/constellations.yaml', 'utf8'))
console.log(`IAU-CSN HIPs: ${hipCoords.size}`)
console.log(`Our stars matched to HIP: ${ourToHip.size}/${stars.length}`)
console.log(`Unmatched: ${unmatched.join(', ') || '(none)'}`)
console.log('')

for (const c of ours.constellations) {
  const abbr = NAME_TO_IAU[c.name]
  const oursE = edgesFromSegments(c.segments)
  const canon = stEdges.get(abbr) ?? new Set()
  const extra = [...oursE].filter((e) => !canon.has(e)).sort()
  const missing = [...canon].filter((e) => !oursE.has(e)).sort()
  if (extra.length === 0 && missing.length === 0) continue
  console.log(`=== ${c.name} (${abbr}) ===`)
  if (extra.length) console.log('  extra (not in S&T, given our stars):', extra.join(', '))
  if (missing.length) console.log('  missing (S&T drawable with our stars):', missing.join(', '))
  console.log(`  ours ${oursE.size}  S&T-on-catalog ${canon.size}`)
  console.log('')
}
