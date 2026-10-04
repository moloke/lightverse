import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FAST_FORWARD_CAP,
  isAllowlisted,
  normalisePhone,
  parseAllowlist,
  shouldFastForward,
} from './fast-forward.ts'

const MINE = '+447700900123'
const OTHER = '+447700900999'

/** A decision that would fast-forward, so each test can negate exactly one thing. */
const permissive = {
  from: MINE,
  allowlist: parseAllowlist(MINE),
  sendsInWindow: 0,
  isCorrect: true,
  isCompleted: false,
}

describe('normalisePhone', () => {
  it('ignores spacing and punctuation, so the secret can be written either way', () => {
    expect(normalisePhone('+44 7700 900123')).toBe('447700900123')
    expect(normalisePhone('+447700900123')).toBe('447700900123')
    expect(normalisePhone('+44-7700-900123')).toBe('447700900123')
  })

  // Deliberately NOT equivalent. `0` is the UK national trunk prefix, not a spelling of `+44`,
  // and inferring country codes inside an allowlist is how you match a number you did not mean
  // to. The secret must be written in the same E.164 form Twilio sends — see docs/runbook.md.
  it('does not treat a national-format number as the same as E.164', () => {
    expect(normalisePhone('07700900123')).not.toBe(normalisePhone('+447700900123'))
    expect(isAllowlisted('+447700900123', parseAllowlist('07700900123'))).toBe(false)
  })

  it('returns empty for values with no digits', () => {
    expect(normalisePhone('')).toBe('')
    expect(normalisePhone('   ')).toBe('')
    expect(normalisePhone(null)).toBe('')
    expect(normalisePhone(undefined)).toBe('')
  })
})

describe('parseAllowlist', () => {
  it('is empty when the secret is unset — the production default', () => {
    expect(parseAllowlist(undefined)).toEqual([])
    expect(parseAllowlist(null)).toEqual([])
    expect(parseAllowlist('')).toEqual([])
  })

  // The most dangerous line in the feature. A stray comma must not leave an empty entry, because
  // an empty string would compare equal to a normalised-away number.
  it('drops empty entries from stray separators', () => {
    expect(parseAllowlist(',')).toEqual([])
    expect(parseAllowlist(',,,')).toEqual([])
    expect(parseAllowlist(`${MINE},`)).toEqual(['447700900123'])
    expect(parseAllowlist(`,${MINE}`)).toEqual(['447700900123'])
    expect(parseAllowlist('   ')).toEqual([])
  })

  it('parses several numbers, ignoring spacing', () => {
    expect(parseAllowlist(`${MINE}, +44 7700 900999`)).toEqual([
      '447700900123',
      '447700900999',
    ])
  })
})

describe('isAllowlisted', () => {
  it('matches regardless of how either side is formatted', () => {
    expect(isAllowlisted('+44 7700 900123', parseAllowlist(MINE))).toBe(true)
  })

  it('refuses a number that is not listed', () => {
    expect(isAllowlisted(OTHER, parseAllowlist(MINE))).toBe(false)
  })

  it('refuses everything when the list is empty', () => {
    expect(isAllowlisted(MINE, [])).toBe(false)
  })

  // Guarding the permissive-direction bug: an empty string in the list must not act as a wildcard.
  it('refuses an empty or junk caller even if an empty entry slipped into the list', () => {
    expect(isAllowlisted('', [''])).toBe(false)
    expect(isAllowlisted(null, [''])).toBe(false)
    expect(isAllowlisted('no digits here', [''])).toBe(false)
  })
})

describe('shouldFastForward', () => {
  it('fast-forwards a correct reply from an allowlisted number under the cap', () => {
    expect(shouldFastForward(permissive)).toBe(true)
  })

  // Every one of these is a reason NOT to spend money.
  it('refuses when the allowlist is empty — off by default, in production', () => {
    expect(shouldFastForward({ ...permissive, allowlist: [] })).toBe(false)
  })

  it('refuses a number that is not allowlisted', () => {
    expect(shouldFastForward({ ...permissive, from: OTHER })).toBe(false)
  })

  it('refuses an incorrect reply — the user should see the hint, as in production', () => {
    expect(shouldFastForward({ ...permissive, isCorrect: false })).toBe(false)
  })

  it('refuses a completed verse, which has no next step', () => {
    expect(shouldFastForward({ ...permissive, isCompleted: true })).toBe(false)
  })

  it('refuses at the cap', () => {
    expect(
      shouldFastForward({ ...permissive, sendsInWindow: DEFAULT_FAST_FORWARD_CAP }),
    ).toBe(false)
  })

  it('refuses above the cap', () => {
    expect(
      shouldFastForward({ ...permissive, sendsInWindow: DEFAULT_FAST_FORWARD_CAP + 50 }),
    ).toBe(false)
  })

  it('allows the last send below the cap', () => {
    expect(
      shouldFastForward({ ...permissive, sendsInWindow: DEFAULT_FAST_FORWARD_CAP - 1 }),
    ).toBe(true)
  })

  it('honours a lower cap when one is passed', () => {
    expect(shouldFastForward({ ...permissive, sendsInWindow: 2, cap: 2 })).toBe(false)
  })

  // A failed count query must not read as "zero sends so far".
  it('refuses when the send count is not a usable number', () => {
    expect(shouldFastForward({ ...permissive, sendsInWindow: NaN })).toBe(false)
    expect(shouldFastForward({ ...permissive, sendsInWindow: -1 })).toBe(false)
    expect(
      shouldFastForward({ ...permissive, sendsInWindow: Infinity }),
    ).toBe(false)
  })

  it('refuses a missing caller', () => {
    expect(shouldFastForward({ ...permissive, from: null })).toBe(false)
    expect(shouldFastForward({ ...permissive, from: '' })).toBe(false)
  })
})
