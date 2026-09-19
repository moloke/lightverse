/**
 * Day-boundary handling, in one place.
 *
 * LightVerse is UK-only and sends at 08:00 UTC — see docs/decisions.md, "UK-only, 08:00 UTC, no
 * per-user timezones". That decision is deliberate, and this helper is how it stays *explicit*
 * rather than accidental: every day-boundary question routes through `dayKey`, and making the
 * product multi-timezone later means passing a different `timeZone`, not hunting down scattered
 * date arithmetic.
 *
 * The hazard this closes (gap C-3): the codebase currently mixes two idioms, and one of them —
 * comparing `getFullYear()/getMonth()/getDate()` — reads *runtime-local* time. It is correct in
 * production only because Supabase Edge and Vercel both happen to run UTC. In local dev, or on any
 * differently-configured runtime, it silently answers "already sent today?" wrongly, which means
 * either a duplicate paid SMS or a user who never gets their verse.
 *
 * Pure and runtime-agnostic: imported by both the Deno edge functions and the Next app, tested
 * once. See CLAUDE.md rule 8.
 */

/** The IANA zone the product currently operates in. One parameter, one decision, one place. */
export const UK_TIME_ZONE = 'Europe/London'

/**
 * The calendar day a given instant falls on, in a given timezone, as `YYYY-MM-DD`.
 *
 * Use this for every "same day?" question — already-sent-today guards, streak boundaries,
 * review scheduling. Never compare `Date` parts directly, and never reach for
 * `toISOString().split('T')[0]`, which silently hardcodes UTC.
 *
 * @param date The instant to place on a calendar.
 * @param timeZone An IANA timezone name. Defaults to the UK, per the product decision above.
 * @throws RangeError if `date` is invalid or `timeZone` is not a recognised IANA name.
 */
export function dayKey(date: Date, timeZone: string = UK_TIME_ZONE): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('dayKey received an invalid Date')
  }

  // Intl is the only correct way to do this: it knows DST transitions, and it reads the zone we
  // pass rather than the ambient one. formatToParts avoids depending on how a locale happens to
  // order or punctuate a date string.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const part = (type: 'year' | 'month' | 'day'): string => {
    const found = parts.find((p) => p.type === type)
    if (!found) throw new RangeError(`dayKey could not resolve ${type} in timezone ${timeZone}`)
    return found.value
  }

  return `${part('year')}-${part('month')}-${part('day')}`
}

/** Whether two instants fall on the same calendar day in the given timezone. */
export function isSameDay(a: Date, b: Date, timeZone: string = UK_TIME_ZONE): boolean {
  return dayKey(a, timeZone) === dayKey(b, timeZone)
}

/**
 * The calendar day before a given `YYYY-MM-DD` key.
 *
 * Pure calendar arithmetic on the key itself — it deliberately does *not* take a timezone. The key
 * has already been resolved to a calendar date by `dayKey`; "the day before 2026-03-29" is the same
 * answer everywhere. Computing it with UTC arithmetic avoids the classic bug where subtracting 24
 * hours across a DST boundary lands on the same day or skips one.
 *
 * @throws RangeError if the key is not a valid `YYYY-MM-DD` date.
 */
export function previousDayKey(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) throw new RangeError(`previousDayKey expected YYYY-MM-DD, received ${key}`)

  const [, year, month, day] = match
  const asUtc = Date.UTC(Number(year), Number(month) - 1, Number(day))
  const previous = new Date(asUtc - 24 * 60 * 60 * 1000)

  if (Number.isNaN(previous.getTime())) {
    throw new RangeError(`previousDayKey received an invalid date: ${key}`)
  }

  return dayKey(previous, 'UTC')
}
