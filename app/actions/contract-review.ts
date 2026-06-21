'use server'

import { db } from '@/db'
import {
  emailDeliveryLogs,
  emailSmtpSettings,
  employees,
  hcContractReviewApprovals,
  hcContractReviewReminders,
  hcContractReviewSettings,
  hcEmployeeContractReviews,
  masterDepartments,
  masterSections,
} from '@/db/schema/hero'
import { centralServiceEmployees } from '@/db/schema/central-service'
import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { sendEmailViaSmtp, type EmailTransportSettings } from '@/lib/email-delivery'
import { headers } from 'next/headers'
import { getHumanCapitalPolicyCcRecipients } from '@/lib/human-capital-email'
import { resolveWorkflowTemplateContent } from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'

async function getBaseUrl(): Promise<string> {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    try {
      const headersList = await headers()
      const host = headersList.get('host')
      const protocol = headersList.get('x-forwarded-proto') || 'http'
      if (host) {
        baseUrl = `${protocol}://${host}`
      }
    } catch (e) {
      // headers() might throw if run outside request context
    }
  }
  return baseUrl || 'http://localhost:3000'
}


async function getSmtpSettings(): Promise<EmailTransportSettings | null> {
  const [settings] = await db
    .select()
    .from(emailSmtpSettings)
    .where(eq(emailSmtpSettings.isActive, true))
    .orderBy(desc(emailSmtpSettings.updatedAt))
    .limit(1)
  if (!settings) return null
  return {
    host: settings.host,
    port: settings.port,
    encryption: settings.encryption,
    username: settings.username,
    passwordSecret: settings.passwordSecret,
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    replyToEmail: settings.replyToEmail,
    timeoutSeconds: settings.timeoutSeconds,
  }
}

async function sendContractReviewEmail(params: {
  to: string
  subject: string
  body: string
  reviewId: number
  templateCode: string
  variables?: Record<string, string>
}) {
  const smtpSettings = await getSmtpSettings()
  if (!smtpSettings) {
    console.warn('[contract-review] SMTP not configured, email not sent')
    return
  }
  try {
    const hcPolicyCc = await getHumanCapitalPolicyCcRecipients()
    const resolvedTemplate = await resolveWorkflowTemplateContent({
      templateCode: params.templateCode,
      cc: hcPolicyCc,
      variables: params.variables,
      fallbackSubject: params.subject,
      fallbackHtml: params.body.replace(/\n/g, '<br/>'),
      fallbackText: params.body,
    })
    await sendEmailViaSmtp(smtpSettings, {
      to: params.to,
      cc: resolvedTemplate.ccList,
      subject: resolvedTemplate.subject,
      text: resolvedTemplate.text,
      html: resolvedTemplate.html,
      templateCode: params.templateCode,
      templateName: `Contract Review #${params.reviewId}`,
    })
  } catch (error: any) {
    console.error('[contract-review] Email send failed:', error)
  }
}

const DEFAULT_CONTRACT_REVIEW_SETTINGS = {
  approvalMatrix: {
    hoSites: ['Balikpapan', 'Jakarta'],
    managerName: 'Romy Hidayat',
    managerEmail: '',
    hrName: 'Kesuma Bagaskara',
    hrEmail: '',
    sectionHeads: {
      repairRetread: { name: 'Ary Maulana', email: '' },
      serviceMvc: { name: 'Apriyanto', email: '' },
      serviceOthers: { name: 'Junaidi', email: '' },
    },
    pjoKeywords: ['PJO', 'Project Job Officer', 'Technical Engineer', 'Technical', 'TE'],
  },
  emailTemplates: {
    reminder: {
      subject: '[Contract Review] Pengingat: {{employeeName}} ({{employeeSn}}) - Kontrak berakhir {{contractEndDate}}',
      body: `Yth. {{recipientName}},

Kami ingin mengingatkan bahwa masa kontrak karyawan berikut akan segera berakhir:

Nama\t\t: {{employeeName}}
SN\t\t: {{employeeSn}}
Section\t\t: {{employeeSection}}
Site\t\t: {{employeeSite}}
Berakhir\t: {{contractEndDate}}

Mohon segera melakukan Contract Review melalui link berikut:
{{reviewLink}}

Demikian pemberitahuan ini. Terima kasih.

Hormat kami,
HR Department - PT Chitra Paratama`,
    },
    employeeSignature: {
      subject: '[Contract Review] Silakan Tanda Tangan - {{employeeName}} ({{employeeSn}})',
      body: `Yth. {{employeeName}},

Contract Review untuk Anda telah dibuat oleh {{reviewerName}}. Silakan review isi document dan lakukan tanda tangan digital melalui link berikut:

{{approvalLink}}

Link ini bersifat publik dan tidak memerlukan login.

Demikian, mohon untuk segera ditindaklanjuti.

Hormat kami,
HR Department - PT Chitra Paratama`,
    },
    approverSignature: {
      subject: '[Contract Review] Menunggu Persetujuan Anda - {{employeeName}} ({{employeeSn}})',
      body: `Yth. {{approverName}},

Contract Review untuk karyawan berikut memerlukan persetujuan Anda:

Nama\t\t: {{employeeName}}
SN\t\t: {{employeeSn}}
Section\t\t: {{employeeSection}}
Site\t\t: {{employeeSite}}
Tahap\t\t: {{approvalStep}}

Silakan review dan berikan persetujuan melalui link berikut:
{{approvalLink}}

Terima kasih atas perhatian Anda.

Hormat kami,
HR Department - PT Chitra Paratama`,
    },
  },
}

let contractReviewWorkflowTablesPromise: Promise<void> | null = null

async function ensureContractReviewWorkflowTables() {
  if (contractReviewWorkflowTablesPromise) {
    return contractReviewWorkflowTablesPromise
  }

  contractReviewWorkflowTablesPromise = ensureContractReviewWorkflowTablesOnce().catch((error) => {
    contractReviewWorkflowTablesPromise = null
    throw error
  })

  return contractReviewWorkflowTablesPromise
}

async function ensureContractReviewWorkflowTablesOnce() {
  await db.execute(sql`
    create table if not exists hero_hc_contract_review_approvals (
      id serial primary key,
      review_id integer not null references hero_hc_employee_contract_reviews(id) on delete cascade,
      step_order integer not null,
      approval_token text not null unique,
      approver_employee_id integer references hero_employees(id) on delete set null,
      approver_name text not null,
      approver_email text not null default '',
      approver_role text not null,
      status text not null default 'pending',
      signature_data_url text,
      remarks text not null default '',
      signed_at timestamp,
      created_at timestamp not null default now()
    )
  `)
  await db.execute(sql`
    create table if not exists hero_hc_contract_review_reminders (
      id serial primary key,
      employee_id integer,
      employee_sn text not null,
      employee_name text not null,
      section text not null default '',
      site_name text not null default '',
      contract_end_date date not null,
      reminder_type text not null,
      recipient_email text not null default '',
      recipient_name text not null,
      recipient_role text not null,
      sent_at timestamp not null default now(),
      review_id integer references hero_hc_employee_contract_reviews(id) on delete set null
    )
  `)
  await db.execute(sql`
    create table if not exists hero_hc_contract_review_settings (
      id serial primary key,
      setting_key text not null unique,
      setting_value jsonb not null default '{}'::jsonb,
      updated_at timestamp not null default now()
    )
  `)
}

export async function getContractReviewSettings() {
  await ensureContractReviewWorkflowTables()
  const [row] = await db
    .select()
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'contract_review_workflow'))
    .limit(1)
  return (row?.settingValue as typeof DEFAULT_CONTRACT_REVIEW_SETTINGS | undefined) ?? DEFAULT_CONTRACT_REVIEW_SETTINGS
}

export async function saveContractReviewSettings(settings: typeof DEFAULT_CONTRACT_REVIEW_SETTINGS) {
  await ensureContractReviewWorkflowTables()
  const [existing] = await db
    .select({ id: hcContractReviewSettings.id })
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, 'contract_review_workflow'))
    .limit(1)

  if (existing) {
    await db
      .update(hcContractReviewSettings)
      .set({ settingValue: settings, updatedAt: new Date() })
      .where(eq(hcContractReviewSettings.id, existing.id))
  } else {
    await db.insert(hcContractReviewSettings).values({ settingKey: 'contract_review_workflow', settingValue: settings })
  }
  revalidatePath('/dashboard/hc/contract-review')
  return { success: true }
}

function normalizeSn(value: string | null | undefined) {
  return (value ?? '').trim().replace(/^EMP-/i, '')
}

function isHoSite(siteName: string) {
  const site = siteName.toLowerCase()
  return site.includes('balikpapan') || site.includes('jakarta')
}

function isPjoOrTechnical(position: string) {
  const normalized = position.toLowerCase()
  return normalized.includes('pjo') || normalized.includes('technical') || /\bte\b/i.test(position)
}

function parseIsoDate(value: string | null | undefined) {
  if (!value?.trim()) {
    return null
  }

  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDisplayDate(value: Date) {
  return value.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function differenceInCalendarDays(target: Date, reference: Date) {
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  const referenceUtc = Date.UTC(reference.getFullYear(), reference.getMonth(), reference.getDate())
  return Math.round((targetUtc - referenceUtc) / (24 * 60 * 60 * 1000))
}

function normalizeReminderType(daysUntilEnd: number) {
  return `H-${daysUntilEnd}`
}

function getLegacySectionHeadConfig(
  section: string,
  settings = DEFAULT_CONTRACT_REVIEW_SETTINGS,
) {
  const normalized = section.toLowerCase()
  if (normalized.includes('repair') || normalized.includes('retread')) {
    return settings.approvalMatrix.sectionHeads.repairRetread
  }
  if (normalized.includes('mvc')) {
    return settings.approvalMatrix.sectionHeads.serviceMvc
  }
  if (normalized.includes('other')) {
    return settings.approvalMatrix.sectionHeads.serviceOthers
  }

  return {
    name: settings.approvalMatrix.managerName,
    email: settings.approvalMatrix.managerEmail,
  }
}

async function getUserByName(name: string, fallbackEmail?: string) {
  const [row] = await db
    .select({ id: employees.id, name: employees.name, email: employees.email, jobTitle: employees.jobTitle })
    .from(employees)
    .where(eq(employees.name, name))
    .limit(1)
  return row ?? { id: null, name, email: fallbackEmail || '', jobTitle: '' }
}

async function getUserById(employeeId: number | null | undefined) {
  if (!employeeId) {
    return null
  }

  const [row] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)

  return row ?? null
}

async function resolveMasterSectionAndDepartmentHeads(input: {
  sectionId?: number | null
  departmentId?: number | null
  sectionName?: string | null
  departmentName?: string | null
}) {
  let sectionRow:
    | {
        id: number
        name: string
        departmentId: number | null
        headEmployeeId: number | null
      }
    | null = null

  if (input.sectionId) {
    const [row] = await db
      .select({
        id: masterSections.id,
        name: masterSections.name,
        departmentId: masterSections.departmentId,
        headEmployeeId: masterSections.headEmployeeId,
      })
      .from(masterSections)
      .where(eq(masterSections.id, input.sectionId))
      .limit(1)
    sectionRow = row ?? null
  } else if (input.sectionName?.trim()) {
    const [row] = await db
      .select({
        id: masterSections.id,
        name: masterSections.name,
        departmentId: masterSections.departmentId,
        headEmployeeId: masterSections.headEmployeeId,
      })
      .from(masterSections)
      .where(eq(masterSections.name, input.sectionName.trim()))
      .limit(1)
    sectionRow = row ?? null
  }

  const resolvedDepartmentId = input.departmentId ?? sectionRow?.departmentId ?? null

  let departmentRow:
    | {
        id: number
        name: string
        headEmployeeId: number | null
      }
    | null = null

  if (resolvedDepartmentId) {
    const [row] = await db
      .select({
        id: masterDepartments.id,
        name: masterDepartments.name,
        headEmployeeId: masterDepartments.headEmployeeId,
      })
      .from(masterDepartments)
      .where(eq(masterDepartments.id, resolvedDepartmentId))
      .limit(1)
    departmentRow = row ?? null
  } else if (input.departmentName?.trim()) {
    const [row] = await db
      .select({
        id: masterDepartments.id,
        name: masterDepartments.name,
        headEmployeeId: masterDepartments.headEmployeeId,
      })
      .from(masterDepartments)
      .where(eq(masterDepartments.name, input.departmentName.trim()))
      .limit(1)
    departmentRow = row ?? null
  }

  const [sectionHead, departmentHead] = await Promise.all([
    getUserById(sectionRow?.headEmployeeId ?? null),
    getUserById(departmentRow?.headEmployeeId ?? null),
  ])

  return {
    section: sectionRow,
    department: departmentRow,
    sectionHead,
    departmentHead,
  }
}

async function buildContractReviewApprovals(review: typeof hcEmployeeContractReviews.$inferSelect) {
  if (!review.employeeId) return []

  const [hrEmployee] = await db
    .select({
      id: employees.id,
      employeeId: employees.employeeSn,
      fullName: employees.name,
      email: employees.email,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
    })
    .from(employees)
    .where(eq(employees.id, review.employeeId))
    .limit(1)

  if (!hrEmployee) return []

  const sn = normalizeSn(hrEmployee.employeeId)
  const [centralEmployee] = await db
    .select()
    .from(centralServiceEmployees)
    .where(or(eq(centralServiceEmployees.employeeSn, sn), eq(centralServiceEmployees.employeeSn, `EMP-${sn}`)))
    .limit(1)

  const [userEmployee] = await db
    .select({ id: employees.id, name: employees.name, email: employees.email, employeeSn: employees.employeeSn })
    .from(employees)
    .where(or(eq(employees.employeeSn, sn), eq(employees.employeeSn, `EMP-${sn}`)))
    .limit(1)

  const siteName = centralEmployee?.siteName ?? ''
  const section = centralEmployee?.section ?? ''
  const settings = await getContractReviewSettings()
  const isHo = isHoSite(siteName)
  const legacySectionHead = getLegacySectionHeadConfig(section, settings)
  const masterHeads = await resolveMasterSectionAndDepartmentHeads({
    sectionId: hrEmployee.sectionId,
    departmentId: hrEmployee.departmentId,
    sectionName: section || null,
    departmentName: 'Central Services',
  })
  const sectionHead =
    masterHeads.sectionHead ??
    await getUserByName(legacySectionHead.name, legacySectionHead.email)
  const departmentHead =
    masterHeads.departmentHead ??
    await getUserByName(settings.approvalMatrix.managerName, settings.approvalMatrix.managerEmail)
  const hr = await getUserByName(review.hrName || settings.approvalMatrix.hrName, settings.approvalMatrix.hrEmail)

  let firstApprover = sectionHead
  if (!isHo && centralEmployee) {
    const [pjoOrTechnical] = await db
      .select({ id: employees.id, name: employees.name, email: employees.email, jobTitle: employees.jobTitle })
      .from(employees)
      .where(and(eq(employees.workLocation, siteName)))
    if (pjoOrTechnical && isPjoOrTechnical(pjoOrTechnical.jobTitle)) {
      firstApprover = pjoOrTechnical
    }
  }

  const steps = [
    { approver: firstApprover, role: isHo ? 'section_head_initial' : 'pjo_or_te_initial' },
    { approver: { id: userEmployee?.id ?? null, name: hrEmployee.fullName, email: userEmployee?.email ?? hrEmployee.email ?? '', jobTitle: '' }, role: 'employee' },
  ]

  if (!isHo && firstApprover.name !== sectionHead.name) {
    steps.push({ approver: sectionHead, role: 'section_head_confirmation' })
  }

  steps.push({ approver: departmentHead, role: 'central_service_manager' })
  steps.push({ approver: hr, role: 'hr' })

  return steps.map((step, index) => ({
    reviewId: review.id,
    stepOrder: index + 1,
    approvalToken: randomUUID(),
    approverEmployeeId: step.approver.id,
    approverName: step.approver.name,
    approverEmail: step.approver.email ?? '',
    approverRole: step.role,
    status: index === 0 ? 'pending' : 'waiting',
  }))
}

async function getContractReviewReminderContext(review: typeof hcEmployeeContractReviews.$inferSelect) {
  const [approvals, hrEmployee] = await Promise.all([
    db
      .select()
      .from(hcContractReviewApprovals)
      .where(eq(hcContractReviewApprovals.reviewId, review.id))
      .orderBy(asc(hcContractReviewApprovals.stepOrder)),
    review.employeeId
      ? db
          .select({ employeeId: employees.employeeSn })
          .from(employees)
          .where(eq(employees.id, review.employeeId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ])

  const pendingApproval =
    approvals.find((item) => item.status === 'pending') ??
    approvals.find((item) => item.status === 'waiting') ??
    null

  let employeeSection = ''
  let employeeSite = ''
  let employeeSn = ''

  if (hrEmployee?.employeeId) {
    const sn = normalizeSn(hrEmployee.employeeId)
    employeeSn = sn
    const [csEmp] = await db
      .select({
        section: centralServiceEmployees.section,
        siteName: centralServiceEmployees.siteName,
      })
      .from(centralServiceEmployees)
      .where(
        or(
          eq(centralServiceEmployees.employeeSn, sn),
          eq(centralServiceEmployees.employeeSn, `EMP-${sn}`),
        ),
      )
      .limit(1)

    if (csEmp) {
      employeeSection = csEmp.section || ''
      employeeSite = csEmp.siteName || ''
    }
  }

  return {
    pendingApproval,
    employeeSection,
    employeeSite,
    employeeSn,
  }
}

export async function sendDueContractReviewReminders() {
  await ensureContractReviewWorkflowTables()

  const smtpSettings = await getSmtpSettings()
  if (!smtpSettings?.host || !smtpSettings.fromEmail) {
    return { success: false as const, error: 'SMTP belum dikonfigurasi.', sent: 0, skipped: 0 }
  }

  const reminderOffsets = new Set([60, 30, 14, 7, 1])
  const today = new Date()
  const baseUrl = await getBaseUrl()
  const settings = await getContractReviewSettings()

  const reviews = await db
    .select()
    .from(hcEmployeeContractReviews)
    .where(or(eq(hcEmployeeContractReviews.status, 'draft'), eq(hcEmployeeContractReviews.status, 'in_progress')))
    .orderBy(desc(hcEmployeeContractReviews.updatedAt))

  let sent = 0
  let skipped = 0

  for (const review of reviews) {
    const contractEndDate = parseIsoDate(review.contractEndDate)
    if (!contractEndDate) {
      skipped += 1
      continue
    }

    const daysUntilEnd = differenceInCalendarDays(contractEndDate, today)
    if (!reminderOffsets.has(daysUntilEnd)) {
      skipped += 1
      continue
    }

    const reminderType = normalizeReminderType(daysUntilEnd)
    const { pendingApproval, employeeSection, employeeSite, employeeSn } =
      await getContractReviewReminderContext(review)

    if (!pendingApproval?.approverEmail?.trim()) {
      skipped += 1
      continue
    }

    const [existingReminder] = await db
      .select({ id: hcContractReviewReminders.id })
      .from(hcContractReviewReminders)
      .where(
        and(
          eq(hcContractReviewReminders.reviewId, review.id),
          eq(hcContractReviewReminders.reminderType, reminderType),
          eq(hcContractReviewReminders.recipientEmail, pendingApproval.approverEmail),
        ),
      )
      .limit(1)

    if (existingReminder) {
      skipped += 1
      continue
    }

    const reviewLink = `${baseUrl}/dashboard/hc/contract-review/form/${review.id}`
    const approvalLink = `${baseUrl}/review/${pendingApproval.approvalToken}`
    const template = settings.emailTemplates.reminder

    const body = template.body
      .replace(/{{recipientName}}/g, pendingApproval.approverName)
      .replace(/{{reviewerName}}/g, pendingApproval.approverName)
      .replace(/{{employeeName}}/g, review.employeeNameStr || 'Employee')
      .replace(/{{employeeSn}}/g, employeeSn)
      .replace(/{{employeeSection}}/g, employeeSection)
      .replace(/{{employeeSite}}/g, employeeSite)
      .replace(/{{contractEndDate}}/g, formatDisplayDate(contractEndDate))
      .replace(/{{reviewLink}}/g, reviewLink)
      .replace(/{{approverName}}/g, pendingApproval.approverName)
      .replace(/{{approvalStep}}/g, `Step ${pendingApproval.stepOrder}`)
      .replace(/{{approvalLink}}/g, approvalLink)

    const subject = template.subject
      .replace(/{{recipientName}}/g, pendingApproval.approverName)
      .replace(/{{employeeName}}/g, review.employeeNameStr || 'Employee')
      .replace(/{{employeeSn}}/g, employeeSn)
      .replace(/{{contractEndDate}}/g, formatDisplayDate(contractEndDate))

    await sendContractReviewEmail({
      to: pendingApproval.approverEmail,
      subject,
      body,
      reviewId: review.id,
      templateCode: 'contract_review_reminder',
      variables: {
        recipientName: pendingApproval.approverName,
        reviewerName: pendingApproval.approverName,
        employeeName: review.employeeNameStr || 'Employee',
        employeeSn,
        employeeSection,
        employeeSite,
        contractEndDate: formatDisplayDate(contractEndDate),
        reviewLink,
        approverName: pendingApproval.approverName,
        approvalStep: `Step ${pendingApproval.stepOrder}`,
        approvalLink,
      },
    })

    await db.insert(hcContractReviewReminders).values({
      employeeId: review.employeeId,
      employeeSn,
      employeeName: review.employeeNameStr || 'Employee',
      section: employeeSection,
      siteName: employeeSite,
      contractEndDate: contractEndDate.toISOString().slice(0, 10),
      reminderType,
      recipientEmail: pendingApproval.approverEmail,
      recipientName: pendingApproval.approverName,
      recipientRole: pendingApproval.approverRole,
      reviewId: review.id,
      sentAt: new Date(),
    })

    await notifyWorkflowBellRecipients({
      recipientEmails: [pendingApproval.approverEmail],
      eventType: 'contract_review_reminder',
      category: 'approval_requests',
      title: `Reminder contract review ${review.employeeNameStr || 'Employee'}`,
      body: `${reminderType}: kontrak berakhir ${formatDisplayDate(contractEndDate)} dan masih perlu ditindaklanjuti.`,
      url: `/dashboard/hc/contract-review/form/${review.id}`,
      tagPrefix: 'contract-review-reminder',
      metadata: {
        reviewId: review.id,
        reminderType,
      },
    })

    sent += 1
  }

  revalidatePath('/dashboard/hc/contract-review')
  return { success: true as const, sent, skipped }
}

export async function getContractReviews() {
  try {
    await ensureContractReviewWorkflowTables()
    const records = await db.select().from(hcEmployeeContractReviews).orderBy(desc(hcEmployeeContractReviews.createdAt))
    return { success: true, data: records }
  } catch (error: any) {
    console.error('Error fetching contract reviews:', error)
    return { success: false, error: error.message }
  }
}

export async function getContractReviewById(id: number) {
  try {
    const [record] = await db.select().from(hcEmployeeContractReviews).where(eq(hcEmployeeContractReviews.id, id))
    if (!record) return { success: false, error: 'Review not found' }
    return { success: true, data: record }
  } catch (error: any) {
    console.error('Error fetching contract review:', error)
    return { success: false, error: error.message }
  }
}

export async function saveContractReview(data: Partial<typeof hcEmployeeContractReviews.$inferInsert>) {
  try {
    await ensureContractReviewWorkflowTables()
    let saved: any
    if (data.id) {
      const [updated] = await db
        .update(hcEmployeeContractReviews)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(hcEmployeeContractReviews.id, data.id))
        .returning()
      saved = updated

      // If leader signature provided on update, mark first pending approval step as approved
      if (data.leaderSignatureDataUrl) {
        const [firstPending] = await db
          .select()
          .from(hcContractReviewApprovals)
          .where(and(eq(hcContractReviewApprovals.reviewId, data.id), eq(hcContractReviewApprovals.status, 'pending')))
          .orderBy(asc(hcContractReviewApprovals.stepOrder))
          .limit(1)

        if (firstPending) {
          await db
            .update(hcContractReviewApprovals)
            .set({ status: 'approved', signatureDataUrl: data.leaderSignatureDataUrl as string, signedAt: new Date() })
            .where(eq(hcContractReviewApprovals.id, firstPending.id))

          // Mark next step as pending
          const [nextStep] = await db
            .select()
            .from(hcContractReviewApprovals)
            .where(and(eq(hcContractReviewApprovals.reviewId, data.id), eq(hcContractReviewApprovals.status, 'waiting')))
            .orderBy(asc(hcContractReviewApprovals.stepOrder))
            .limit(1)

          if (nextStep) {
            await db.update(hcContractReviewApprovals).set({ status: 'pending' }).where(eq(hcContractReviewApprovals.id, nextStep.id))
            // Send email to next approver
            const reviewId = data.id as number
            const [rev] = await db.select().from(hcEmployeeContractReviews).where(eq(hcEmployeeContractReviews.id, reviewId)).limit(1)
            let employeeSection = '', employeeSite = '', employeeSn = ''
            if (rev?.employeeId) {
              const [hrEmp] = await db.select({ employeeId: employees.employeeSn }).from(employees).where(eq(employees.id, rev.employeeId)).limit(1)
              if (hrEmp) {
                const sn = normalizeSn(hrEmp.employeeId)
                employeeSn = sn
                const [csEmp] = await db.select({ section: centralServiceEmployees.section, siteName: centralServiceEmployees.siteName }).from(centralServiceEmployees).where(or(eq(centralServiceEmployees.employeeSn, sn), eq(centralServiceEmployees.employeeSn, `EMP-${sn}`))).limit(1)
                if (csEmp) { employeeSection = csEmp.section || ''; employeeSite = csEmp.siteName || '' }
              }
            }
            const settings = await getContractReviewSettings()
            const template = settings.emailTemplates.approverSignature
            const baseUrl = await getBaseUrl()
            const body = template.body
              .replace(/{{approverName}}/g, nextStep.approverName)
              .replace(/{{employeeName}}/g, rev?.employeeNameStr || saved?.employeeNameStr || 'Employee')
              .replace(/{{employeeSn}}/g, employeeSn)
              .replace(/{{employeeSection}}/g, employeeSection)
              .replace(/{{employeeSite}}/g, employeeSite)
              .replace(/{{approvalStep}}/g, `Step ${nextStep.stepOrder}`)
              .replace(/{{approvalLink}}/g, `${baseUrl}/review/${nextStep.approvalToken}`)
            await sendContractReviewEmail({
              to: nextStep.approverEmail,
              subject: template.subject.replace(/{{employeeName}}/g, rev?.employeeNameStr || 'Employee').replace(/{{employeeSn}}/g, employeeSn),
              body,
              reviewId,
              templateCode: 'contract_review_approval_notification',
              variables: {
                approverName: nextStep.approverName,
                employeeName: rev?.employeeNameStr || saved?.employeeNameStr || 'Employee',
                employeeSn,
                employeeSection,
                employeeSite,
                approvalStep: `Step ${nextStep.stepOrder}`,
                approvalLink: `${baseUrl}/review/${nextStep.approvalToken}`,
              },
            })
          } else {
            await db.update(hcEmployeeContractReviews).set({ status: 'completed', updatedAt: new Date() }).where(eq(hcEmployeeContractReviews.id, data.id))
          }
        }
      }
    } else {
      const [inserted] = await db
        .insert(hcEmployeeContractReviews)
        .values(data as any)
        .returning()
      saved = inserted
      const approvalSteps = await buildContractReviewApprovals(inserted)
      if (approvalSteps.length > 0) {
        const stepsWithSig = [...approvalSteps]
        // Pass leader signature to first approval step
        if (data.leaderSignatureDataUrl && stepsWithSig[0]) {
          stepsWithSig[0] = { ...stepsWithSig[0] as any, status: 'approved', signatureDataUrl: data.leaderSignatureDataUrl as string, signedAt: new Date() }
          // Mark next step as pending
          if (stepsWithSig[1]) stepsWithSig[1] = { ...stepsWithSig[1] as any, status: 'pending' }
        }
        await db.insert(hcContractReviewApprovals).values(stepsWithSig as any)
        await db.update(hcEmployeeContractReviews).set({ status: 'in_progress' }).where(eq(hcEmployeeContractReviews.id, inserted.id))
        saved = { ...inserted, status: 'in_progress' }
      }
    }

    revalidatePath('/dashboard/hc/contract-review')
    return { success: true, data: saved }
  } catch (error: any) {
    console.error('Error saving contract review:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteContractReview(id: number) {
  try {
    await db.delete(hcEmployeeContractReviews).where(eq(hcEmployeeContractReviews.id, id))
    revalidatePath('/dashboard/hc/contract-review')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting contract review:', error)
    return { success: false, error: error.message }
  }
}

export async function getContractReviewApprovalByToken(token: string) {
  try {
    await ensureContractReviewWorkflowTables()
    const [approval] = await db
      .select()
      .from(hcContractReviewApprovals)
      .where(eq(hcContractReviewApprovals.approvalToken, token))
      .limit(1)
    if (!approval) return { success: false, error: 'Approval not found' }

    const reviewResult = await getContractReviewById(approval.reviewId)
    if (!reviewResult.success) return reviewResult

    // Fetch all approvals for this review to show signature history
    const allApprovals = await db
      .select()
      .from(hcContractReviewApprovals)
      .where(eq(hcContractReviewApprovals.reviewId, approval.reviewId))
      .orderBy(asc(hcContractReviewApprovals.stepOrder))

    return { success: true, data: { approval, review: reviewResult.data, allApprovals } }
  } catch (error: any) {
    console.error('Error fetching contract review approval:', error)
    return { success: false, error: error.message }
  }
}

export async function approveContractReviewStep(
  token: string,
  data: {
    signatureDataUrl: string
    remarks?: string
    recommendation?: string
    contractExtendedMonths?: number
    letterIssuance?: string
  }
) {
  try {
    await ensureContractReviewWorkflowTables()
    const [approval] = await db
      .select()
      .from(hcContractReviewApprovals)
      .where(eq(hcContractReviewApprovals.approvalToken, token))
      .limit(1)
    if (!approval) return { success: false, error: 'Approval not found' }
    if (approval.status === 'approved') return { success: true }

    // If recommendation/letterIssuance are changed, update the master review record
    const updateFields: Record<string, any> = {}
    if (data.recommendation !== undefined) {
      updateFields.recommendation = data.recommendation
    }
    if (data.contractExtendedMonths !== undefined) {
      updateFields.contractExtendedMonths = data.contractExtendedMonths
    }
    if (data.letterIssuance !== undefined) {
      updateFields.letterIssuance = data.letterIssuance
    }
    if (Object.keys(updateFields).length > 0) {
      await db
        .update(hcEmployeeContractReviews)
        .set(updateFields)
        .where(eq(hcEmployeeContractReviews.id, approval.reviewId))
    }

    await db
      .update(hcContractReviewApprovals)
      .set({ status: 'approved', signatureDataUrl: data.signatureDataUrl, remarks: data.remarks ?? '', signedAt: new Date() })
      .where(eq(hcContractReviewApprovals.id, approval.id))

    const [nextApproval] = await db
      .select()
      .from(hcContractReviewApprovals)
      .where(and(eq(hcContractReviewApprovals.reviewId, approval.reviewId), eq(hcContractReviewApprovals.status, 'waiting')))
      .orderBy(asc(hcContractReviewApprovals.stepOrder))
      .limit(1)

    if (nextApproval) {
      await db.update(hcContractReviewApprovals).set({ status: 'pending' }).where(eq(hcContractReviewApprovals.id, nextApproval.id))
      // Send email to next approver
      const [review] = await db.select().from(hcEmployeeContractReviews).where(eq(hcEmployeeContractReviews.id, approval.reviewId)).limit(1)

      // Fetch employee section/site for email variables
      let employeeSection = ''
      let employeeSite = ''
      let employeeSn = ''
      if (review?.employeeId) {
        const [hrEmp] = await db.select({ employeeId: employees.employeeSn }).from(employees).where(eq(employees.id, review.employeeId)).limit(1)
        if (hrEmp) {
          const sn = normalizeSn(hrEmp.employeeId)
          employeeSn = sn
          const [csEmp] = await db.select({ section: centralServiceEmployees.section, siteName: centralServiceEmployees.siteName }).from(centralServiceEmployees).where(or(eq(centralServiceEmployees.employeeSn, sn), eq(centralServiceEmployees.employeeSn, `EMP-${sn}`))).limit(1)
          if (csEmp) {
            employeeSection = csEmp.section || ''
            employeeSite = csEmp.siteName || ''
          }
        }
      }

      const settings = await getContractReviewSettings()
      const template = settings.emailTemplates.approverSignature
      const baseUrl = await getBaseUrl()
      const body = template.body
        .replace(/{{approverName}}/g, nextApproval.approverName)
        .replace(/{{employeeName}}/g, review?.employeeNameStr || 'Employee')
        .replace(/{{employeeSn}}/g, employeeSn)
        .replace(/{{employeeSection}}/g, employeeSection)
        .replace(/{{employeeSite}}/g, employeeSite)
        .replace(/{{approvalStep}}/g, `Step ${nextApproval.stepOrder}`)
        .replace(/{{approvalLink}}/g, `${baseUrl}/review/${nextApproval.approvalToken}`)
      await sendContractReviewEmail({
        to: nextApproval.approverEmail,
        subject: template.subject
          .replace(/{{employeeName}}/g, review?.employeeNameStr || 'Employee')
          .replace(/{{employeeSn}}/g, employeeSn),
        body,
        reviewId: approval.reviewId,
        templateCode: 'contract_review_approval_notification',
        variables: {
          approverName: nextApproval.approverName,
          employeeName: review?.employeeNameStr || 'Employee',
          employeeSn,
          employeeSection,
          employeeSite,
          approvalStep: `Step ${nextApproval.stepOrder}`,
          approvalLink: `${baseUrl}/review/${nextApproval.approvalToken}`,
        },
      })
    } else {
      // Final step completed — update contract dates based on recommendation
      const [review] = await db.select().from(hcEmployeeContractReviews).where(eq(hcEmployeeContractReviews.id, approval.reviewId)).limit(1)
      if (review) {
        const today = new Date()
        const updateData: Record<string, any> = { status: 'completed', updatedAt: today }

        if (review.recommendation === 'contract_extended' && review.contractExtendedMonths) {
          // Extend contract end date
          const hireDate = review.hireDate ? new Date(review.hireDate) : today
          const contractEnd = new Date(hireDate)
          contractEnd.setMonth(contractEnd.getMonth() + review.contractExtendedMonths)
          updateData.contractEndDate = contractEnd.toISOString().slice(0, 10)
        } else if (review.recommendation === 'confirm_permanent') {
          // Set permanent date to today
          updateData.permanentDate = today.toISOString().slice(0, 10)
        }

        await db.update(hcEmployeeContractReviews).set(updateData).where(eq(hcEmployeeContractReviews.id, approval.reviewId))
      }
    }

    revalidatePath('/dashboard/hc/contract-review')
    return { success: true }
  } catch (error: any) {
    console.error('Error approving contract review step:', error)
    return { success: false, error: error.message }
  }
}

export async function generateTestContractReview() {
  try {
    await ensureContractReviewWorkflowTables()

    // Find a Central Service employee with contract end date
    const csResult = await db.execute(sql`
      SELECT cs.id, cs.employee_sn, cs.full_name, cs.section, cs.site_name, cs.join_date
      FROM hero_central_service_employees cs
      WHERE cs.is_active = true AND cs.employee_sn IS NOT NULL
      ORDER BY RANDOM() LIMIT 1
    `)

    const emp = (csResult as any).rows?.[0]
    if (!emp) return { success: false, error: 'No employee found' }

    // Find matching hrEmployee
    const sn = normalizeSn(emp.employee_sn)
    const [hrEmp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(or(eq(employees.employeeSn, sn), eq(employees.employeeSn, `EMP-${sn}`)))
      .limit(1)

    const today = new Date()
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + 45) // ~45 days for testing reminder

    const [inserted] = await db
      .insert(hcEmployeeContractReviews)
      .values({
        employeeId: hrEmp?.id ?? null,
        employeeNameStr: emp.full_name,
        reviewType: 'contract',
        todayDate: today.toISOString().slice(0, 10),
        hireDate: emp.join_date || today.toISOString().slice(0, 10),
        contractLength: '12',
        recommendation: 'contract_extended',
        contractExtendedMonths: 12,
        leaderName: 'Test PJO/TE',
        superiorName: 'Test Section Head',
        hrName: 'Kesuma Bagaskara',
        nextSuperiorName: 'Romy Hidayat',
        status: 'draft',
      })
      .returning()

    const review = inserted

    // Build approval chain — all emails → wustho.c@gmail.com
    const TEST_EMAIL = 'wustho.c@gmail.com'
    const approvalSteps = [
      { reviewId: review.id, stepOrder: 1, approvalToken: randomUUID(), approverEmployeeId: null, approverName: 'Test PJO/TE', approverEmail: TEST_EMAIL, approverRole: 'pjo_or_te_initial', status: 'pending', signatureDataUrl: null as string | null, signedAt: null, remarks: '' },
      { reviewId: review.id, stepOrder: 2, approvalToken: randomUUID(), approverEmployeeId: null, approverName: emp.full_name, approverEmail: TEST_EMAIL, approverRole: 'employee', status: 'waiting', signatureDataUrl: null, signedAt: null, remarks: '' },
      { reviewId: review.id, stepOrder: 3, approvalToken: randomUUID(), approverEmployeeId: null, approverName: 'Test Section Head', approverEmail: TEST_EMAIL, approverRole: 'section_head_confirmation', status: 'waiting', signatureDataUrl: null, signedAt: null, remarks: '' },
      { reviewId: review.id, stepOrder: 4, approvalToken: randomUUID(), approverEmployeeId: null, approverName: 'Romy Hidayat', approverEmail: TEST_EMAIL, approverRole: 'central_service_manager', status: 'waiting', signatureDataUrl: null, signedAt: null, remarks: '' },
      { reviewId: review.id, stepOrder: 5, approvalToken: randomUUID(), approverEmployeeId: null, approverName: 'Kesuma Bagaskara', approverEmail: TEST_EMAIL, approverRole: 'hr', status: 'waiting', signatureDataUrl: null, signedAt: null, remarks: '' },
    ]

    await db.insert(hcContractReviewApprovals).values(approvalSteps as any)
    await db.update(hcEmployeeContractReviews).set({ status: 'in_progress' }).where(eq(hcEmployeeContractReviews.id, review.id))

    // Send test notification email to first approver (PJO/TE) with form link
    const baseUrl = await getBaseUrl()
    await sendContractReviewEmail({
      to: TEST_EMAIL,
      subject: `[TEST] Contract Review - ${emp.full_name}`,
      body: `Halo Test PJO/TE,\n\nContract Review untuk ${emp.full_name} (${emp.employee_sn}) telah dibuat.\n\nSilakan lengkapi form review:\n${baseUrl}/dashboard/hc/contract-review/form/${review.id}\n\nSetelah itu, karyawan akan mendapat link untuk TTD digital.\n\nHormat kami,\nHR Department - PT Chitra Paratama`,
      reviewId: review.id,
      templateCode: 'contract_review_test_notification',
      variables: {
        employeeName: emp.full_name,
        employeeSn: emp.employee_sn,
        reviewLink: `${baseUrl}/dashboard/hc/contract-review/form/${review.id}`,
      },
    })

    const links = approvalSteps.map((s, i) => ({
      step: s.stepOrder,
      role: s.approverRole,
      name: s.approverName,
      // Step 1: PJO/TE or Section Head needs to fill the form → go to form page
      // Steps 2+: only need to preview + sign → go to public approval
      url: i === 0 ? `${baseUrl}/dashboard/hc/contract-review/form/${review.id}` : `${baseUrl}/review/${s.approvalToken}`,
    }))

    revalidatePath('/dashboard/hc/contract-review')
    return { success: true, data: { employee: emp.full_name, links } }
  } catch (error: any) {
    console.error('Error generating test review:', error)
    return { success: false, error: error.message }
  }
}
