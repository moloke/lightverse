import { describe, expect, it } from 'vitest'
import {
  generateCloze,
  hideFractionForStep,
  HIDE_FRACTIONS,
  renderCloze,
  TOTAL_STEPS,
} from './cloze.ts'

const VERSE = 'For God so loved the world that he gave his one and only Son'
const WORDS = VERSE.split(' ').length // 14

/** A deterministic stand-in for Math.random, so output is assertable at all. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

describe('hideFractionForStep', () => {
  it('matches the ladder settled in docs/decisions.md', () => {
    expect(HIDE_FRACTIONS).toEqual([0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9])
    expect(TOTAL_STEPS).toBe(7)
  })

  it('hides nothing at step 1 and 90% at step 7', () => {
    expect(hideFractionForStep(1)).toBe(0)
    expect(hideFractionForStep(7)).toBe(0.9)
  })

  it('hides nothing for a step outside the ladder rather than throwing', () => {
    expect(hideFractionForStep(0)).toBe(0)
    expect(hideFractionForStep(8)).toBe(0)
    expect(hideFractionForStep(-1)).toBe(0)
  })
})

describe('generateCloze', () => {
  it('hides nothing at step 1 — the verse is shown in full', () => {
    const cloze = generateCloze(VERSE, 1, seeded(1))
    expect(cloze.hiddenCount).toBe(0)
    expect(cloze.parts.every((p) => !p.hidden)).toBe(true)
  })

  it('hides the documented fraction at every step', () => {
    for (let step = 1; step <= TOTAL_STEPS; step++) {
      const cloze = generateCloze(VERSE, step, seeded(step))
      expect(cloze.hiddenCount).toBe(Math.floor(WORDS * HIDE_FRACTIONS[step - 1]))
      // The count of hidden parts must agree with the reported count.
      expect(cloze.parts.filter((p) => p.hidden)).toHaveLength(cloze.hiddenCount)
    }
  })

  it('hides more at each step than the one before', () => {
    const counts = Array.from({ length: TOTAL_STEPS }, (_, i) =>
      generateCloze(VERSE, i + 1, seeded(7)).hiddenCount,
    )
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
    }
    expect(counts[TOTAL_STEPS - 1]).toBeGreaterThan(counts[0])
  })

  it('never loses or reorders words', () => {
    const cloze = generateCloze(VERSE, 5, seeded(42))
    expect(cloze.parts.map((p) => p.word)).toEqual(VERSE.split(' '))
  })

  // Determinism is what makes cross-runtime equivalence testable at all.
  it('is deterministic for a given random sequence', () => {
    const a = generateCloze(VERSE, 4, seeded(99))
    const b = generateCloze(VERSE, 4, seeded(99))
    expect(a).toEqual(b)
  })

  it('produces different blanks for different sequences', () => {
    const a = generateCloze(VERSE, 4, seeded(1)).parts.map((p) => p.hidden)
    const b = generateCloze(VERSE, 4, seeded(2)).parts.map((p) => p.hidden)
    expect(a).not.toEqual(b)
  })

  it('handles a single-word verse without hiding the only word', () => {
    const cloze = generateCloze('Jesus', 7, seeded(1))
    expect(cloze.hiddenCount).toBe(0) // floor(1 * 0.9) === 0
    expect(renderCloze(cloze)).toBe('Jesus')
  })
})

describe('renderCloze', () => {
  it('replaces each hidden word with a blank of its own', () => {
    const cloze = generateCloze(VERSE, 7, seeded(3))
    const rendered = renderCloze(cloze)
    // One blank per hidden word — not a single long run of underscores, which is the bug the dead
    // prefix-truncation implementation had.
    expect(rendered.split(' ').filter((w) => w === '_____')).toHaveLength(cloze.hiddenCount)
  })

  it('returns the source verbatim when nothing is hidden', () => {
    expect(renderCloze(generateCloze(VERSE, 1, seeded(1)))).toBe(VERSE)
  })

  // Rebuilding from parts would collapse runs of whitespace. No seeded verse is affected today,
  // but step 1 is meant to show the verse exactly as stored.
  it('preserves unusual whitespace at step 1', () => {
    const odd = 'For God  so\nloved the world'
    expect(renderCloze(generateCloze(odd, 1, seeded(1)))).toBe(odd)
  })

  it('accepts a different blank marker', () => {
    const cloze = generateCloze(VERSE, 4, seeded(5))
    expect(renderCloze(cloze, '***')).toContain('***')
    expect(renderCloze(cloze, '***')).not.toContain('_____')
  })
})

describe('the two runtimes agree', () => {
  // The whole point of the consolidation: SMS renders a string, the web renders per-word parts,
  // and both come from one decision. If they ever disagree, these two views of the same Cloze
  // would diverge.
  it('renders blanks exactly where the parts say they are hidden', () => {
    const cloze = generateCloze(VERSE, 6, seeded(11))
    const rendered = renderCloze(cloze).split(' ')
    cloze.parts.forEach((part, i) => {
      expect(rendered[i]).toBe(part.hidden ? '_____' : part.word)
    })
  })
})
