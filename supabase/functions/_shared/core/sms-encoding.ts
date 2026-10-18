/**
 * SMS encoding and segment counting.
 *
 * This exists because of a measured, expensive fact: **a single non-GSM-7 character forces the
 * whole message into UCS-2**, which carries 70 characters per segment instead of GSM-7's 160. One
 * 📖 in a header more than doubles the cost of everything after it.
 *
 * Measured across all 20 seeded verses at all 7 steps, the emoji were costing **51%** of outbound
 * segment volume — 531 segments against 258 without them. For a product whose brief names SMS cost
 * as its designed-in constraint, that was the largest single cost lever in the backlog (#20).
 *
 * So the guard is not fussiness. It is the thing that stops one well-meant emoji silently doubling
 * the bill again.
 */

/**
 * GSM-7 default alphabet. One septet each.
 *
 * Note what is absent: curly quotes, en and em dashes, ellipsis characters — the things an editor
 * or a word processor substitutes automatically. Those are the realistic way this regresses, not
 * emoji.
 */
const GSM7_BASIC = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
)

/** GSM-7 extension table. Encodable, but **two** septets each, so they cost double. */
const GSM7_EXTENDED = new Set('^{}\\[~]|€')

/** Whether every character can be encoded in GSM-7. */
export function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7_BASIC.has(ch) && !GSM7_EXTENDED.has(ch)) return false
  }
  return true
}

/** The characters that would force UCS-2, deduplicated — for a useful failure message. */
export function nonGsm7Characters(text: string): string[] {
  const offenders = new Set<string>()
  for (const ch of text) {
    if (!GSM7_BASIC.has(ch) && !GSM7_EXTENDED.has(ch)) offenders.add(ch)
  }
  return [...offenders]
}

/** Septets a GSM-7 string occupies. Extension characters count twice. */
export function gsm7Length(text: string): number {
  let length = 0
  for (const ch of text) length += GSM7_EXTENDED.has(ch) ? 2 : 1
  return length
}

/**
 * Billable segments for a message.
 *
 * GSM-7: 160 in a single message, 153 per part once concatenated. UCS-2: 70 and 67, counted in
 * UTF-16 code units, so an astral-plane emoji costs two on its own.
 */
export function segmentCount(text: string): number {
  if (isGsm7(text)) {
    const length = gsm7Length(text)
    return length <= 160 ? 1 : Math.ceil(length / 153)
  }
  const units = [...text].reduce((total, ch) => total + (ch.codePointAt(0)! > 0xffff ? 2 : 1), 0)
  return units <= 70 ? 1 : Math.ceil(units / 67)
}

/** The encoding a message would be sent with. */
export function smsEncoding(text: string): 'GSM-7' | 'UCS-2' {
  return isGsm7(text) ? 'GSM-7' : 'UCS-2'
}
