import { generateCloze, renderCloze, TOTAL_STEPS } from './cloze.ts'

/**
 * Outbound message copy, in one place.
 *
 * The daily verse message was composed inline in `daily-send-sms`. It has a second caller now —
 * fast-forward mode (#38) sends the *real* next-step message immediately for an allowlisted
 * number — and a test harness that sends an approximation of the message tests nothing. So the
 * template lives here and both callers use it. See CLAUDE.md rule 8.
 *
 * **Keep this copy GSM-7 clean.** One non-GSM-7 character forces the whole message into UCS-2 at
 * 70 characters per segment instead of GSM-7's 160 — the emoji that used to be here were costing
 * 51% of outbound segment volume (#20). `sms-encoding.ts` holds the guard, and the test suite
 * fails if a template stops being GSM-7 encodable. The realistic regression is not an emoji but a
 * curly quote or an em dash pasted in from a word processor.
 */

export interface DailyVerseMessage {
  reference: string
  /** From `bible_verses.translation`. NOT NULL DEFAULT 'ESV' in the schema; defended anyway. */
  translation?: string | null
  text: string
  step: number
  totalSteps?: number
  /** Injected in tests so the blanked words are deterministic. */
  random?: () => number
}

/** The morning message: reference, translation, step, the clozed verse, and a nudge to reply. */
export function buildDailyVerseMessage(input: DailyVerseMessage): string {
  const totalSteps = input.totalSteps ?? TOTAL_STEPS
  const translation = input.translation || 'ESV'
  const clozeText = renderCloze(generateCloze(input.text, input.step, input.random))

  return `${input.reference} (${translation}) - Step ${input.step}/${totalSteps}

${clozeText}

Reply with the full verse to continue!`
}
