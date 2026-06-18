import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { hcNotificationConfig } from '@/db/schema/hero'
import {
  buildWorkflowEmailContent,
  getHumanCapitalRecipientEmails,
  sendWorkflowEmailToMany,
} from '@/lib/workflow-email'

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeEmail).filter(Boolean)))
}

export function parseEmailList(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return uniqueEmails(value)
  }

  if (!value) {
    return []
  }

  return uniqueEmails(value.split(',').map((item) => item.trim()))
}

export async function getHumanCapitalEmailConfig() {
  const [config] = await db
    .select()
    .from(hcNotificationConfig)
    .orderBy(desc(hcNotificationConfig.updatedAt))
    .limit(1)

  return (
    config ?? {
      id: 0,
      recipientEmails: '',
      ccEmails: '',
      isActive: true,
      updatedAt: new Date(),
    }
  )
}

export async function getHumanCapitalConfiguredRecipients() {
  const config = await getHumanCapitalEmailConfig()
  const configuredTo = config.isActive ? parseEmailList(config.recipientEmails) : []
  const configuredCc = config.isActive ? parseEmailList(config.ccEmails) : []
  const fallbackTeam = config.isActive && configuredTo.length === 0 ? await getHumanCapitalRecipientEmails() : []

  return {
    to: uniqueEmails([...configuredTo, ...fallbackTeam]),
    cc: configuredCc,
    isActive: config.isActive,
  }
}

export async function resolveHumanCapitalRecipients(input?: {
  extraTo?: string | string[] | null
  extraCc?: string | string[] | null
}) {
  const configured = await getHumanCapitalConfiguredRecipients()

  return {
    to: uniqueEmails([...configured.to, ...parseEmailList(input?.extraTo)]),
    cc: uniqueEmails([...configured.cc, ...parseEmailList(input?.extraCc)]),
  }
}

export async function getHumanCapitalPolicyCcRecipients(input?: {
  extraCc?: string | string[] | null
}) {
  const configured = await getHumanCapitalConfiguredRecipients()
  return uniqueEmails([...configured.to, ...configured.cc, ...parseEmailList(input?.extraCc)])
}

export async function sendHumanCapitalEmail(input: {
  templateCode: string
  templateName: string
  fallbackSubject: string
  fallbackHtml: string
  fallbackText: string
  actorEmail?: string | null
  variables?: Record<string, string | number | boolean | Date | null | undefined>
  extraTo?: string | string[] | null
  extraCc?: string | string[] | null
}) {
  const recipients = await resolveHumanCapitalRecipients({
    extraTo: input.extraTo,
    extraCc: input.extraCc,
  })

  if (recipients.to.length === 0) {
    return { status: 'skipped' as const, reason: 'Penerima Human Capital belum dikonfigurasi.' }
  }

  return sendWorkflowEmailToMany({
    recipients: recipients.to,
    cc: recipients.cc,
    actorEmail: input.actorEmail,
    templateCode: input.templateCode,
    templateName: input.templateName,
    variables: input.variables,
    fallbackSubject: input.fallbackSubject,
    fallbackHtml: input.fallbackHtml,
    fallbackText: input.fallbackText,
  })
}

export function buildHumanCapitalEmail(input: {
  title: string
  intro: string
  details?: Array<string | null | undefined>
  ctaLabel?: string
  ctaUrl?: string
}) {
  return buildWorkflowEmailContent({
    title: input.title,
    intro: input.intro,
    details: input.details,
    ctaLabel: input.ctaLabel,
    ctaUrl: input.ctaUrl,
    outro: 'Mohon tindak lanjuti sesuai proses Human Capital yang berlaku.',
  })
}
