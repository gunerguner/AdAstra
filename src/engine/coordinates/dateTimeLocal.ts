type LocalDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string) {
  let value = formatterCache.get(timeZone)
  if (!value) {
    value = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formatterCache.set(timeZone, value)
  }
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
  }
}

function localEpoch(parts: LocalDateParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
}

export function formatDateTimeLocal(utcMillis: number, timeZone: string) {
  const value = partsAt(utcMillis, timeZone)
  return `${value.year.toString().padStart(4, '0')}-${value.month.toString().padStart(2, '0')}-${value.day.toString().padStart(2, '0')}T${value.hour.toString().padStart(2, '0')}:${value.minute.toString().padStart(2, '0')}`
}

/**
 * Converts a datetime-local value interpreted in an IANA time zone to UTC.
 * For repeated DST minutes, this selects the earlier UTC instant. Nonexistent
 * local minutes are rejected instead of silently shifting the user's input.
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
  }
  const target = localEpoch(wanted)
  let candidate = target

  for (let pass = 0; pass < 2; pass += 1) {
    candidate += target - localEpoch(partsAt(candidate, timeZone))
  }

  const actual = partsAt(candidate, timeZone)
  return localEpoch(actual) === target ? candidate : null
}
