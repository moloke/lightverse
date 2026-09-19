/**
 * Twilio request-signature verification.
 *
 * `receive-sms-webhook` is deployed `--no-verify-jwt` because Twilio sends no JWT — see
 * docs/decisions.md, "The webhook deploys --no-verify-jwt, and therefore must verify the Twilio
 * signature". Those two facts belong on the same line, permanently: the deploy flag is *why* this
 * file is the only thing standing between a public URL and the Twilio balance.
 *
 * Without it (gap S-1) anyone who can POST a form body could send an SMS to any number on earth at
 * the account's expense, forge progress for any user whose number they knew, and cause a paid
 * outbound message per request.
 *
 * Pure and runtime-agnostic: no Deno globals, no network, no database. Tested once.
 * See CLAUDE.md rule 8.
 *
 * The algorithm, per Twilio's documented scheme:
 *   1. Start with the full URL of the request, exactly as Twilio called it (query string included).
 *   2. Append every POST parameter, sorted by key, as key immediately followed by value.
 *   3. HMAC-SHA1 that string, keyed on the account's auth token.
 *   4. Base64-encode the digest, and compare with the X-Twilio-Signature header.
 */

/**
 * Build the exact string Twilio signs.
 *
 * Exported for testing: the sorting and concatenation is the part that silently produces a wrong
 * digest if you get it even slightly off, so it is worth asserting directly.
 */
export function buildSignatureBase(url: string, params: Record<string, string>): string {
  // Sort by key. Twilio sorts by the parameter name, then concatenates name and value with no
  // separator at all — not "=", not "&".
  const sortedKeys = Object.keys(params).sort()
  return sortedKeys.reduce((acc, key) => acc + key + params[key], url)
}

/**
 * Compare two strings in time independent of how early they differ.
 *
 * A naive `===` leaks, through timing, how many leading bytes of a guess were correct, which turns
 * forging a signature into a byte-at-a-time search rather than a brute force of the whole digest.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)

  // Length is not secret — a digest's length is fixed and public — but bail before indexing so
  // differing lengths can't read out of bounds. Compare the shorter run anyway so that this
  // branch itself does not become the timing signal.
  let mismatch = aBytes.length === bBytes.length ? 0 : 1
  const length = Math.min(aBytes.length, bBytes.length)
  for (let i = 0; i < length; i++) {
    mismatch |= aBytes[i] ^ bBytes[i]
  }

  return mismatch === 0
}

/** Compute the base64 HMAC-SHA1 signature Twilio would send for a given request. */
export async function computeSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(buildSignatureBase(url, params)),
  )

  // btoa over the raw digest bytes. String.fromCharCode on a Uint8Array gives latin1, which is
  // what btoa expects.
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

/**
 * Whether a request's signature is authentic.
 *
 * Returns `false` rather than throwing for every rejection — a missing header, an empty token, a
 * forged digest — so that a caller cannot accidentally treat a thrown error as a pass, and so that
 * every rejection path looks identical from the outside.
 *
 * @param authToken The Twilio account auth token. An empty token always fails: an unconfigured
 *                  secret must never read as "no signature required".
 * @param url The full request URL **as Twilio called it**. If the function sits behind a redirect,
 *            or the scheme or host differs from what is configured in the Twilio console, the
 *            digest will not match even for legitimate traffic. See docs/runbook.md.
 * @param params The POST body parameters.
 * @param headerSignature The value of the X-Twilio-Signature header, or null if absent.
 */
export async function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  headerSignature: string | null,
): Promise<boolean> {
  if (!authToken) return false
  if (!headerSignature) return false

  const expected = await computeSignature(authToken, url, params)
  return constantTimeEqual(expected, headerSignature)
}

/**
 * Every URL string the request might legitimately have been signed as.
 *
 * **This exists because `req.url` is not the URL Twilio signed.** Behind Supabase's edge proxy the
 * function sees `http://<ref>.supabase.co/receive-sms-webhook` — TLS is terminated upstream, so the
 * scheme is `http`, and the public `/functions/v1` prefix is stripped before the request arrives.
 * Twilio signs the URL configured in its console, which has both. Comparing against `req.url`
 * therefore rejects *every* genuine request, which is precisely what happened in production on
 * 2026-09-19 (Twilio error 11200 on every inbound message).
 *
 * The fix is to verify against the public URL. `configuredUrl` — the exact string from the Twilio
 * console — is the deterministic answer and is tried first. The reconstructed variants are a
 * fallback so that a missing or stale config cannot take inbound replies offline again.
 *
 * **This does not weaken the check.** Every candidate still has to produce a matching HMAC under
 * the account auth token, which an attacker does not have. The URL binds a signature to an
 * endpoint; it is not itself the secret.
 */
export function candidateSignatureUrls(input: {
  requestUrl: string
  hostHeader?: string | null
  forwardedProto?: string | null
  configuredUrl?: string | null
}): string[] {
  const { requestUrl, hostHeader, forwardedProto, configuredUrl } = input
  const candidates: string[] = []

  // The operator told us exactly what Twilio calls. Trust it first, and the common case costs a
  // single HMAC.
  if (configuredUrl) candidates.push(configuredUrl)

  let parsed: URL
  try {
    parsed = new URL(requestUrl)
  } catch {
    return dedupe(candidates)
  }

  const schemes = [forwardedProto ? `${forwardedProto}:` : null, 'https:', parsed.protocol]
  const hosts = [hostHeader, parsed.host]
  // Supabase strips the public prefix; put it back as one of the options.
  const paths = [parsed.pathname, `/functions/v1${parsed.pathname}`]

  for (const scheme of schemes) {
    if (!scheme) continue
    for (const host of hosts) {
      if (!host) continue
      for (const path of paths) {
        candidates.push(`${scheme}//${host}${path}${parsed.search}`)
      }
    }
  }

  return dedupe(candidates)
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}

/**
 * Whether the signature is authentic for **any** of the candidate URLs.
 *
 * Returns false for an empty token or a missing header, exactly as the single-URL check does.
 */
export async function isValidTwilioSignatureForAnyUrl(
  authToken: string,
  urls: string[],
  params: Record<string, string>,
  headerSignature: string | null,
): Promise<boolean> {
  if (!authToken) return false
  if (!headerSignature) return false

  for (const url of urls) {
    if (await isValidTwilioSignature(authToken, url, params, headerSignature)) return true
  }
  return false
}
