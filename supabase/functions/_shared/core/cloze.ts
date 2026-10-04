/**
 * Progressive cloze deletion — one implementation, two renderings.
 *
 * There used to be three copies of this. Two were live and identical by coincidence
 * (`daily-send-sms` for SMS, `createClozeTest` for the web) with no shared source and nothing to
 * stop them drifting. The third was dead prefix-truncation code whose docstring was the *file
 * header*, so `cloze-deletion.ts` documented behaviour the product did not have — an agent reading
 * it would confidently describe the wrong algorithm (gaps C-2 and M-2).
 *
 * What actually ships, and what `docs/decisions.md` records under "Seven steps, hiding a random
 * fraction of words": a **random** fraction of words is replaced with a blank, rising across seven
 * steps. Not prefix truncation, and the percentages are *hidden*, not visible.
 *
 * The two runtimes need different shapes — SMS wants a string, the web wants per-word parts so it
 * can render an input per blank — so the decision about *which* words are hidden happens once here,
 * and each side renders it. See CLAUDE.md rule 8.
 */

/** Fraction of words hidden at each step, 1-indexed. Settled in docs/decisions.md. */
export const HIDE_FRACTIONS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9] as const

export const TOTAL_STEPS = 7

export interface ClozeWord {
  word: string
  hidden: boolean
}

export interface Cloze {
  /** The verse exactly as given, so a rendering can return it untouched when nothing is hidden. */
  source: string
  parts: ClozeWord[]
  step: number
  totalWords: number
  hiddenCount: number
}

/** The fraction hidden at a step. Out-of-range steps hide nothing rather than throwing. */
export function hideFractionForStep(step: number): number {
  return HIDE_FRACTIONS[step - 1] ?? 0
}

/**
 * Decide which words are hidden at a given step.
 *
 * @param random Injected for testability. Production passes nothing and gets `Math.random`; tests
 *               pass a deterministic sequence, which is the only way to assert that the two
 *               runtimes agree on identical input.
 */
export function generateCloze(
  verseText: string,
  step: number,
  random: () => number = Math.random,
): Cloze {
  const words = verseText.split(/\s+/)
  const totalWords = words.length
  const hiddenCount = Math.floor(totalWords * hideFractionForStep(step))

  // Fisher-Yates over the indices, then take the first N. Matches what both previous copies did,
  // so output is unchanged for the same random sequence.
  const indices = Array.from({ length: totalWords }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const indicesToHide = new Set(indices.slice(0, hiddenCount))

  return {
    source: verseText,
    parts: words.map((word, index) => ({ word, hidden: indicesToHide.has(index) })),
    step,
    totalWords,
    hiddenCount,
  }
}

/**
 * Render a cloze as the text an SMS carries.
 *
 * Returns `source` verbatim when nothing is hidden, rather than rebuilding from parts. Rebuilding
 * would collapse any run of whitespace in the original — no seeded verse is affected today, but a
 * verse added later could be, and step 1 is meant to show the verse exactly as stored.
 */
export function renderCloze(cloze: Cloze, blank = '_____'): string {
  if (cloze.hiddenCount === 0) return cloze.source
  return cloze.parts.map((part) => (part.hidden ? blank : part.word)).join(' ')
}
