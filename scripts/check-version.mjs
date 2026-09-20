#!/usr/bin/env node
/**
 * The version gate. Fails a PR that does not bump `package.json`'s version and document it.
 *
 * Rules and reasoning: docs/workflow/versioning.md. The decision logic is in version-utils.mjs,
 * which is unit-tested; this file is only I/O and reporting.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { checkVersion } from './version-utils.mjs'

/**
 * The version on the branch we are merging into, or null when there is nothing to compare with.
 *
 * Null is expected and fine in two cases: a push to the default branch (where the version has
 * already been bumped by the PR that merged) and a clone too shallow to see the base. Returning
 * null skips only the "must increase" rule — format and README checks still run.
 */
function baseVersion() {
  const baseRef = process.env.GITHUB_BASE_REF
  const candidates = baseRef
    ? [`origin/${baseRef}`, baseRef]
    : ['origin/main', 'main']

  for (const ref of candidates) {
    try {
      const json = execFileSync('git', ['show', `${ref}:package.json`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      return JSON.parse(json).version ?? null
    } catch {
      // Ref not present locally — try the next candidate.
    }
  }
  return null
}

const version = JSON.parse(readFileSync('package.json', 'utf8')).version
const readme = readFileSync('README.md', 'utf8')
const base = baseVersion()

const result = checkVersion({ version, baseVersion: base, readme })

if (result.ok) {
  const against = result.comparedAgainstBase
    ? `newer than ${base} on the base branch`
    : 'no base branch available to compare against, so the increase rule was skipped'
  console.log(`check:version — ${version} (${against})`)
  process.exit(0)
}

console.error(`check:version FAILED for version ${version}\n`)
for (const problem of result.problems) console.error(`  • ${problem}`)
console.error('\nSee docs/workflow/versioning.md.')
process.exit(1)
