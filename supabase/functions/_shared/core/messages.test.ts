import { describe, expect, it } from 'vitest'
import { buildDailyVerseMessage } from './messages.ts'

const seeded = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const VERSE = {
  reference: 'John 3:16',
  translation: 'ESV',
  text: 'For God so loved the world that he gave his one and only Son',
}

describe('buildDailyVerseMessage', () => {
  it('shows the verse in full at step 1', () => {
    const msg = buildDailyVerseMessage({ ...VERSE, step: 1, random: seeded(1) })
    expect(msg).toContain(VERSE.text)
    expect(msg).not.toContain('_____')
  })

  it('names the reference, translation and step', () => {
    const msg = buildDailyVerseMessage({ ...VERSE, step: 3, random: seeded(1) })
    expect(msg).toContain('John 3:16 (ESV)')
    expect(msg).toContain('Step 3/7')
  })

  it('blanks words from step 2 onward', () => {
    expect(buildDailyVerseMessage({ ...VERSE, step: 5, random: seeded(2) })).toContain('_____')
  })

  it('falls back to ESV when the translation is missing', () => {
    expect(
      buildDailyVerseMessage({ ...VERSE, translation: null, step: 2, random: seeded(1) }),
    ).toContain('(ESV)')
  })

  it('is deterministic for a given random sequence, so fast-forward output is assertable', () => {
    const a = buildDailyVerseMessage({ ...VERSE, step: 4, random: seeded(7) })
    const b = buildDailyVerseMessage({ ...VERSE, step: 4, random: seeded(7) })
    expect(a).toBe(b)
  })
})
