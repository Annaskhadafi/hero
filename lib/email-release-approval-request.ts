import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { emailReleaseApprovals } from '@/db/schema/email-release-approval'
import { releasePackageMatches } from '@/lib/email-release-approval'
import { sendWorkflowEmail } from '@/lib/workflow-email'

const mailboxPattern = /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i

// Internal sender only. No HTTP or Server Action entry point until there is a trusted release broker.
export async function sendReleaseApprovalRequest(input: {
  ticketNumber: string; repository: string; ref: string; base: string; tree: string; verificationSummary: string
}) {

  if (!/^(?:TKT-\d{4,}|REL-\d{4,})$/.test(input.ticketNumber)
    || input.repository !== process.env.HERO_RELEASE_APPROVAL_REPOSITORY
    || !releasePackageMatches(input, input)
    || !input.verificationSummary.trim() || input.verificationSummary.length > 1000) {
    throw new Error('Invalid release package')
  }
  const approverId = 5
  const [approver] = await db.select({ email: employees.email, name: employees.name }).from(employees)
    .where(and(eq(employees.id, approverId), eq(employees.isActive, true), eq(employees.employmentStatus, 'active'))).limit(1)
  const recipient = approver?.email.trim().toLowerCase()
  if (!recipient || !mailboxPattern.test(recipient) || approver?.name.trim().toLowerCase() !== 'mochamad annas khadafi') {
    throw new Error('Designated approver is unavailable')
  }
  const id = randomUUID()
  const correlation = randomUUID()
  const messageId = `<hero-release-${correlation}@hero.chitraparatama.com>`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const { ticketNumber, repository, ref, base, tree } = input
  const [created] = await db.insert(emailReleaseApprovals)
    .values({ id, ticketNumber, repository, ref, base, tree, approverId, recipient, messageId, correlation, state: 'sending', expiresAt })
    .onConflictDoNothing().returning({ id: emailReleaseApprovals.id })
  if (!created) return { status: 'duplicate' as const }

  let delivered = false
  try {
    const result = await sendWorkflowEmail({
      to: recipient, exactRecipients: true, exactCc: true, messageId,
      templateCode: 'hero_git_release_approval', variables: { ticketNumber },
      fallbackSubject: `[HERO] Persetujuan commit dan push — ${ticketNumber}`,
      fallbackText: 'Permintaan persetujuan rilis HERO.',
      requiredPlainText: [
        'Notifikasi saja. Setujui commit dan push paket ini melalui permintaan konfirmasi di Telegram. Balasan email tidak diproses.',
        `Tiket: ${ticketNumber}`, `Repository: ${repository}`, `Branch: ${ref}`, `Base: ${base}`, `Tree: ${tree}`,
        `Verifikasi: ${input.verificationSummary}`, `Berlaku sampai: ${expiresAt.toISOString()}`,
      ].join('\n'),
    })
    delivered = result.status === 'sent' && result.messageId === messageId
      && result.accepted.some(value => String(value).trim().toLowerCase() === recipient)
  } finally {
    await db.update(emailReleaseApprovals).set({ state: delivered ? 'pending' : 'delivery_failed' })
      .where(and(eq(emailReleaseApprovals.id, id), eq(emailReleaseApprovals.state, 'sending')))
  }
  return { id, status: delivered ? 'pending' as const : 'delivery_failed' as const }
}
