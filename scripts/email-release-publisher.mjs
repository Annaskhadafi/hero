import { execFileSync } from 'node:child_process'
import { matchReleaseApproval, releasePackageMatches } from '../lib/email-release-approval.ts'

// The caller must obtain the decision from Hermes and hold the exclusive release lease.
// This module has no CLI, HTTP entry point, or credentials of its own.
export function publishApprovedRelease({ worktree, approved, request, decision }) {
  if (!matchReleaseApproval(request, decision, Date.now()) || request.confirmationId !== approved.confirmationId) {
    throw new Error('No current explicit approval for this release')
  }
  const git = (...args) => execFileSync('git', ['-C', worktree, ...args], {
    encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
  const current = () => ({
    repository: git('remote', 'get-url', '--push', 'origin'),
    ref: git('symbolic-ref', 'HEAD'),
    base: git('rev-parse', 'HEAD'),
    tree: git('write-tree'),
  })
  const upstream = () => {
    const result = git('ls-remote', '--exit-code', '--', approved.repository, approved.ref)
    const [oid, ref] = result.split('\t')
    if (ref !== approved.ref) throw new Error('Unexpected remote branch')
    return oid
  }
  if (!releasePackageMatches(approved, current()) || upstream() !== approved.base || !releasePackageMatches(approved, current())) {
    throw new Error('Release package or remote has changed')
  }
  // Make an exact single-parent commit from the verified tree, without mutating the checkout.
  const commit = git('commit-tree', approved.tree, '-p', approved.base, '-m', 'fix(hero): publish approved release package')
  if (git('rev-parse', `${commit}^{tree}`) !== approved.tree || git('rev-parse', `${commit}^`) !== approved.base) {
    throw new Error('Commit did not match approved package')
  }
  if (!matchReleaseApproval(request, decision, Date.now()) || upstream() !== approved.base || !releasePackageMatches(approved, current())) {
    throw new Error('Release approval or upstream changed before push')
  }
  // A non-force push of a one-parent commit cannot overwrite another writer's new commit.
  git('push', '--', approved.repository, `${commit}:${approved.ref}`)
  if (upstream() !== commit) throw new Error('Push outcome could not be verified')
  return { commit, remoteVerified: true }
}
