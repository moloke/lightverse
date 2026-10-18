import { describe, expect, it } from 'vitest'
import {
  gsm7Length,
  isGsm7,
  nonGsm7Characters,
  segmentCount,
  smsEncoding,
} from './sms-encoding.ts'
import { buildDailyVerseMessage } from './messages.ts'

/** sendSMS prepends this, so a template that is clean alone can still ship dirty. */
const PREFIX = 'LIGHTVERSE: '

const VERSE = {
  reference: 'John 3:16',
  translation: 'ESV',
  text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him should not perish but have eternal life',
}
const seeded = (n: number) => () => {
  n = (n * 1103515245 + 12345) & 0x7fffffff
  return n / 0x7fffffff
}

describe('isGsm7', () => {
  it('accepts ordinary message copy', () => {
    expect(isGsm7('Correct! +10 XP')).toBe(true)
    expect(isGsm7("You're on step 3/7. Keep going!")).toBe(true)
  })

  it('accepts the extension characters', () => {
    expect(isGsm7('{a} [b] ~c| ^d €5')).toBe(true)
  })

  it('rejects emoji', () => {
    expect(isGsm7('Correct! ✅')).toBe(false)
    expect(isGsm7('📖 John 3:16')).toBe(false)
  })

  // The realistic regression: not an emoji, but a word processor substituting punctuation.
  it('rejects curly quotes, en and em dashes, and an ellipsis character', () => {
    expect(isGsm7('You’re on step 3/7')).toBe(false) // curly apostrophe
    expect(isGsm7('step 3 – 7')).toBe(false) // en dash
    expect(isGsm7('step 3 — 7')).toBe(false) // em dash
    expect(isGsm7('Hint…')).toBe(false) // ellipsis
    expect(isGsm7('“quoted”')).toBe(false) // curly double quotes
  })

  it('names the offending characters, so a failure is actionable', () => {
    expect(nonGsm7Characters('Correct! ✅ 📖')).toEqual(['✅', '📖'])
    expect(nonGsm7Characters('all clear')).toEqual([])
  })
})

describe('gsm7Length', () => {
  it('counts ordinary characters once', () => {
    expect(gsm7Length('abc')).toBe(3)
  })

  it('counts extension characters twice, because they cost two septets', () => {
    expect(gsm7Length('€')).toBe(2)
    expect(gsm7Length('a{b}')).toBe(1 + 2 + 1 + 2)
  })
})

describe('segmentCount', () => {
  it('is 1 for a short GSM-7 message', () => {
    expect(segmentCount('Correct! +10 XP')).toBe(1)
  })

  it('fits 160 GSM-7 characters in one segment, 161 in two', () => {
    expect(segmentCount('a'.repeat(160))).toBe(1)
    expect(segmentCount('a'.repeat(161))).toBe(2)
  })

  it('fits only 70 characters once a single emoji forces UCS-2', () => {
    expect(segmentCount('a'.repeat(100))).toBe(1) // GSM-7
    expect(segmentCount('a'.repeat(100) + '✅')).toBeGreaterThan(1) // UCS-2
  })

  it('counts an astral-plane emoji as two UTF-16 units', () => {
    expect(segmentCount('📖'.repeat(35))).toBe(1) // 70 units exactly
    expect(segmentCount('📖'.repeat(36))).toBe(2)
  })

  it('reports the encoding', () => {
    expect(smsEncoding('plain')).toBe('GSM-7')
    expect(smsEncoding('plain ✅')).toBe('UCS-2')
  })
})

/**
 * The regression guard for #20. If any outbound template stops being GSM-7 encodable, the bill
 * roughly doubles — silently, because nothing else would notice.
 */
describe('outbound copy stays GSM-7, including the LIGHTVERSE prefix', () => {
  it('every daily message at every step is GSM-7', () => {
    for (let step = 1; step <= 7; step++) {
      const message = PREFIX + buildDailyVerseMessage({ ...VERSE, step, random: seeded(step) })
      expect(nonGsm7Characters(message)).toEqual([])
      expect(smsEncoding(message)).toBe('GSM-7')
    }
  })

  // These mirror receive-sms-webhook's reply copy. They are duplicated deliberately: the webhook
  // builds them inline, so without this the reply path has no encoding guard at all.
  it.each([
    ['correct', "Correct! +10 XP\n\nYou're on step 3/7 of John 3:16 (ESV). Keep going!"],
    ['completed', "Congratulations! You've memorized John 3:16 (ESV)! +110 XP\n\nVisit lightverse.org to choose your next verse!"],
    ['incorrect', 'Not quite. Keep trying!\n\nHint: "For God so loved the..."\n\nReply with the full verse for John 3:16 (ESV)'],
    ['unknown session', "You don't have an active verse. Visit lightverse.org to select one!"],
  ])('the %s reply is GSM-7', (_label, copy) => {
    expect(nonGsm7Characters(PREFIX + copy)).toEqual([])
  })

  it('a daily message is now cheaper than the emoji version it replaced', () => {
    const now = PREFIX + buildDailyVerseMessage({ ...VERSE, step: 4, random: seeded(4) })
    const withEmoji = PREFIX + '📖 ' + buildDailyVerseMessage({ ...VERSE, step: 4, random: seeded(4) }) + ' 💪'
    expect(segmentCount(now)).toBeLessThan(segmentCount(withEmoji))
  })
})
