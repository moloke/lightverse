import { describe, expect, it } from 'vitest'
import { dayKey, isSameDay, previousDayKey, UK_TIME_ZONE } from './dates.ts'

describe('dayKey', () => {
  // The case this whole helper exists for (gap C-3).
  //
  // 23:30 UTC on 15 June is already 00:30 on the 16th in London, because BST is UTC+1 in summer.
  // A naive `toISOString().split('T')[0]` answers 2026-06-15 and is wrong; anything reading
  // ambient runtime time is wrong in a different way depending on where it runs.
  it('places a 23:30 UTC summer instant on the next day in London (BST, UTC+1)', () => {
    const instant = new Date('2026-06-15T23:30:00Z')
    expect(dayKey(instant, 'Europe/London')).toBe('2026-06-16')
  })

  it('places that same instant on 15 June in UTC', () => {
    const instant = new Date('2026-06-15T23:30:00Z')
    expect(dayKey(instant, 'UTC')).toBe('2026-06-15')
  })

  // In winter London is GMT (UTC+0), so the two agree. If this ever disagrees, the helper has
  // stopped reading real timezone data.
  it('agrees with UTC in winter, when London is GMT', () => {
    const instant = new Date('2026-01-15T23:30:00Z')
    expect(dayKey(instant, 'Europe/London')).toBe('2026-01-15')
    expect(dayKey(instant, 'UTC')).toBe('2026-01-15')
  })

  it('does not read the ambient process timezone', () => {
    // Whatever TZ the test process runs under, an explicit zone must win. CI pins TZ=UTC; a
    // developer machine may be anything. Both must produce the same answer.
    const instant = new Date('2026-06-15T23:30:00Z')
    expect(dayKey(instant, 'Asia/Tokyo')).toBe('2026-06-16') // UTC+9 — already the 16th, 08:30
    expect(dayKey(instant, 'America/Los_Angeles')).toBe('2026-06-15') // UTC-7 — still the 15th
  })

  it('handles the midnight UTC boundary exactly', () => {
    expect(dayKey(new Date('2026-03-10T00:00:00Z'), 'UTC')).toBe('2026-03-10')
    expect(dayKey(new Date('2026-03-09T23:59:59Z'), 'UTC')).toBe('2026-03-09')
  })

  it('crosses the BST transition correctly', () => {
    // BST began 29 March 2026 at 01:00 UTC. Half an hour before, London is still GMT.
    expect(dayKey(new Date('2026-03-29T00:30:00Z'), 'Europe/London')).toBe('2026-03-29')
    // And 23:30 UTC that same evening is already the 30th in BST.
    expect(dayKey(new Date('2026-03-29T23:30:00Z'), 'Europe/London')).toBe('2026-03-30')
  })

  it('pads month and day to two digits', () => {
    expect(dayKey(new Date('2026-01-05T12:00:00Z'), 'UTC')).toBe('2026-01-05')
  })

  it('defaults to the UK timezone', () => {
    const instant = new Date('2026-06-15T23:30:00Z')
    expect(dayKey(instant)).toBe(dayKey(instant, UK_TIME_ZONE))
    expect(dayKey(instant)).toBe('2026-06-16')
  })

  it('rejects an invalid date rather than returning a garbage key', () => {
    expect(() => dayKey(new Date('not a date'))).toThrow(RangeError)
  })

  it('rejects an unknown timezone', () => {
    expect(() => dayKey(new Date('2026-06-15T23:30:00Z'), 'Mars/Olympus_Mons')).toThrow()
  })
})

describe('isSameDay', () => {
  it('is false either side of a London midnight even when both are the same UTC day', () => {
    // 22:30 and 23:30 UTC on 15 June are 23:30 and 00:30 London — different days there,
    // the same day in UTC. This is exactly the streak-boundary bug waiting to happen.
    const before = new Date('2026-06-15T22:30:00Z')
    const after = new Date('2026-06-15T23:30:00Z')
    expect(isSameDay(before, after, 'Europe/London')).toBe(false)
    expect(isSameDay(before, after, 'UTC')).toBe(true)
  })

  it('is true for two instants on the same London day', () => {
    expect(
      isSameDay(new Date('2026-06-15T08:00:00Z'), new Date('2026-06-15T18:00:00Z'), 'Europe/London'),
    ).toBe(true)
  })
})

describe('previousDayKey', () => {
  it('returns the previous calendar day', () => {
    expect(previousDayKey('2026-09-19')).toBe('2026-09-18')
  })

  it('crosses a month boundary', () => {
    expect(previousDayKey('2026-09-01')).toBe('2026-08-31')
  })

  it('crosses a year boundary', () => {
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31')
  })

  it('handles a leap day', () => {
    expect(previousDayKey('2028-03-01')).toBe('2028-02-29')
    expect(previousDayKey('2028-02-29')).toBe('2028-02-28')
  })

  it('handles a non-leap year February', () => {
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28')
  })

  // A day that is only 23 hours long in local time is still one calendar day.
  it('is unaffected by the BST transition', () => {
    expect(previousDayKey('2026-03-29')).toBe('2026-03-28')
    expect(previousDayKey('2026-03-30')).toBe('2026-03-29')
  })

  it('rejects a malformed key', () => {
    expect(() => previousDayKey('19-09-2026')).toThrow(RangeError)
    expect(() => previousDayKey('not-a-date')).toThrow(RangeError)
  })
})
