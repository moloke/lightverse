/**
 * Fast-forward mode: collapse the 24-hour feedback loop for an allowlisted number.
 *
 * Normally a correct reply advances the step and the next message waits for the 08:00 cron, so
 * walking a verse to its last cloze step takes a week. For a number on the allowlist, the next
 * message is sent immediately — the real one, from the shared builder — so the whole journey takes
 * minutes (#38).
 *
 * **This compresses messages, not the calendar.** It cannot bring a spaced review due, and streaks
 * will not move, because every reply lands on the same calendar day. That is what "spaced
 * repetition" means. Moving review dates is a SQL job — see docs/runbook.md — never a fake clock in
 * function code, which would put a lying "now" on the paid send path.
 *
 * Two guards matter more than the feature itself, because this deliberately bypasses the daily
 * rhythm that stops repeat sends:
 *
 *   1. An empty or unset allowlist means **off**. That is the default and the production state.
 *   2. A hard cap on sends per number per rolling window, so a logic bug cannot drain the balance.
 *
 * Every rejection path is tested harder than the accepting one: being wrong in the permissive
 * direction here costs real money.
 */

/** Sends allowed per number per rolling window before fast-forward stops. */
export const DEFAULT_FAST_FORWARD_CAP = 20

/** The rolling window the cap applies over. A window, not a calendar day, so no timezone edge. */
export const FAST_FORWARD_WINDOW_HOURS = 24

/**
 * Reduce a phone number to its digits, so `+44 7700 900123` and `+447700900123` compare equal.
 *
 * Spacing and punctuation only. It deliberately does **not** reconcile national and international
 * formats — `07700900123` is not treated as `+447700900123`, because `0` is the UK trunk prefix
 * rather than a spelling of `+44`, and inferring country codes inside an allowlist is how you
 * match a number you did not mean to. Write the secret in the same E.164 form Twilio sends.
 *
 * Returns `''` for anything with no digits, which can never match a real number — see
 * `isAllowlisted`, where empty values are refused on both sides.
 */
export function normalisePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Parse the `TEST_FAST_FORWARD_NUMBERS` secret into comparable numbers.
 *
 * Empty entries are dropped. This is the single most dangerous line in the feature: a stray comma
 * or trailing separator would otherwise leave an empty string in the list, and an empty string
 * compares equal to a normalised-away number — matching callers it was never meant to.
 */
export function parseAllowlist(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((entry) => normalisePhone(entry))
    .filter((entry) => entry.length > 0)
}

/** Whether a number is on the allowlist. Refuses empty values on either side. */
export function isAllowlisted(phone: string | null | undefined, allowlist: string[]): boolean {
  const normalised = normalisePhone(phone)
  if (!normalised) return false
  if (allowlist.length === 0) return false
  return allowlist.includes(normalised)
}

export interface FastForwardDecision {
  from: string | null | undefined
  allowlist: string[]
  /** Fast-forwarded sends to this number inside the rolling window. */
  sendsInWindow: number
  cap?: number
  /** Only a correct reply fast-forwards — an incorrect one should show the hint, as in production. */
  isCorrect: boolean
  /** A finished verse has no next step to send. */
  isCompleted: boolean
}

/**
 * Whether to send the next step immediately.
 *
 * Deliberately conservative: every condition must hold, and any missing or malformed input
 * resolves to `false`.
 */
export function shouldFastForward(decision: FastForwardDecision): boolean {
  const cap = decision.cap ?? DEFAULT_FAST_FORWARD_CAP

  if (!decision.isCorrect) return false
  if (decision.isCompleted) return false
  if (!isAllowlisted(decision.from, decision.allowlist)) return false
  if (!Number.isFinite(decision.sendsInWindow) || decision.sendsInWindow < 0) return false
  if (decision.sendsInWindow >= cap) return false

  return true
}
