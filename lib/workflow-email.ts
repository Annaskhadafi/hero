import { and, eq, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { emailTemplates, employees, hrEmployees } from '@/db/schema/hero'
import { sendEmailViaSmtp, type EmailAttachment } from '@/lib/email-delivery'
import { getPublicAppUrl } from '@/lib/auth-config'
import { getEmailSmtpSettingsData } from '@/lib/hero-admin'

type TemplateVariables = Record<string, string | number | boolean | Date | null | undefined>

type WorkflowEmailRequest = {
  to: string | string[]
  cc?: string | string[] | null
  actorEmail?: string | null
  templateCode?: string | null
  templateName?: string | null
  variables?: TemplateVariables
  fallbackSubject: string
  fallbackHtml?: string
  fallbackText: string
  attachments?: EmailAttachment[]
}

type WorkflowBulkEmailRequest = Omit<WorkflowEmailRequest, 'to'> & {
  recipients: string[]
}

type WorkflowTemplateContentRequest = Pick<
  WorkflowEmailRequest,
  'templateCode' | 'variables' | 'fallbackSubject' | 'fallbackHtml' | 'fallbackText' | 'cc'
>

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeEmail).filter(Boolean)))
}

function stringifyTemplateValue(value: TemplateVariables[string]) {
  if (value == null) return ''
  if (value instanceof Date) {
    return value.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }
  return String(value)
}

function renderTemplate(text: string, variables: TemplateVariables) {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, token: string) => {
    return stringifyTemplateValue(variables[token])
  })
}

function splitEmails(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return uniqueEmails(value)
  }
  if (!value) {
    return []
  }
  return uniqueEmails(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )
}

async function getActiveTemplate(templateCode?: string | null) {
  if (!templateCode?.trim()) {
    return null
  }

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.templateCode, templateCode.trim()), eq(emailTemplates.isActive, true)))
    .limit(1)

  return template ?? null
}

async function getActiveTransportSettings() {
  const settings = await getEmailSmtpSettingsData()
  if (!settings?.isActive || !settings.host.trim() || !settings.fromEmail.trim()) {
    return null
  }
  return settings
}

export function getAppUrl(path = '') {
  const baseUrl = getPublicAppUrl()
  if (!path) return baseUrl
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildWorkflowEmailContent(input: {
  title: string
  greeting?: string
  intro: string
  details?: Array<string | null | undefined>
  ctaLabel?: string
  ctaUrl?: string
  outro?: string
}) {
  const details = input.details?.filter(Boolean) ?? []
  const detailHtml =
    details.length > 0
      ? `<ul style="margin:16px 0;padding-left:20px;color:#0f172a;">${details
          .map((detail) => `<li style="margin:6px 0;">${detail}</li>`)
          .join('')}</ul>`
      : ''
  const detailText = details.length > 0 ? `\n${details.map((detail) => `- ${detail}`).join('\n')}\n` : ''
  const ctaHtml =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:24px 0 0;"><a href="${input.ctaUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">${input.ctaLabel}</a></p>`
      : ''
  const ctaText =
    input.ctaLabel && input.ctaUrl ? `\n${input.ctaLabel}: ${input.ctaUrl}\n` : ''

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">HERO Notification</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;">${input.title}</h1>
      ${input.greeting ? `<p style="margin:0 0 12px;">${input.greeting}</p>` : ''}
      <p style="margin:0 0 12px;">${input.intro}</p>
      ${detailHtml}
      ${ctaHtml}
      ${input.outro ? `<p style="margin:24px 0 0;">${input.outro}</p>` : ''}
      <p style="margin:24px 0 0;color:#64748b;font-size:12px;">Email ini dikirim otomatis oleh HERO.</p>
    </div>
  `.trim()

  const text = [
    input.title,
    input.greeting || '',
    input.intro,
    detailText.trim(),
    ctaText.trim(),
    input.outro || '',
    'Email ini dikirim otomatis oleh HERO.',
  ]
    .filter(Boolean)
    .join('\n\n')

  return { html, text }
}

export async function resolveWorkflowTemplateContent(request: WorkflowTemplateContentRequest) {
  const template = await getActiveTemplate(request.templateCode)
  const variables = request.variables ?? {}
  const ccList = uniqueEmails([...splitEmails(template?.ccEmail), ...splitEmails(request.cc)])
  const subject = renderTemplate(template?.subject || request.fallbackSubject, variables)
  const html = renderTemplate(template?.htmlContent || request.fallbackHtml || '', variables)
  const text = renderTemplate(template?.textContent || request.fallbackText, variables)

  return {
    template,
    ccList,
    subject,
    html: html || undefined,
    text,
  }
}

export async function sendWorkflowEmail(request: WorkflowEmailRequest) {
  const recipients = splitEmails(request.to)
  if (recipients.length === 0) {
    return { status: 'skipped' as const, reason: 'Recipient email kosong.' }
  }

  const settings = await getActiveTransportSettings()
  if (!settings) {
    return { status: 'skipped' as const, reason: 'SMTP aktif belum dikonfigurasi.' }
  }

  const { template, ccList, subject, html, text } = await resolveWorkflowTemplateContent(request)

  await Promise.all(
    recipients.map((to) =>
      sendEmailViaSmtp(settings, {
        to,
        cc: ccList,
        subject,
        html: html || undefined,
        text,
        actorEmail: request.actorEmail,
        templateCode: request.templateCode ?? template?.templateCode ?? null,
        templateName: request.templateName ?? template?.name ?? null,
        attachments: request.attachments,
      })
    )
  )

  return {
    status: 'sent' as const,
    sentCount: recipients.length,
  }
}

export async function sendWorkflowEmailToMany(request: WorkflowBulkEmailRequest) {
  return sendWorkflowEmail({
    ...request,
    to: request.recipients,
  })
}

export async function getHumanCapitalRecipientEmails() {
  const rows = await db
    .select({
      email: employees.email,
    })
    .from(employees)
    .where(
      and(
        eq(employees.isActive, true),
        sql`${employees.email} <> ''`,
        or(
          eq(employees.accessRole, 'HC Manager'),
          sql`lower(${employees.department}) like '%human capital%'`,
          sql`lower(${employees.section}) like '%hr%'`,
          sql`lower(${employees.jobTitle}) like '%hr%'`
        )
      )
    )

  return uniqueEmails(rows.map((row) => row.email))
}

export async function getOperationalApprovalRecipientEmails(siteId?: number | null) {
  const conditions = [
    eq(employees.isActive, true),
    sql`${employees.email} <> ''`,
    or(
      inArray(employees.accessRole, ['Super Admin', 'Site Admin', 'HC Manager']),
      sql`lower(${employees.role}) like '%pjo%'`,
      sql`lower(${employees.jobTitle}) like '%pjo%'`,
      sql`lower(${employees.role}) like '%technical engineer%'`,
      sql`lower(${employees.jobTitle}) like '%technical engineer%'`,
      sql`lower(${employees.role}) like '%technical%'`,
      sql`lower(${employees.jobTitle}) like '%technical%'`
    ),
  ]

  if (siteId != null) {
    conditions.push(
      or(
        eq(employees.siteId, siteId),
        inArray(employees.accessRole, ['Super Admin', 'HC Manager'])
      )!
    )
  }

  const rows = await db
    .select({
      email: employees.email,
    })
    .from(employees)
    .where(and(...conditions))

  return uniqueEmails(rows.map((row) => row.email))
}

export async function getEmployeeEmailById(employeeId: number) {
  const [employee] = await db
    .select({
      email: employees.email,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)

  return normalizeEmail(employee?.email)
}

export async function getEmployeeContactById(employeeId: number) {
  const [employee] = await db
    .select({
      name: employees.name,
      email: employees.email,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)

  return {
    name: employee?.name?.trim() || `Employee #${employeeId}`,
    email: normalizeEmail(employee?.email),
  }
}

export async function getHrEmployeeEmailById(employeeId: number) {
  const [employee] = await db
    .select({
      email: hrEmployees.email,
    })
    .from(hrEmployees)
    .where(eq(hrEmployees.id, employeeId))
    .limit(1)

  return normalizeEmail(employee?.email)
}

export async function getHrEmployeeContactById(employeeId: number) {
  const [employee] = await db
    .select({
      name: hrEmployees.fullName,
      email: hrEmployees.email,
    })
    .from(hrEmployees)
    .where(eq(hrEmployees.id, employeeId))
    .limit(1)

  return {
    name: employee?.name?.trim() || `Employee #${employeeId}`,
    email: normalizeEmail(employee?.email),
  }
}
