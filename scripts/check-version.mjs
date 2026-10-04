#!/usr/bin/env node
/**
 * The version gate. Fails a PR that does not bump `package.json`'s version and document it.
 *
 * Rules and reasoning: docs/workflow/versioning.md. The decision logic is in version-utils.mjs,
 * which is unit-tested; this file is only I/O and reporting.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { checkVersion, shouldCompareAgainstBase } from './version-utils.mjs'

/**
 * The version on the branch we are merging into, or null when there is nothing to compare with.
 *
 * Null is expected and fine in two cases: a push to the default branch (where the version has
 * already been bumped by the PR that merged) and a clone too shallow to see the base. Returning
 * null skips only the "must increase" rule — format and README checks still run.
 */
function git(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

/** The branch we are on. GitHub sets GITHUB_REF_NAME; locally, ask git. */
function currentBranch() {
  return process.env.GITHUB_REF_NAME || git(['rev-parse', '--abbrev-ref', 'HEAD'])
}

/** The branch we would be merging into. On a PR GitHub sets GITHUB_BASE_REF; otherwise `main`. */
function baseBranch() {
  return process.env.GITHUB_BASE_REF || 'main'
}

/**
 * The version on the base branch, or null when there is nothing meaningful to compare against.
 *
 * Null skips only the "must increase" rule; format and README checks always run. See #40.
 */
function baseVersion() {
  const base = baseBranch()

  if (!shouldCompareAgainstBase({ currentBranch: currentBranch(), baseBranch: base })) {
    return null
  }

  for (const ref of [`origin/${base}`, base]) {
    const json = git(['show', `${ref}:package.json`])
    if (!json) continue // Ref absent (shallow clone) or unreadable — try the next candidate.
    try {
      return JSON.parse(json).version ?? null
    } catch {
      // Present but not valid JSON. Fall through rather than crashing the gate.
    }
  }
  return null
}

const version = JSON.parse(readFileSync('package.json', 'utf8')).version
const readme = readFileSync('README.md', 'utf8')
const base = baseVersion()

const result = checkVersion({ version, baseVersion: base, readme })

if (result.ok) {
  let against
  if (result.comparedAgainstBase) {
    against = `newer than ${base} on ${baseBranch()}`
  } else if (currentBranch() === baseBranch()) {
    // Say which skip this is. A gate that reports "skipped" without saying why is how a
    // permanently-disabled check goes unnoticed.
    against = `on ${baseBranch()} itself, so the increase rule does not apply`
  } else {
    against = `could not read ${baseBranch()} (shallow clone?), so the increase rule was skipped`
  }
  console.log(`check:version — ${version} (${against})`)
  process.exit(0)
}

console.error(`check:version FAILED for version ${version}\n`)
for (const problem of result.problems) console.error(`  • ${problem}`)
console.error('\nSee docs/workflow/versioning.md.')
process.exit(1)
