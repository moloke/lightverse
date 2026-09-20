import { describe, expect, it } from 'vitest'
import {
  checkVersion,
  compareVersions,
  isNewerThan,
  parseVersion,
  readmeDocumentsVersion,
} from './version-utils.mjs'

describe('parseVersion', () => {
  it('parses a plain version', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 })
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseVersion(' 0.2.0 ')).toEqual({ major: 0, minor: 2, patch: 0 })
  })

  it.each(['1.2', '1.2.3.4', 'v1.2.3', '1.2.3-beta', '1.2.3+build', '01.2.3', '', 'x'])(
    'rejects %s',
    (value) => {
      expect(parseVersion(value)).toBeNull()
    },
  )

  it('rejects non-strings', () => {
    expect(parseVersion(undefined)).toBeNull()
    expect(parseVersion(123)).toBeNull()
  })
})

describe('compareVersions', () => {
  // The reason this is numeric rather than a string compare. As strings, '0.1.10' < '0.1.9'.
  it('orders 0.1.10 above 0.1.9, which a string comparison gets wrong', () => {
    expect(compareVersions('0.1.10', '0.1.9')).toBeGreaterThan(0)
    expect('0.1.10' > '0.1.9').toBe(false) // documents the trap
  })

  it('orders by major first', () => {
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0)
  })

  it('orders by minor before patch', () => {
    expect(compareVersions('0.2.0', '0.1.99')).toBeGreaterThan(0)
  })

  it('returns 0 for equal versions', () => {
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0)
  })

  it('throws on an unparseable input rather than guessing', () => {
    expect(() => compareVersions('1.2', '1.2.3')).toThrow()
  })
})

describe('isNewerThan', () => {
  it('is true for a patch bump', () => {
    expect(isNewerThan('0.1.1', '0.1.0')).toBe(true)
  })

  it('is false for the same version', () => {
    expect(isNewerThan('0.1.0', '0.1.0')).toBe(false)
  })

  it('is false for a version that went backwards', () => {
    expect(isNewerThan('0.1.0', '0.2.0')).toBe(false)
  })
})

describe('readmeDocumentsVersion', () => {
  it('finds a documented version', () => {
    expect(readmeDocumentsVersion('- **0.2.0** — the footer', '0.2.0')).toBe(true)
  })

  // The false-pass this guards: 0.1.1 is a substring of 0.1.10.
  it('does not accept 0.1.1 just because 0.1.10 is listed', () => {
    const readme = '## Version history\n- 0.1.10 — something\n'
    expect(readmeDocumentsVersion(readme, '0.1.10')).toBe(true)
    expect(readmeDocumentsVersion(readme, '0.1.1')).toBe(false)
  })

  it('does not match a longer version that merely starts the same', () => {
    expect(readmeDocumentsVersion('- 10.1.0 — x', '0.1.0')).toBe(false)
  })

  it('is false for an absent version', () => {
    expect(readmeDocumentsVersion('## Version history\n- 0.1.0 — x', '0.3.0')).toBe(false)
  })

  it('is false for a malformed version', () => {
    expect(readmeDocumentsVersion('anything', 'v1')).toBe(false)
  })
})

describe('checkVersion', () => {
  const readme = '## Version history\n- **0.2.0** — versioning\n- 0.1.0 — initial\n'

  it('passes a correct bump that is documented', () => {
    const result = checkVersion({ version: '0.2.0', baseVersion: '0.1.0', readme })
    expect(result.ok).toBe(true)
    expect(result.problems).toEqual([])
    expect(result.comparedAgainstBase).toBe(true)
  })

  it('fails when the version did not change', () => {
    const result = checkVersion({ version: '0.2.0', baseVersion: '0.2.0', readme })
    expect(result.ok).toBe(false)
    expect(result.problems.join(' ')).toMatch(/must increase/)
  })

  it('fails when the version went backwards', () => {
    expect(checkVersion({ version: '0.1.0', baseVersion: '0.2.0', readme }).ok).toBe(false)
  })

  it('fails on a malformed version, without also complaining about the README', () => {
    const result = checkVersion({ version: 'banana', baseVersion: '0.1.0', readme })
    expect(result.ok).toBe(false)
    expect(result.problems).toHaveLength(1)
  })

  it('fails when the README does not document the version', () => {
    const result = checkVersion({ version: '0.3.0', baseVersion: '0.2.0', readme })
    expect(result.ok).toBe(false)
    expect(result.problems.join(' ')).toMatch(/Version history/)
  })

  // A push to main, or a shallow clone that cannot see the base branch.
  it('still validates format and README when there is no base to compare against', () => {
    const result = checkVersion({ version: '0.2.0', baseVersion: null, readme })
    expect(result.ok).toBe(true)
    expect(result.comparedAgainstBase).toBe(false)
  })

  it('reports an unparseable base version rather than silently skipping the check', () => {
    const result = checkVersion({ version: '0.2.0', baseVersion: 'nonsense', readme })
    expect(result.ok).toBe(false)
    expect(result.comparedAgainstBase).toBe(false)
  })
})
