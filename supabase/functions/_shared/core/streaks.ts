import { previousDayKey } from './dates.ts'

/**
 * Streak advancement, as one pure decision.
 *
 * Streaks are a core retention mechanic, and this logic previously lived inline in two runtimes
 * that disagreed. The web copy was also silently broken: it wrote to a `streaks.date` column that
 * migration 009 had dropped, so **practising on the web built no streak at all** (gap C-1). Pulling
 * the decision out of the database call is what makes it testable.
 *
 * Deliberately knows nothing about timezones. It compares calendar day keys that the caller has
 * already resolved, so the UK-only day boundary stays a single decision in `dates.ts` rather than
 * being re-litigated here. See docs/decisions.md.
 */

export interface StreakState {
  /** The day key of the user's last recorded activity, or null/undefined if they have none. */
  lastActivityDate: string | null | undefined
  /** Today's day key, from `dayKey()`. */
  todayKey: string
  /** The streak count currently stored, if any. */
  currentStreak: number | null | undefined
}

export interface StreakDecision {
  /** What the streak should be after this activity. */
  currentStreak: number
  /**
   * Whether anything needs writing. False when the user has already practised today — the
   * guard that stops a second practice double-counting.
   */
  shouldWrite: boolean
}

/**
 * Normalise a stored value to a `YYYY-MM-DD` key.
 *
 * `last_activity_date` is a `DATE` column so it arrives as `YYYY-MM-DD`, but older rows and other
 * writers have put full ISO timestamps there. Taking the date portion accepts both rather than
 * trusting the column's current shape.
 */
function toDayKey(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

/**
 * Decide the streak after a day's activity.
 *
 * - No previous activity, or an unreadable value → the streak starts at 1.
 * - Already active today → unchanged, and nothing is written.
 * - Active yesterday → incremented.
 * - Any longer gap → back to 1.
 */
export function nextStreak(state: StreakState): StreakDecision {
  const last = toDayKey(state.lastActivityDate)

  // No usable history: this is day one. Covers a first-ever practice and a row whose
  // last_activity_date is NULL, which the schema permits.
  if (last === null) {
    return { currentStreak: 1, shouldWrite: true }
  }

  // Already counted today. Practising ten times in an evening is still one day.
  if (last === state.todayKey) {
    return { currentStreak: state.currentStreak ?? 1, shouldWrite: false }
  }

  if (last === previousDayKey(state.todayKey)) {
    // A stored streak of 0 or a missing one still means today is the first counted day.
    const stored = state.currentStreak ?? 0
    return { currentStreak: stored > 0 ? stored + 1 : 1, shouldWrite: true }
  }

  // A gap of two days or more. Also the path for a future-dated last activity, which should not
  // happen but must not silently inflate a streak.
  return { currentStreak: 1, shouldWrite: true }
}

/** The `streaks` row shape, as migration 009 defines it. */
export interface StreakWrite {
  current_streak: number
  last_activity_date: string
}

/**
 * Build the columns to write for a streak update or insert.
 *
 * This exists so the **column names are covered by a test**. The bug this fixes was not the streak
 * arithmetic — that was fine — it was writing to `streaks.date`, a column migration 009 dropped,
 * with the resulting error discarded. Keeping the names in a tested pure function means
 * reintroducing `date` fails the suite instead of failing silently in production for months.
 *
 * `last_activity_date` is a `DATE` column, so it takes a `YYYY-MM-DD` day key, never a full ISO
 * timestamp.
 */
export function streakWritePayload(decision: StreakDecision, todayKey: string): StreakWrite {
  return {
    current_streak: decision.currentStreak,
    last_activity_date: todayKey,
  }
}
