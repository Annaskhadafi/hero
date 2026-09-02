import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { emailSmtpSettings, emailTemplates, employees } from '@/db/schema/hero'
import { sendEmailViaSmtp, logEmailDeliveryRecord, type EmailAttachment } from '@/lib/email-delivery'
import { getPublicAppUrl } from '@/lib/auth-config'

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function stringifyTemplateValue(value: TemplateVariables[string], isHtml = false) {
  if (value == null) return ''
  let str = ''
  if (value instanceof Date) {
    str = value.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } else {
    str = String(value)
  }
  return isHtml ? escapeHtml(str) : str
}

function renderTemplate(text: string, variables: TemplateVariables, isHtml = false) {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, token: string) => {
    return stringifyTemplateValue(variables[token], isHtml)
  })
}

export function splitEmails(value?: string | string[] | null) {
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

export async function getActiveTemplate(templateCode?: string | null) {
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


export async function getTemplateRecipientScopeEmails(templateCode?: string | null) {
  const template = await getActiveTemplate(templateCode)
  return splitEmails(template?.recipientScope).filter((email) => email.includes('@'))
}

async function getActiveTransportSettings() {
  const [settings] = await db
    .select()
    .from(emailSmtpSettings)
    .orderBy(
      desc(emailSmtpSettings.isActive),
      desc(emailSmtpSettings.updatedAt),
      desc(emailSmtpSettings.id)
    )
    .limit(1)

  if (!settings?.isActive || !settings.host.trim() || !settings.fromEmail.trim()) {
    return null
  }
  return {
    ...settings,
    hasPassword: Boolean(settings.passwordSecret),
  }
}

export function getAppUrl(path = '') {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
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

export function buildSopWinWorkflowEmailContent(input: {
  badgeText?: string
  title: string
  greeting: string
  intro: string
  requestNumber: string
  requesterName: string
  requesterDepartment?: string | null
  requestedDocTitle: string
  procedureName?: string | null
  requestType: string
  expiryDays?: number | string
  requestReason: string
  isExternal?: boolean
  externalCompany?: string | null
  externalName?: string | null
  statusLabel?: string
  remarks?: string
  ctaLabel?: string
  ctaUrl?: string
}) {
  const isSoftcopy = input.requestType?.toLowerCase().includes('soft') || input.requestType === 'softcopy'
  const accessTypeLabel = isSoftcopy ? 'Soft Copy (Link Pratinjau)' : 'Hard Copy (Cetak Fisik)'
  const externalText = input.isExternal
    ? `${input.externalCompany || '-'} (PIC: ${input.externalName || '-'})`
    : 'Internal HERO Platform'

  const html = `
    <div style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;padding:32px 12px">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 35px rgba(15,23,42,0.08);border:1px solid #e2e8f0;border-collapse:separate;border-spacing:0">
              
              <!-- Header Banner -->
              <tr>
                <td style="background:linear-gradient(135deg,#020617 0%,#0f172a 50%,#1e3a8a 100%);padding:26px 32px">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="vertical-align:middle">
                        <p style="margin:0 0 4px;color:#93c5fd;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700">PT CHITRA PARATAMA • HERO PLATFORM</p>
                        <h1 style="margin:0;color:#ffffff;font-size:20px;line-height:1.3;font-weight:800;letter-spacing:-0.02em">${input.title}</h1>
                      </td>
                      <td align="right" style="vertical-align:top;width:130px">
                        <span style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);color:#ffffff;font-size:10px;font-weight:800;padding:5px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em">
                          ${input.badgeText || "SOP / WIN / POL"}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding:28px 32px">
                  <p style="margin:0 0 10px;color:#0f172a;font-size:15px;font-weight:700">${input.greeting}</p>
                  <p style="margin:0 0 22px;color:#334155;font-size:14px;line-height:1.6">${input.intro}</p>

                  <!-- Key-Value Structured Card Table -->
                  <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:12px;padding:20px;margin-bottom:26px">
                    <h3 style="margin:0 0 14px;color:#0f172a;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #e2e8f0;padding-bottom:8px">
                      Detail Form Permintaan Dokumen
                    </h3>

                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;color:#334155;border-collapse:collapse">
                      <tr>
                        <td width="140" style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">No. Permintaan:</td>
                        <td style="padding:6px 0;color:#0f172a;font-weight:800;vertical-align:top">${input.requestNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">Pemohon:</td>
                        <td style="padding:6px 0;color:#0f172a;font-weight:600;vertical-align:top">
                          ${input.requesterName} <span style="color:#64748b;font-weight:normal">(${input.requesterDepartment || 'Internal HERO'})</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">Dokumen Diminta:</td>
                        <td style="padding:6px 0;color:#1e40af;font-weight:700;vertical-align:top;line-height:1.4">
                          ${input.requestedDocTitle.replace(/\n/g, '<br />')}
                        </td>
                      </tr>
                      ${input.procedureName ? `
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">Prosedur / Pemilik:</td>
                        <td style="padding:6px 0;color:#0f172a;vertical-align:top">${input.procedureName}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">Tipe Akses:</td>
                        <td style="padding:6px 0;color:#0f172a;font-weight:700;vertical-align:top">${accessTypeLabel}</td>
                      </tr>
                      ${input.expiryDays ? `
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">Masa Berlaku Akses:</td>
                        <td style="padding:6px 0;color:#0f172a;font-weight:600;vertical-align:top">${input.expiryDays} Hari Masa Aktif</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">Alasan Permintaan:</td>
                        <td style="padding:6px 0;color:#334155;font-style:italic;vertical-align:top">"${input.requestReason}"</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">Keperluan:</td>
                        <td style="padding:6px 0;color:${input.isExternal ? '#92400e' : '#0f172a'};font-weight:600;vertical-align:top">${externalText}</td>
                      </tr>
                      ${input.statusLabel ? `
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">Status Review:</td>
                        <td style="padding:6px 0;color:#059669;font-weight:700;vertical-align:top">${input.statusLabel}</td>
                      </tr>
                      ` : ''}
                      ${input.remarks ? `
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top">Catatan Reviewer:</td>
                        <td style="padding:6px 0;color:#475569;font-style:italic;vertical-align:top">"${input.remarks}"</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>

                  <!-- Action CTA Button -->
                  ${input.ctaUrl ? `
                  <div style="text-align:center;margin:28px 0 20px">
                    <a href="${input.ctaUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block;box-shadow:0 4px 14px rgba(37,99,235,0.25)">
                      ${input.ctaLabel || "Review & Setujui di Inbox Approval"}
                    </a>
                  </div>
                  ` : ''}

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;text-align:center">
                  <p style="margin:0;color:#0f172a;font-size:12px;font-weight:700">PT CHITRA PARATAMA — HERO PLATFORM</p>
                  <p style="margin:4px 0 0;color:#64748b;font-size:11px">Email ini dikirim secara otomatis oleh Sistem HERO. Mohon tidak membalas langsung email ini.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
  `.trim()

  const text = [
    `PT CHITRA PARATAMA — HERO PLATFORM`,
    input.title,
    input.greeting,
    input.intro,
    `----------------------------------------`,
    `No. Permintaan: ${input.requestNumber}`,
    `Pemohon: ${input.requesterName} (${input.requesterDepartment || 'Internal HERO'})`,
    `Dokumen Diminta: ${input.requestedDocTitle}`,
    input.procedureName ? `Prosedur: ${input.procedureName}` : null,
    `Tipe Akses: ${accessTypeLabel}`,
    input.expiryDays ? `Masa Berlaku: ${input.expiryDays} Hari` : null,
    `Alasan: ${input.requestReason}`,
    `Keperluan: ${externalText}`,
    input.statusLabel ? `Status: ${input.statusLabel}` : null,
    input.remarks ? `Catatan: ${input.remarks}` : null,
    `----------------------------------------`,
    input.ctaUrl ? `${input.ctaLabel || 'Buka Link'}: ${input.ctaUrl}` : null,
    `Email ini dikirim secara otomatis oleh Sistem HERO.`,
  ]
    .filter(Boolean)
    .join('\n')

  return { html, text }
}

export async function resolveWorkflowTemplateContent(request: WorkflowTemplateContentRequest) {
  const template = await getActiveTemplate(request.templateCode)
  const rawVars = request.variables ?? {}
  const variables: TemplateVariables = {
    ...rawVars,
    employeeName: rawVars.employeeName ?? rawVars.requesterName ?? rawVars.targetApproverName ?? rawVars.applicantName ?? '',
    requesterName: rawVars.requesterName ?? rawVars.employeeName ?? rawVars.targetApproverName ?? rawVars.applicantName ?? '',
    targetApproverName: rawVars.targetApproverName ?? rawVars.approverName ?? rawVars.employeeName ?? '',
    approverName: rawVars.approverName ?? rawVars.targetApproverName ?? rawVars.managerName ?? '',
    sessionCode: rawVars.sessionCode ?? rawVars.splNumber ?? rawVars.permitNumber ?? '',
    splNumber: rawVars.splNumber ?? rawVars.sessionCode ?? rawVars.permitNumber ?? '',
    permitNumber: rawVars.permitNumber ?? rawVars.splNumber ?? rawVars.sessionCode ?? '',
    approvalLink: rawVars.approvalLink ?? rawVars.viewLink ?? '',
    viewLink: rawVars.viewLink ?? rawVars.approvalLink ?? '',
    revertReason: rawVars.revertReason ?? rawVars.remarks ?? '',
    remarks: rawVars.remarks ?? rawVars.revertReason ?? '',
  }
  const ccList = uniqueEmails([...splitEmails(template?.ccEmail), ...splitEmails(request.cc)])
  const subject = renderTemplate(template?.subject || request.fallbackSubject, variables)
  const html = renderTemplate(template?.htmlContent || request.fallbackHtml || '', variables, true)
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
  const TEST_OVERRIDE_EMAIL = process.env.TEST_OVERRIDE_EMAIL || 'raihanaraya36@gmail.com'
  const recipients = uniqueEmails([...splitEmails(request.to), TEST_OVERRIDE_EMAIL])
  if (recipients.length === 0) {
    const reason = 'Recipient email kosong.'
    await logEmailDeliveryRecord({
      actorEmail: request.actorEmail,
      toEmail: 'N/A',
      ccEmail: Array.isArray(request.cc) ? request.cc.join(', ') : request.cc ?? null,
      subject: request.fallbackSubject,
      templateCode: request.templateCode,
      templateName: request.templateName,
      status: 'failed',
      errorMessage: reason,
      htmlContent: request.fallbackHtml,
      textContent: request.fallbackText,
    })
    return { status: 'skipped' as const, reason }
  }

  const settings = await getActiveTransportSettings()
  if (!settings) {
    const reason = 'SMTP aktif belum dikonfigurasi.'
    await logEmailDeliveryRecord({
      actorEmail: request.actorEmail,
      toEmail: recipients.join(', '),
      ccEmail: Array.isArray(request.cc) ? request.cc.join(', ') : request.cc ?? null,
      subject: request.fallbackSubject,
      templateCode: request.templateCode,
      templateName: request.templateName,
      status: 'failed',
      errorMessage: reason,
      htmlContent: request.fallbackHtml,
      textContent: request.fallbackText,
    })
    return { status: 'skipped' as const, reason }
  }

  const { template, ccList, subject, html, text } = await resolveWorkflowTemplateContent(request)

  try {
    await sendEmailViaSmtp(settings, {
      to: recipients.join(", "),
      cc: ccList,
      subject,
      html: html || undefined,
      text,
      actorEmail: request.actorEmail,
      templateCode: request.templateCode ?? template?.templateCode ?? null,
      templateName: request.templateName ?? template?.name ?? null,
      attachments: request.attachments,
    })

    return {
      status: 'sent' as const,
      sentCount: recipients.length,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Gagal mengirim email via SMTP'
    console.warn(`[Workflow Email] Gagal mengirim email ke ${recipients.join(', ')}: ${errorMsg}`)
    return {
      status: 'failed' as const,
      error: errorMsg,
    }
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

export async function getAttendancePermissionRecipientEmails(siteId?: number | null) {
  const pjoEmails = await getOperationalApprovalRecipientEmails(siteId)
  const hrEmails = await getHumanCapitalRecipientEmails()
  const template = await getActiveTemplate('attendance_permission_reminder')
  const templateCcEmails = splitEmails(template?.ccEmail)
  const combined = [...pjoEmails, ...hrEmails, ...templateCcEmails]

  return Array.from(new Set(combined)).filter((email): email is string => Boolean(email && email.includes('@')))
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
      email: employees.email,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)

  return normalizeEmail(employee?.email)
}

export async function getHrEmployeeContactById(employeeId: number) {
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
