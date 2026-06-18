import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { employees, hseSafetyNotificationConfig } from '@/db/schema/hero'
import {
  buildWorkflowEmailContent,
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

export async function getHseSafetyEmailConfig() {
  const [config] = await db
    .select()
    .from(hseSafetyNotificationConfig)
    .orderBy(desc(hseSafetyNotificationConfig.updatedAt))
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

export async function getHseSafetyConfiguredRecipients() {
  const config = await getHseSafetyEmailConfig()

  return {
    to: config.isActive ? parseEmailList(config.recipientEmails) : [],
    cc: config.isActive ? parseEmailList(config.ccEmails) : [],
    isActive: config.isActive,
  }
}

export async function getHseSafetySiteRecipients(siteId?: number | null) {
  if (siteId == null) {
    return []
  }

  const rows = await db
    .select({
      email: employees.email,
    })
    .from(employees)
    .where(and(eq(employees.siteId, siteId), eq(employees.isActive, true)))

  return uniqueEmails(rows.map((row) => row.email))
}

export async function resolveHseSafetyRecipients(input?: {
  extraTo?: string | string[] | null
  extraCc?: string | string[] | null
}) {
  const configured = await getHseSafetyConfiguredRecipients()

  return {
    to: uniqueEmails([...configured.to, ...parseEmailList(input?.extraTo)]),
    cc: uniqueEmails([...configured.cc, ...parseEmailList(input?.extraCc)]),
  }
}

export async function sendHseSafetyEmail(input: {
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
  const recipients = await resolveHseSafetyRecipients({
    extraTo: input.extraTo,
    extraCc: input.extraCc,
  })

  if (recipients.to.length === 0) {
    return { status: 'skipped' as const, reason: 'Penerima HSE Safety belum dikonfigurasi.' }
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

export function buildHseSafetyEmail(input: {
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
    outro: 'Mohon tindak lanjuti sesuai prosedur HSE yang berlaku.',
  })
}
