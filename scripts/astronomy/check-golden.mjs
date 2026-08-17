import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Body, Equator, Horizon, Observer } from 'astronomy-engine'

const root = resolve(import.meta.dirname, '../..')
const golden = JSON.parse(await readFile(resolve(root, 'scripts/astronomy/golden.json'), 'utf8'))
const bodyByName = { sun: Body.Sun, moon: Body.Moon, jupiter: Body.Jupiter }
const site = new Observer(golden.observer.latitude, golden.observer.longitude, golden.observer.height)
const date = new Date(golden.dateUtc)
let failures = 0

const wrappedDelta = (a, b) => Math.abs(((a - b + 540) % 360) - 180)
for (const expected of golden.bodies) {
  const equatorial = Equator(bodyByName[expected.name], date, site, true, true)
  const actual = Horizon(date, site, equatorial.ra, equatorial.dec, 'normal')
  const error = Math.hypot(wrappedDelta(actual.azimuth, expected.azimuth), actual.altitude - expected.altitude)
  console.info(`${expected.name}: Δ=${error.toFixed(6)}°`)
  if (error > golden.maxAngularErrorDegrees) failures += 1
}

if (failures) {
  console.error(`${failures} 个天体超过 ${golden.maxAngularErrorDegrees}° 误差预算。`)
  process.exitCode = 1
}
