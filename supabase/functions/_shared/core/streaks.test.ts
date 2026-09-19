import { describe, expect, it } from 'vitest'
import { nextStreak, streakWritePayload } from './streaks.ts'

const TODAY = '2026-09-19'
const YESTERDAY = '2026-09-18'

describe('nextStreak', () => {
  it('starts at 1 when there is no previous activity', () => {
    expect(nextStreak({ lastActivityDate: null, todayKey: TODAY, currentStreak: null })).toEqual({
      currentStreak: 1,
      shouldWrite: true,
    })
  })

  // The schema permits last_activity_date to be NULL (migration 009), and the old code called
  // .split() on it unguarded — a TypeError, not a silent failure.
  it('starts at 1 when the stored date is undefined rather than null', () => {
    expect(
      nextStreak({ lastActivityDate: undefined, todayKey: TODAY, currentStreak: 0 }),
    ).toEqual({ currentStreak: 1, shouldWrite: true })
  })

  it('increments when the last activity was yesterday', () => {
    expect(
      nextStreak({ lastActivityDate: YESTERDAY, todayKey: TODAY, currentStreak: 4 }),
    ).toEqual({ currentStreak: 5, shouldWrite: true })
  })

  it('does not write, or double-count, when already active today', () => {
    expect(nextStreak({ lastActivityDate: TODAY, todayKey: TODAY, currentStreak: 4 })).toEqual({
      currentStreak: 4,
      shouldWrite: false,
    })
  })

  it('resets to 1 after a two-day gap', () => {
    expect(
      nextStreak({ lastActivityDate: '2026-09-17', todayKey: TODAY, currentStreak: 9 }),
    ).toEqual({ currentStreak: 1, shouldWrite: true })
  })

  it('resets to 1 after a long absence', () => {
    expect(
      nextStreak({ lastActivityDate: '2025-01-02', todayKey: TODAY, currentStreak: 300 }),
    ).toEqual({ currentStreak: 1, shouldWrite: true })
  })

  it('accepts a full ISO timestamp, which older rows contain', () => {
    expect(
      nextStreak({
        lastActivityDate: '2026-09-18T22:14:05.123Z',
        todayKey: TODAY,
        currentStreak: 2,
      }),
    ).toEqual({ currentStreak: 3, shouldWrite: true })
  })

  it('treats an unparseable stored value as no history rather than throwing', () => {
    expect(
      nextStreak({ lastActivityDate: 'not-a-date', todayKey: TODAY, currentStreak: 7 }),
    ).toEqual({ currentStreak: 1, shouldWrite: true })
  })

  it('counts today as day one when a consecutive day has a zero stored streak', () => {
    expect(
      nextStreak({ lastActivityDate: YESTERDAY, todayKey: TODAY, currentStreak: 0 }),
    ).toEqual({ currentStreak: 1, shouldWrite: true })
  })

  it('does not inflate a streak from a future-dated last activity', () => {
    expect(
      nextStreak({ lastActivityDate: '2026-09-25', todayKey: TODAY, currentStreak: 5 }),
    ).toEqual({ currentStreak: 1, shouldWrite: true })
  })

  // Month, year and leap-day boundaries are where naive "subtract 24 hours" arithmetic fails.
  it('increments across a month boundary', () => {
    expect(
      nextStreak({ lastActivityDate: '2026-08-31', todayKey: '2026-09-01', currentStreak: 3 }),
    ).toEqual({ currentStreak: 4, shouldWrite: true })
  })

  it('increments across a year boundary', () => {
    expect(
      nextStreak({ lastActivityDate: '2025-12-31', todayKey: '2026-01-01', currentStreak: 11 }),
    ).toEqual({ currentStreak: 12, shouldWrite: true })
  })

  it('increments across a leap day', () => {
    expect(
      nextStreak({ lastActivityDate: '2028-02-29', todayKey: '2028-03-01', currentStreak: 2 }),
    ).toEqual({ currentStreak: 3, shouldWrite: true })
  })

  // The UK clocks-forward night. A streak must not break because a day was 23 hours long.
  it('increments across the BST transition', () => {
    expect(
      nextStreak({ lastActivityDate: '2026-03-28', todayKey: '2026-03-29', currentStreak: 6 }),
    ).toEqual({ currentStreak: 7, shouldWrite: true })
  })
})

describe('streakWritePayload', () => {
  // The regression guard. The shipped bug wrote `date`, a column that does not exist.
  it('writes last_activity_date, and nothing called date', () => {
    const payload = streakWritePayload({ currentStreak: 3, shouldWrite: true }, TODAY)
    expect(payload).toEqual({ current_streak: 3, last_activity_date: TODAY })
    expect(Object.keys(payload).sort()).toEqual(['current_streak', 'last_activity_date'])
    expect(payload).not.toHaveProperty('date')
  })

  it('writes a bare day key, not an ISO timestamp, because the column is a DATE', () => {
    const payload = streakWritePayload({ currentStreak: 1, shouldWrite: true }, TODAY)
    expect(payload.last_activity_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('carries the decided streak through unchanged', () => {
    expect(streakWritePayload({ currentStreak: 42, shouldWrite: true }, TODAY).current_streak).toBe(42)
  })
})
