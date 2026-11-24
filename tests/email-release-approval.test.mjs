import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchReleaseApproval, releasePackageMatches } from '../lib/email-release-approval.ts'

const now = 1000
const request = { state: 'pending', expiresAt: 2000, telegramChatId: '123', confirmationId: 'release-1' }
const reply = { telegramChatId: '123', confirmationId: 'release-1', outcome: 'submitted', choice: 'commit-and-push' }

test('only an explicit Telegram decision in the authorized chat for the live request is accepted', () => {
  assert.equal(matchReleaseApproval(request, reply, now), true)
  for (const change of [{ telegramChatId: '456' }, { confirmationId: 'wrong' }, { outcome: 'cancelled' }, { outcome: 'timed_out' }, { choice: 'reject' }, { choice: null }, { choice: 'SETUJU' }]) {
    assert.equal(matchReleaseApproval(request, { ...reply, ...change }, now), false)
  }
  assert.equal(matchReleaseApproval(request, reply, 2000), false)
  assert.equal(matchReleaseApproval({ ...request, state: 'approved' }, reply, now), false)
})

test('publication requires the exact repository, destination, base, and tree', () => {
  const binding = { repository: 'git@github.com:org/hero.git', ref: 'refs/heads/main', base: 'a'.repeat(40), tree: 'b'.repeat(40) }
  assert.equal(releasePackageMatches(binding, { ...binding }), true)
  for (const key of Object.keys(binding)) assert.equal(releasePackageMatches(binding, { ...binding, [key]: 'changed' }), false)
  assert.equal(releasePackageMatches({ ...binding, tree: '' }, { ...binding, tree: '' }), false)
  assert.equal(releasePackageMatches({ ...binding, ref: 'HEAD' }, { ...binding, ref: 'HEAD' }), false)
})
