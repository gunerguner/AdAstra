/** datetime-local 字符串（观测地民用时）↔ UTC 毫秒。用 Intl 读 IANA 时区，并处理夏令时折叠/跳跃。 */
type LocalDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

/** 按 IANA 时区缓存 DateTimeFormat，避免每次 new。 */
function formatter(timeZone: string) {
  let value = formatterCache.get(timeZone)
  value ??= new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  if (!formatterCache.has(timeZone)) formatterCache.set(timeZone, value)
  return value
}

function partsAt(utcMillis: number, timeZone: string): LocalDateParts {
  const values = formatter(timeZone).formatToParts(new Date(utcMillis))
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((part) => part.type === type)?.value)
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  }
}

function localEpoch(parts: LocalDateParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
}

/** UTC 毫秒 → 观测地 `YYYY-MM-DDTHH:mm`，给 datetime-local 输入框。 */
export function formatDateTimeLocal(utcMillis: number, timeZone: string) {
  const parts = Object.fromEntries(
    formatter(timeZone).formatToParts(new Date(utcMillis)).map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/**
 * datetime-local 按 IANA 时区理解成 UTC。
 * 夏令时重复的那一分钟取较早瞬间；不存在的本地分钟直接拒绝，不悄悄改用户输入。
 */
export function parseDateTimeLocal(value: string, timeZone: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const wanted = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: 0,
  }
  const target = localEpoch(wanted)
  let candidate = target

  for (let pass = 0; pass < 2; pass += 1) {
    candidate += target - localEpoch(partsAt(candidate, timeZone))
  }

  const actual = partsAt(candidate, timeZone)
  return localEpoch(actual) === target ? candidate : null
}

/** 回归年的平均长度，用于播放倍率和夏令时空洞时的回退。 */
const MEAN_YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function pad(value: number, width: number) {
  return String(value).padStart(width, '0')
}

export type LocalTimeShift = {
  years?: number
  days?: number
  minutes?: number
}

/**
 * 按观测地民用时前进或后退。
 * 跨年时把 2 月 29 日收到 2 月 28 日；分钟和日的进位交给公历。
 * 落到夏令时空洞时退回平均毫秒，不改成邻近的有效分钟。
 */
export function shiftLocalUtc(utcMillis: number, timeZone: string, shift: LocalTimeShift) {
  const years = shift.years ?? 0
  const days = shift.days ?? 0
  const minutes = shift.minutes ?? 0
  const parts = partsAt(utcMillis, timeZone)
  const year = parts.year + years
  const day = years === 0 ? parts.day : Math.min(parts.day, daysInMonth(year, parts.month))
  const carried = new Date(Date.UTC(year, parts.month - 1, day + days, parts.hour, parts.minute + minutes))
  const value = `${pad(carried.getUTCFullYear(), 4)}-${pad(carried.getUTCMonth() + 1, 2)}-${pad(carried.getUTCDate(), 2)}T${pad(carried.getUTCHours(), 2)}:${pad(carried.getUTCMinutes(), 2)}`
  const parsed = parseDateTimeLocal(value, timeZone)
  if (parsed == null) return utcMillis + years * MEAN_YEAR_MS + days * 86_400_000 + minutes * 60_000
  return parsed + parts.second * 1000 + (utcMillis % 1000)
}
