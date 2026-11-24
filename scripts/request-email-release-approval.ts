import { execFileSync } from 'node:child_process'
import { sendReleaseApprovalRequest } from '../lib/email-release-approval-request'

async function main() {
  const [ticketNumber, verificationSummary] = process.argv.slice(2)
  if (!ticketNumber || !verificationSummary) throw new Error('Usage: request-email-release-approval <ticket> <verification summary>')
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', timeout: 20_000 }).trim()
  const repository = git('remote', 'get-url', '--push', 'origin')
  const ref = git('symbolic-ref', 'HEAD')
  const base = git('rev-parse', 'HEAD')
  const tree = git('write-tree')
  if (tree === git('rev-parse', 'HEAD^{tree}')) throw new Error('No staged changes')
  const [remoteBase, remoteRef] = git('ls-remote', '--exit-code', '--', repository, ref).split('\t')
  if (remoteRef !== ref || remoteBase !== base) throw new Error('Synchronize with the destination before requesting approval')
  const result = await sendReleaseApprovalRequest({ ticketNumber, verificationSummary, repository, ref, base, tree })
  console.log(JSON.stringify({ ...result, ticketNumber, repository, ref, base, tree }))
  if (result.status !== 'pending') process.exitCode = 1
}

main().then(() => process.exit(process.exitCode ?? 0)).catch(() => {
  console.error('Could not create the release approval notification. Check repository, approver and SMTP configuration.')
  process.exit(1)
})
