/**
 * Pure helpers for the version gate. No filesystem, no git, no process — so they can be tested
 * directly. The I/O lives in check-version.mjs.
 *
 * The rules these enforce are in docs/workflow/versioning.md.
 */

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

/**
 * Parse `MAJOR.MINOR.PATCH` into numbers, or return null.
 *
 * Deliberately strict: no `v` prefix, no pre-release or build metadata, no leading zeroes. This
 * project has one version string in one file, and an exotic one is far more likely to be a typo
 * than an intention.
 */
export function parseVersion(value) {
  if (typeof value !== 'string') return null
  const match = SEMVER.exec(value.trim())
  if (!match) return null
  const [, major, minor, patch] = match
  return { major: Number(major), minor: Number(minor), patch: Number(patch) }
}

/**
 * Compare two versions numerically: negative if a < b, 0 if equal, positive if a > b.
 *
 * Numeric, not lexicographic — the whole reason this exists is that `'0.1.10' > '0.1.9'` is false
 * as a string comparison, which would wave through a version that had actually gone backwards.
 */
export function compareVersions(a, b) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) throw new Error(`compareVersions received an unparseable version: ${a} / ${b}`)

  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch
  )
}

/** Whether `candidate` is strictly newer than `base`. Equal versions are not newer. */
export function isNewerThan(candidate, base) {
  return compareVersions(candidate, base) > 0
}

/**
 * Whether the README's version history documents this exact version.
 *
 * Matches a version only when it is not part of a longer one: a naive substring test would accept
 * `0.1.1` because `0.1.10` happens to be listed, silently letting an undocumented release through.
 */
export function readmeDocumentsVersion(readme, version) {
  if (!parseVersion(version)) return false
  const escaped = version.replace(/\./g, '\\.')
  return new RegExp(`(^|[^0-9.])${escaped}([^0-9.]|$)`, 'm').test(readme)
}

/**
 * The full check, as data rather than console output, so it can be tested without capturing stdout.
 *
 * `baseVersion` is null when there is nothing to compare against — a push to the default branch,
 * or a shallow clone that cannot see the base. The version must still be valid and documented;
 * only the "must increase" rule is skipped, and the caller is told so it can say why.
 */
export function checkVersion({ version, baseVersion, readme }) {
  const problems = []

  if (!parseVersion(version)) {
    problems.push(`package.json version "${version}" is not MAJOR.MINOR.PATCH`)
    return { ok: false, problems, comparedAgainstBase: false }
  }

  let comparedAgainstBase = false
  if (baseVersion != null) {
    if (!parseVersion(baseVersion)) {
      problems.push(`base version "${baseVersion}" is not MAJOR.MINOR.PATCH`)
    } else {
      comparedAgainstBase = true
      if (!isNewerThan(version, baseVersion)) {
        problems.push(
          `version must increase: ${version} is not newer than ${baseVersion} on the base branch. ` +
            `Bump it — see docs/workflow/versioning.md for which part.`,
        )
      }
    }
  }

  if (!readmeDocumentsVersion(readme, version)) {
    problems.push(
      `README.md's "Version history" does not mention ${version}. Add a line saying what changed.`,
    )
  }

  return { ok: problems.length === 0, problems, comparedAgainstBase }
}
