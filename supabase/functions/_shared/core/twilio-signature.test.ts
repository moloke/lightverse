import { describe, expect, it } from 'vitest'
import {
  buildSignatureBase,
  computeSignature,
  constantTimeEqual,
  isValidTwilioSignature,
} from './twilio-signature.ts'

/**
 * Fixture. The token is the string "12345" — a placeholder, not a credential; a real auth token
 * must never appear in this repo (CLAUDE.md rule 5).
 *
 * The expected signature below was not hand-derived. It was cross-checked three ways against the
 * same input: Node's `crypto.createHmac('sha1')`, this module's Web Crypto implementation under
 * Deno, and **the official `twilio` npm package's own `getExpectedTwilioSignature`**, which is
 * already a dependency of this repo. All three agree. That makes this a test against the vendor's
 * definition of correct, not against our own restatement of it.
 */
const TOKEN = '12345'
const URL_WITH_QUERY = 'https://mycompany.com/myapp.php?foo=1&bar=2'
const PARAMS = {
  CallSid: 'CA1234567890ABCDE',
  Caller: '+14158675310',
  Digits: '1234',
  From: '+14158675310',
  To: '+18005551212',
}
const EXPECTED = 'GvWf1cFY/Q7PnoempGyD5oXAezc='

describe('buildSignatureBase', () => {
  it('concatenates the URL then each key and value, sorted by key, with no separators', () => {
    // No "=", no "&", no delimiter of any kind between a key and its value.
    expect(buildSignatureBase('https://example.com/hook', { b: '2', a: '1' })).toBe(
      'https://example.com/hooka1b2',
    )
  })

  it('sorts by key rather than trusting insertion order', () => {
    const inOrder = buildSignatureBase(URL_WITH_QUERY, PARAMS)
    const shuffled = buildSignatureBase(URL_WITH_QUERY, {
      To: PARAMS.To,
      Digits: PARAMS.Digits,
      CallSid: PARAMS.CallSid,
      From: PARAMS.From,
      Caller: PARAMS.Caller,
    })
    expect(shuffled).toBe(inOrder)
  })

  it('keeps the query string, which Twilio includes in what it signs', () => {
    expect(buildSignatureBase(URL_WITH_QUERY, {})).toBe(URL_WITH_QUERY)
  })

  it('handles an empty parameter value without dropping the key', () => {
    expect(buildSignatureBase('https://example.com/hook', { Body: '' })).toBe(
      'https://example.com/hookBody',
    )
  })
})

describe('computeSignature', () => {
  // The anchor test: our digest must equal the one the official Twilio SDK produces.
  it('reproduces the signature the Twilio SDK computes for the same request', async () => {
    await expect(computeSignature(TOKEN, URL_WITH_QUERY, PARAMS)).resolves.toBe(EXPECTED)
  })

  it('is unaffected by the order parameters happen to arrive in', async () => {
    const reordered = { To: PARAMS.To, From: PARAMS.From, Caller: PARAMS.Caller, Digits: PARAMS.Digits, CallSid: PARAMS.CallSid }
    await expect(computeSignature(TOKEN, URL_WITH_QUERY, reordered)).resolves.toBe(EXPECTED)
  })

  it('changes completely if a single character of the body changes', async () => {
    const tampered = { ...PARAMS, Digits: '1235' }
    await expect(computeSignature(TOKEN, URL_WITH_QUERY, tampered)).resolves.not.toBe(EXPECTED)
  })

  it('changes if the URL changes', async () => {
    await expect(
      computeSignature(TOKEN, 'https://mycompany.com/myapp.php?foo=1&bar=3', PARAMS),
    ).resolves.not.toBe(EXPECTED)
  })

  it('changes if the auth token changes', async () => {
    await expect(computeSignature('54321', URL_WITH_QUERY, PARAMS)).resolves.not.toBe(EXPECTED)
  })
})

describe('constantTimeEqual', () => {
  it('is true for identical strings', () => {
    expect(constantTimeEqual(EXPECTED, EXPECTED)).toBe(true)
  })

  it('is false when only the last character differs', () => {
    expect(constantTimeEqual('abcdef', 'abcdeg')).toBe(false)
  })

  it('is false when only the first character differs', () => {
    expect(constantTimeEqual('abcdef', 'zbcdef')).toBe(false)
  })

  it('is false for different lengths, including a prefix', () => {
    expect(constantTimeEqual('abc', 'abcdef')).toBe(false)
    expect(constantTimeEqual('abcdef', 'abc')).toBe(false)
  })

  it('is true for two empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true)
  })
})

describe('isValidTwilioSignature', () => {
  // Each of these must fail if the check is stubbed to `return true`.
  it('accepts a correctly signed request', async () => {
    await expect(
      isValidTwilioSignature(TOKEN, URL_WITH_QUERY, PARAMS, EXPECTED),
    ).resolves.toBe(true)
  })

  it('rejects a forged signature', async () => {
    await expect(
      isValidTwilioSignature(TOKEN, URL_WITH_QUERY, PARAMS, 'AAAAf1cFY/Q7PnoempGyD5oXAezc='),
    ).resolves.toBe(false)
  })

  it('rejects a missing signature header rather than throwing', async () => {
    await expect(isValidTwilioSignature(TOKEN, URL_WITH_QUERY, PARAMS, null)).resolves.toBe(false)
  })

  it('rejects an empty signature header', async () => {
    await expect(isValidTwilioSignature(TOKEN, URL_WITH_QUERY, PARAMS, '')).resolves.toBe(false)
  })

  // An unconfigured secret must never read as "no signature required" — that would silently
  // reopen S-1 the moment the env var went missing.
  it('rejects everything when the auth token is empty', async () => {
    await expect(
      isValidTwilioSignature('', URL_WITH_QUERY, PARAMS, EXPECTED),
    ).resolves.toBe(false)
  })

  it('rejects a signature that is valid for a different URL', async () => {
    const otherUrl = 'https://mycompany.com/other.php'
    const sigForOther = await computeSignature(TOKEN, otherUrl, PARAMS)
    await expect(
      isValidTwilioSignature(TOKEN, URL_WITH_QUERY, PARAMS, sigForOther),
    ).resolves.toBe(false)
  })

  it('rejects a signature that is valid for a tampered body', async () => {
    const tampered = { ...PARAMS, Body: 'injected' }
    const sigForTampered = await computeSignature(TOKEN, URL_WITH_QUERY, tampered)
    await expect(
      isValidTwilioSignature(TOKEN, URL_WITH_QUERY, PARAMS, sigForTampered),
    ).resolves.toBe(false)
  })
})
