import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publishApprovedRelease } from '../scripts/email-release-publisher.mjs'

test('approved package publishes to a disposable remote; rejection, drift and replay fail closed', t => {
  const root = mkdtempSync(join(tmpdir(), 'hero-publish-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const remote = join(root, 'remote.git')
  const worktree = join(root, 'work')
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const work = (...args) => git('-C', worktree, ...args)
  git('init', '--bare', remote)
  git('init', '-b', 'main', worktree)
  work('config', 'user.name', 'Fixture')
  work('config', 'user.email', 'fixture@example.test')
  work('remote', 'add', 'origin', remote)
  work('commit', '--allow-empty', '-m', 'Fixture base')
  work('push', 'origin', 'main')
  const file = join(worktree, 'fixture.md')
  const stage = text => { writeFileSync(file, text); work('add', 'fixture.md') }
  stage('fixture approval')
  const confirmationId = 'fixture-1'
  const approved = { confirmationId, repository: remote, ref: 'refs/heads/main', base: work('rev-parse', 'HEAD'), tree: work('write-tree') }
  const request = { confirmationId, telegramChatId: '123', expiresAt: Date.now() + 60_000, state: 'pending' }
  const decision = { confirmationId, telegramChatId: '123', outcome: 'submitted', choice: 'commit-and-push' }
  const payload = { worktree, approved, request, decision }
  const head = () => git('--git-dir', remote, 'rev-parse', 'refs/heads/main')
  assert.throws(() => publishApprovedRelease({ ...payload, decision: { ...decision, choice: 'reject' } }), /No current/)
  stage('different content')
  assert.throws(() => publishApprovedRelease(payload), /changed/)
  assert.equal(head(), approved.base)
  stage('fixture approval')
  const result = publishApprovedRelease(payload)
  assert.equal(result.remoteVerified, true)
  assert.equal(head(), result.commit)
  assert.equal(git('--git-dir', remote, 'rev-parse', `${result.commit}^{tree}`), approved.tree)
  assert.throws(() => publishApprovedRelease(payload), /changed/)
})
