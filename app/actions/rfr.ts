'use server'

import { db } from '@/db'
import {
  emailSmtpSettings,
  employees,
  hcRecruitments,
  hcRfrApprovals,
  hcRfrRequests,
  hcRfrSettings,
} from '@/db/schema/hero'
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { sendEmailViaSmtp, type EmailTransportSettings } from '@/lib/email-delivery'
import { headers } from 'next/headers'
import { getHumanCapitalPolicyCcRecipients } from '@/lib/human-capital-email'
import { resolveWorkflowTemplateContent } from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { generateRfrPdf, type RfrPdfData } from '@/lib/rfr-pdf'

async function getBaseUrl(): Promise<string> {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    try {
      const headersList = await headers()
      const host = headersList.get('host')
      const protocol = headersList.get('x-forwarded-proto') || 'http'
      if (host) baseUrl = `${protocol}://${host}`
    } catch (e) {
      // headers fallback
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

export type RfrMatrixStep = {
  stepOrder: number
  stepKey: string
  roleLabel: string
  approverName: string
  approverEmail: string
  approverTitle: string
}

const DEFAULT_RFR_MATRIX: RfrMatrixStep[] = [
  { stepOrder: 1, stepKey: 'purposed', roleLabel: 'Purposed', approverName: 'Junaidi', approverEmail: '', approverTitle: 'Service operation Others Coord' },
  { stepOrder: 2, stepKey: 'hc_verification', roleLabel: 'HC Verification', approverName: 'Adilla Tri Arizona', approverEmail: '', approverTitle: 'HR Recruitment & GA Staff' },
  { stepOrder: 3, stepKey: 'acknowledge_hr_leader', roleLabel: 'Acknowledge', approverName: 'Kesuma Bagaskara', approverEmail: '', approverTitle: 'Leader HR-GA' },
  { stepOrder: 4, stepKey: 'acknowledge_hr_spv', roleLabel: 'Acknowledge', approverName: 'Muhammad Iqbal', approverEmail: '', approverTitle: 'Human Capital Spv' },
  { stepOrder: 5, stepKey: 'acknowledge_dept_head', roleLabel: 'Acknowledge', approverName: 'Romy Hidayat', approverEmail: '', approverTitle: 'Central Service Manager' },
  { stepOrder: 6, stepKey: 'approval_gm', roleLabel: 'Approval', approverName: 'Person Sihaloho', approverEmail: '', approverTitle: 'General Manager' },
]

async function resolveSectionHeadBySection(sectionDepartmentStr: string) {
  const norm = (sectionDepartmentStr || '').trim()
  if (!norm) {
    return { name: 'Junaidi', title: 'Service operation Others Coord', email: '' }
  }

  const parts = norm.split('/')
  const sectionTerm = parts[0].trim()

  try {
    const secRows = await db
      .select({
        headEmployeeId: masterSections.headEmployeeId,
        sectionName: masterSections.name,
      })
      .from(masterSections)
      .where(ilike(masterSections.name, `%${sectionTerm}%`))
      .limit(1)

    if (secRows.length > 0 && secRows[0].headEmployeeId) {
      const headEmp = await db
        .select({
          name: employees.name,
          position: employees.position,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, secRows[0].headEmployeeId))
        .limit(1)

      if (headEmp.length > 0 && headEmp[0].name) {
        return {
          name: headEmp[0].name,
          title: headEmp[0].position || `${secRows[0].sectionName} Head`,
          email: headEmp[0].email || '',
        }
      }
    }
  } catch (err) {
    console.error('Error resolving section head:', err)
  }

  const normLower = norm.toLowerCase()
  if (normLower.includes('repair') || normLower.includes('retread')) {
    return { name: 'Ary Maulana', title: 'Repair & Retread Coord', email: '' }
  }
  if (normLower.includes('mvc')) {
    return { name: 'Apriyanto', title: 'Service MVC Coord', email: '' }
  }
  return { name: 'Junaidi', title: 'Service operation Others Coord', email: '' }
}

async function resolveDeptHeadByDepartment(sectionDepartmentStr: string) {
  const norm = (sectionDepartmentStr || '').trim()
  if (!norm) {
    return { name: 'Romy Hidayat', title: 'Central Service Manager', email: '' }
  }

  // Parse "Section / Department" if formatted as split
  const parts = norm.split('/')
  const deptTerm = (parts.length > 1 ? parts[1] : parts[0]).trim()

  try {
    // 1. Check masterDepartments headEmployeeId
    const deptRows = await db
      .select({
        headEmployeeId: masterDepartments.headEmployeeId,
        deptName: masterDepartments.name,
      })
      .from(masterDepartments)
      .where(ilike(masterDepartments.name, `%${deptTerm}%`))
      .limit(1)

    if (deptRows.length > 0 && deptRows[0].headEmployeeId) {
      const headEmp = await db
        .select({
          name: employees.name,
          position: employees.position,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, deptRows[0].headEmployeeId))
        .limit(1)

      if (headEmp.length > 0 && headEmp[0].name) {
        return {
          name: headEmp[0].name,
          title: headEmp[0].position || `${deptRows[0].deptName} Manager`,
          email: headEmp[0].email || '',
        }
      }
    }

    // 2. Search employees in department with Manager/Head in position
    const managerRows = await db
      .select({
        name: employees.name,
        position: employees.position,
        email: employees.email,
        deptName: masterDepartments.name,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .where(
        and(
          ilike(masterDepartments.name, `%${deptTerm}%`),
          or(
            ilike(employees.position, '%manager%'),
            ilike(employees.position, '%head%'),
            ilike(employees.employmentStatus, '%manager%')
          )
        )
      )
      .limit(1)

    if (managerRows.length > 0 && managerRows[0].name) {
      return {
        name: managerRows[0].name,
        title: managerRows[0].position || `${managerRows[0].deptName || deptTerm} Manager`,
        email: managerRows[0].email || '',
      }
    }
  } catch (err) {
    console.error('Error resolving dept head:', err)
  }

  return { name: 'Romy Hidayat', title: 'Central Service Manager', email: '' }
}

export async function resolveRfrMatrixAction(sectionDepartment: string): Promise<RfrMatrixStep[]> {
  return await getRfrMatrixSettings(sectionDepartment)
}

export async function getRfrMatrixSettings(sectionDepartment?: string): Promise<RfrMatrixStep[]> {
  let matrix = [...DEFAULT_RFR_MATRIX]
  try {
    const [settingRow] = await db
      .select()
      .from(hcRfrSettings)
      .where(eq(hcRfrSettings.settingKey, 'approval_matrix'))
      .limit(1)

    if (settingRow && Array.isArray(settingRow.settingValue) && settingRow.settingValue.length === 6) {
      matrix = settingRow.settingValue as RfrMatrixStep[]
    }
  } catch (e) {
    // fallback default
  }

  if (sectionDepartment) {
    const sh = await resolveSectionHeadBySection(sectionDepartment)
    const dh = await resolveDeptHeadByDepartment(sectionDepartment)

    matrix = matrix.map((step) => {
      if (step.stepOrder === 1) {
        return {
          ...step,
          approverName: sh.name,
          approverTitle: sh.title,
          approverEmail: step.approverEmail || sh.email,
        }
      }
      if (step.stepOrder === 5) {
        return {
          ...step,
          approverName: dh.name,
          approverTitle: dh.title,
          approverEmail: step.approverEmail || dh.email,
        }
      }
      return step
    })
  }

  return matrix
}

async function sendRfrApprovalEmail(params: {
  to: string
  approverName: string
  approvalStep: string
  rfr: any
  approvals: any[]
  approvalToken: string
}) {
  const smtpSettings = await getSmtpSettings()
  if (!smtpSettings) {
    console.warn('[RFR] SMTP settings active not found, skipping email')
    return
  }

  const baseUrl = await getBaseUrl()
  const approvalLink = `${baseUrl}/review/rfr/${params.approvalToken}`

  // Build PDF Attachment
  const pdfBuffer = await generateRfrPdf({
    rfrNumber: params.rfr.rfrNumber,
    requestDate: params.rfr.requestDate,
    joinDateEstimation: params.rfr.joinDateEstimation,
    requestorName: params.rfr.requestorName,
    sectionDepartment: params.rfr.sectionDepartment,
    receivedByHr: params.rfr.receivedByHr,
    positionTitle: params.rfr.positionTitle,
    numberOfPersons: params.rfr.numberOfPersons,
    briefJobDescription: params.rfr.briefJobDescription,
    level: params.rfr.level,
    reasonForRequest: params.rfr.reasonForRequest,
    mppStatus: params.rfr.mppStatus,
    reasonsIfNonBudgeted: params.rfr.reasonsIfNonBudgeted,
    employmentStatus: params.rfr.employmentStatus,
    contractDurationMonths: params.rfr.contractDurationMonths,
    attachmentMpp: params.rfr.attachmentMpp,
    attachmentJd: params.rfr.attachmentJd,
    sexPreference: params.rfr.sexPreference,
    agePreference: params.rfr.agePreference,
    educationDegree: params.rfr.educationDegree,
    educationBackground: params.rfr.educationBackground,
    yearsOfExperience: params.rfr.yearsOfExperience,
    fieldOfJobExperience: params.rfr.fieldOfJobExperience,
    functionalCompetencies: params.rfr.functionalCompetencies,
    approvals: params.approvals,
  })

  try {
    const hcPolicyCc = await getHumanCapitalPolicyCcRecipients()
    const resolvedTemplate = await resolveWorkflowTemplateContent({
      templateCode: 'rfr_approver_notification',
      cc: hcPolicyCc,
      variables: {
        approverName: params.approverName,
        approvalStep: params.approvalStep,
        rfrNumber: params.rfr.rfrNumber,
        requestorName: params.rfr.requestorName,
        sectionDepartment: params.rfr.sectionDepartment,
        positionTitle: params.rfr.positionTitle,
        numberOfPersons: String(params.rfr.numberOfPersons),
        joinDateEstimation: params.rfr.joinDateEstimation,
        approvalLink,
      },
      fallbackSubject: `[RFR] Menunggu Persetujuan Anda: ${params.rfr.rfrNumber} - ${params.rfr.positionTitle} (${params.rfr.numberOfPersons} Orang)`,
      fallbackHtml: `<p>Yth. ${params.approverName},</p><p>Permohonan Rekrutmen (RFR) <strong>${params.rfr.rfrNumber}</strong> (${params.rfr.positionTitle}) memerlukan persetujuan/verifikasi Anda pada tahap <strong>${params.approvalStep}</strong>.</p><p><a href="${approvalLink}">Buka &amp; Tanda Tangan RFR</a></p><p>Dokumen lengkap RFR dalam format PDF dilampirkan pada email ini.</p>`,
      fallbackText: `Yth. ${params.approverName},\n\nPermohonan RFR ${params.rfr.rfrNumber} (${params.rfr.positionTitle}) memerlukan persetujuan Anda.\nLink: ${approvalLink}`,
    })

    if (params.to && params.to.trim()) {
      await sendEmailViaSmtp(smtpSettings, {
        to: params.to.trim(),
        cc: resolvedTemplate.ccList,
        subject: resolvedTemplate.subject,
        text: resolvedTemplate.text,
        html: resolvedTemplate.html,
        templateCode: 'rfr_approver_notification',
        templateName: `RFR Approval #${params.rfr.rfrNumber}`,
        attachments: [
          {
            filename: `${params.rfr.rfrNumber}_Request_For_Recruitment.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      })
    }
  } catch (error) {
    console.error('[RFR] Email send failed:', error)
  }
}

async function autoCreateRecruitmentFromRfr(rfr: any) {
  try {
    const reqList: string[] = []
    if (rfr.sexPreference && rfr.sexPreference !== 'any') reqList.push(`Jenis Kelamin: ${rfr.sexPreference === 'male' ? 'Laki-laki' : 'Perempuan'}`)
    if (rfr.agePreference && rfr.agePreference !== 'any') reqList.push(`Usia: ${rfr.agePreference}`)
    if (rfr.educationDegree && rfr.educationDegree !== 'any') reqList.push(`Pendidikan: ${rfr.educationDegree.toUpperCase()}`)
    if (Array.isArray(rfr.educationBackground) && rfr.educationBackground.length > 0) reqList.push(`Jurusan: ${rfr.educationBackground.join(', ')}`)
    if (rfr.yearsOfExperience && rfr.yearsOfExperience !== 'any') reqList.push(`Pengalaman: ${rfr.yearsOfExperience}`)
    if (rfr.fieldOfJobExperience) reqList.push(`Bidang Pengalaman: ${rfr.fieldOfJobExperience}`)

    if (Array.isArray(rfr.functionalCompetencies) && rfr.functionalCompetencies.length > 0) {
      reqList.push('Kompetensi Fungsional:')
      rfr.functionalCompetencies.forEach((c: any, i: number) => {
        if (c.skillName) reqList.push(`  ${i + 1}. ${c.skillName} (${c.level || 'basic'}) ${c.remarks ? `- ${c.remarks}` : ''}`)
      })
    }

    const requirementsFormatted = reqList.join('\n')

    const [recruitment] = await db
      .insert(hcRecruitments)
      .values({
        jobTitle: rfr.positionTitle,
        department: rfr.sectionDepartment,
        section: rfr.sectionDepartment,
        location: 'HO / Site',
        totalRequested: rfr.numberOfPersons || 1,
        status: 'Sourcing',
        isPublic: true,
        jobDescription: rfr.briefJobDescription || `Recruitment untuk posisi ${rfr.positionTitle} berdasarkan RFR ${rfr.rfrNumber}.`,
        requirements: requirementsFormatted,
        rfrId: rfr.id,
      })
      .returning({ id: hcRecruitments.id })

    if (recruitment?.id) {
      await db
        .update(hcRfrRequests)
        .set({ generatedRecruitmentId: recruitment.id })
        .where(eq(hcRfrRequests.id, rfr.id))
    }

    return recruitment?.id || null
  } catch (error) {
    console.error('[RFR] Auto create recruitment failed:', error)
    return null
  }
}

export async function createRfrRequest(data: {
  requestDate: string
  joinDateEstimation: string
  requestorName: string
  requestorEmployeeId?: number | null
  sectionDepartment: string
  receivedByHr?: string
  positionTitle: string
  numberOfPersons: number
  briefJobDescription: string
  level: string
  reasonForRequest: string
  mppStatus: string
  reasonsIfNonBudgeted?: string
  employmentStatus: string
  contractDurationMonths?: number | null
  attachmentMpp?: boolean
  attachmentJd?: boolean
  uploadedAttachmentUrls?: string[]
  sexPreference?: string
  agePreference?: string
  educationDegree?: string
  educationBackground?: string[]
  yearsOfExperience?: string
  fieldOfJobExperience?: string
  functionalCompetencies?: Array<{ skillName: string; level: string; remarks: string }>
}) {
  try {
    const year = new Date().getFullYear()
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(hcRfrRequests)
    const seq = (countResult?.count || 0) + 1
    const rfrNumber = `RFR-${year}-${String(seq).padStart(4, '0')}`

    const matrix = await getRfrMatrixSettings(data.sectionDepartment)

    const [rfr] = await db
      .insert(hcRfrRequests)
      .values({
        rfrNumber,
        requestDate: data.requestDate,
        joinDateEstimation: data.joinDateEstimation,
        requestorName: data.requestorName,
        requestorEmployeeId: data.requestorEmployeeId || null,
        sectionDepartment: data.sectionDepartment,
        receivedByHr: data.receivedByHr || '',
        positionTitle: data.positionTitle,
        numberOfPersons: data.numberOfPersons || 1,
        briefJobDescription: data.briefJobDescription || '',
        level: data.level || 'non_staff',
        reasonForRequest: data.reasonForRequest || 'new_headcount',
        mppStatus: data.mppStatus || 'budgeted',
        reasonsIfNonBudgeted: data.reasonsIfNonBudgeted || '',
        employmentStatus: data.employmentStatus || 'contract',
        contractDurationMonths: data.contractDurationMonths || 6,
        attachmentMpp: Boolean(data.attachmentMpp),
        attachmentJd: Boolean(data.attachmentJd !== false),
        uploadedAttachmentUrls: data.uploadedAttachmentUrls || [],
        sexPreference: data.sexPreference || 'any',
        agePreference: data.agePreference || 'any',
        educationDegree: data.educationDegree || 'any',
        educationBackground: data.educationBackground || [],
        yearsOfExperience: data.yearsOfExperience || 'any',
        fieldOfJobExperience: data.fieldOfJobExperience || '',
        functionalCompetencies: data.functionalCompetencies || [],
        currentStepOrder: 1,
        status: 'in_progress',
      })
      .returning()

    const approvalsToInsert = matrix.map((step) => ({
      rfrId: rfr.id,
      stepOrder: step.stepOrder,
      stepKey: step.stepKey,
      roleLabel: step.roleLabel,
      approverName: step.approverName,
      approverEmail: step.approverEmail,
      approverTitle: step.approverTitle,
      approvalToken: randomUUID(),
      status: 'pending',
    }))

    const insertedApprovals = await db.insert(hcRfrApprovals).values(approvalsToInsert).returning()

    // Dispatch notification & email to Step 1 (Purposed / Section Head)
    const step1 = insertedApprovals.find((a) => a.stepOrder === 1)
    if (step1) {
      await sendRfrApprovalEmail({
        to: step1.approverEmail,
        approverName: step1.approverName,
        approvalStep: `${step1.roleLabel} (Langkah 1/6)`,
        rfr,
        approvals: insertedApprovals,
        approvalToken: step1.approvalToken,
      })
    }

    try {
      revalidatePath('/dashboard/hc/rfr')
      revalidatePath('/dashboard/approval')
    } catch (e) {}

    return { success: true, rfrId: rfr.id, rfrNumber }
  } catch (error: any) {
    console.error('[RFR] Create request failed:', error)
    return { success: false, error: error.message || 'Gagal membuat request RFR.' }
  }
}

export async function approveRfrStep(
  token: string,
  payload: {
    signatureDataUrl: string
    remarks?: string
  }
) {
  try {
    const [approval] = await db
      .select()
      .from(hcRfrApprovals)
      .where(eq(hcRfrApprovals.approvalToken, token))
      .limit(1)

    if (!approval) {
      return { success: false, error: 'Token approval RFR tidak ditemukan.' }
    }

    if (approval.status === 'approved') {
      return { success: true, message: 'Langkah ini sudah disetujui sebelumnya.' }
    }

    const [rfr] = await db
      .select()
      .from(hcRfrRequests)
      .where(eq(hcRfrRequests.id, approval.rfrId))
      .limit(1)

    if (!rfr) {
      return { success: false, error: 'Data RFR tidak ditemukan.' }
    }

    // Mark current approval step approved
    await db
      .update(hcRfrApprovals)
      .set({
        status: 'approved',
        signatureDataUrl: payload.signatureDataUrl,
        remarks: payload.remarks || '',
        signedAt: new Date(),
      })
      .where(eq(hcRfrApprovals.id, approval.id))

    const allApprovals = await db
      .select()
      .from(hcRfrApprovals)
      .where(eq(hcRfrApprovals.rfrId, rfr.id))
      .orderBy(asc(hcRfrApprovals.stepOrder))

    const nextStepOrder = approval.stepOrder + 1

    if (nextStepOrder <= 6) {
      // Advance to next step
      await db
        .update(hcRfrRequests)
        .set({ currentStepOrder: nextStepOrder })
        .where(eq(hcRfrRequests.id, rfr.id))

      const nextApproval = allApprovals.find((a) => a.stepOrder === nextStepOrder)
      if (nextApproval) {
        await sendRfrApprovalEmail({
          to: nextApproval.approverEmail,
          approverName: nextApproval.approverName,
          approvalStep: `${nextApproval.roleLabel} (Langkah ${nextStepOrder}/6)`,
          rfr,
          approvals: allApprovals,
          approvalToken: nextApproval.approvalToken,
        })
      }
    } else {
      // Step 6 (GM) Approved -> RFR Approved!
      await db
        .update(hcRfrRequests)
        .set({ status: 'approved', currentStepOrder: 6 })
        .where(eq(hcRfrRequests.id, rfr.id))

      // Auto-generate Lowongan Pekerjaan (hcRecruitments)
      await autoCreateRecruitmentFromRfr(rfr)
    }

    try {
      revalidatePath('/dashboard/hc/rfr')
      revalidatePath('/dashboard/approval')
    } catch (e) {}

    return { success: true }
  } catch (error: any) {
    console.error('[RFR] Approve step failed:', error)
    return { success: false, error: error.message || 'Gagal memproses persetujuan RFR.' }
  }
}

export async function rejectRfrStep(token: string, remarks: string) {
  try {
    const [approval] = await db
      .select()
      .from(hcRfrApprovals)
      .where(eq(hcRfrApprovals.approvalToken, token))
      .limit(1)

    if (!approval) return { success: false, error: 'Token approval tidak valid.' }

    await db
      .update(hcRfrApprovals)
      .set({
        status: 'rejected',
        remarks: remarks || 'Permohonan Ditolak',
        signedAt: new Date(),
      })
      .where(eq(hcRfrApprovals.id, approval.id))

    await db
      .update(hcRfrRequests)
      .set({
        status: 'rejected',
        rejectionReason: remarks || 'Permohonan Ditolak',
      })
      .where(eq(hcRfrRequests.id, approval.rfrId))

    try {
      revalidatePath('/dashboard/hc/rfr')
      revalidatePath('/dashboard/approval')
    } catch (e) {}

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function listRfrRequests(params?: { search?: string; status?: string; page?: number; limit?: number }) {
  const page = params?.page || 1
  const limit = params?.limit || 20
  const offset = (page - 1) * limit

  const conditions = []
  if (params?.status && params.status !== 'all') {
    conditions.push(eq(hcRfrRequests.status, params.status))
  }
  if (params?.search?.trim()) {
    const query = `%${params.search.trim()}%`
    conditions.push(
      or(
        ilike(hcRfrRequests.rfrNumber, query),
        ilike(hcRfrRequests.positionTitle, query),
        ilike(hcRfrRequests.requestorName, query),
        ilike(hcRfrRequests.sectionDepartment, query)
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [data, totalCount] = await Promise.all([
    db
      .select()
      .from(hcRfrRequests)
      .where(whereClause)
      .orderBy(desc(hcRfrRequests.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(hcRfrRequests)
      .where(whereClause),
  ])

  return {
    data,
    total: totalCount[0]?.count || 0,
    page,
    limit,
    totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
  }
}

export async function getRfrDetail(id: number) {
  const [rfr] = await db
    .select()
    .from(hcRfrRequests)
    .where(eq(hcRfrRequests.id, id))
    .limit(1)

  if (!rfr) return null

  const approvals = await db
    .select()
    .from(hcRfrApprovals)
    .where(eq(hcRfrApprovals.rfrId, id))
    .orderBy(asc(hcRfrApprovals.stepOrder))

  return { rfr, approvals }
}

export async function getRfrPublicApprovalByToken(token: string) {
  const [approval] = await db
    .select()
    .from(hcRfrApprovals)
    .where(eq(hcRfrApprovals.approvalToken, token))
    .limit(1)

  if (!approval) return null

  const detail = await getRfrDetail(approval.rfrId)
  if (!detail) return null

  return {
    approval,
    rfr: detail.rfr,
    approvals: detail.approvals,
  }
}

export async function generateTestRfr(customEmail?: string) {
  try {
    const targetEmail = (customEmail || 'wustho.c@gmail.com').trim()
    const year = new Date().getFullYear()
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(hcRfrRequests)
    const seq = (countResult?.count || 0) + 1
    const rfrNumber = `RFR-${year}-TEST-${String(seq).padStart(4, '0')}`

    const todayStr = new Date().toISOString().slice(0, 10)
    const joinEstStr = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

    const [rfr] = await db
      .insert(hcRfrRequests)
      .values({
        rfrNumber,
        requestDate: todayStr,
        joinDateEstimation: joinEstStr,
        requestorName: 'Test Requestor (PJO)',
        sectionDepartment: 'Service / Operation',
        receivedByHr: 'Test HR Staff',
        positionTitle: 'Test Service Mechanic Specialist',
        numberOfPersons: 2,
        briefJobDescription: 'Melakukan pemeliharaan dan perbaikan unit kendaraan operasional site secara berkala.',
        level: 'staff',
        reasonForRequest: 'new_headcount',
        mppStatus: 'budgeted',
        reasonsIfNonBudgeted: '',
        employmentStatus: 'contract',
        contractDurationMonths: 12,
        attachmentMpp: true,
        attachmentJd: true,
        uploadedAttachmentUrls: [
          '/HERO_RMS_Suggestion_System.pdf',
          '/ChitraParatama_Stationery_Letterhead_jkt.jpg',
          '/CERTIFICATE-LMS-CLEAR.png',
        ],
        sexPreference: 'any',
        agePreference: '21 - 35 Tahun',
        educationDegree: 'smk_d3',
        educationBackground: ['Teknik Mesin', 'Otomotif'],
        yearsOfExperience: '2-3_years',
        fieldOfJobExperience: 'Perbaikan unit berat & mekanik dasar',
        functionalCompetencies: [
          { skillName: 'Basic Engine Overhaul', level: 'intermediate', remarks: 'Dapat membongkar dan menguji komponen utama' },
          { skillName: 'Hydraulic System Troubleshooting', level: 'basic', remarks: '' },
        ],
        currentStepOrder: 1,
        status: 'in_progress',
      })
      .returning()

    const stepConfigs = [
      { stepOrder: 1, stepKey: 'purposed', roleLabel: 'Purposed', approverName: 'Test Purposed (Junaidi)', approverTitle: 'Service Operation Coord' },
      { stepOrder: 2, stepKey: 'hc_verification', roleLabel: 'HC Verification', approverName: 'Test HC Verification (Adilla)', approverTitle: 'HR Recruitment Staff' },
      { stepOrder: 3, stepKey: 'acknowledge_hr_leader', roleLabel: 'Acknowledge', approverName: 'Test HR Leader (Kesuma)', approverTitle: 'Leader HR-GA' },
      { stepOrder: 4, stepKey: 'acknowledge_hr_spv', roleLabel: 'Acknowledge', approverName: 'Test HR Spv (Iqbal)', approverTitle: 'Human Capital Spv' },
      { stepOrder: 5, stepKey: 'acknowledge_dept_head', roleLabel: 'Acknowledge', approverName: 'Test Dept Head (Romy)', approverTitle: 'Central Service Manager' },
      { stepOrder: 6, stepKey: 'approval_gm', roleLabel: 'Approval', approverName: 'Test GM (Person)', approverTitle: 'General Manager' },
    ]

    const approvalsToInsert = stepConfigs.map((step) => ({
      rfrId: rfr.id,
      stepOrder: step.stepOrder,
      stepKey: step.stepKey,
      roleLabel: step.roleLabel,
      approverName: step.approverName,
      approverEmail: targetEmail,
      approverTitle: step.approverTitle,
      approvalToken: randomUUID(),
      status: 'pending',
    }))

    const insertedApprovals = await db.insert(hcRfrApprovals).values(approvalsToInsert).returning()

    const baseUrl = await getBaseUrl()

    // Send test email notification for Step 1
    const step1 = insertedApprovals.find((a) => a.stepOrder === 1)
    if (step1) {
      await sendRfrApprovalEmail({
        to: targetEmail,
        approverName: step1.approverName,
        approvalStep: `${step1.roleLabel} (Langkah 1/6)`,
        rfr,
        approvals: insertedApprovals,
        approvalToken: step1.approvalToken,
      })
    }

    const links = insertedApprovals.map((s) => ({
      step: s.stepOrder,
      role: s.roleLabel,
      name: s.approverName,
      title: s.approverTitle,
      url: `${baseUrl}/review/rfr/${s.approvalToken}`,
    }))

    try {
      revalidatePath('/dashboard/hc/rfr')
      revalidatePath('/dashboard/approval')
    } catch (e) {}

    return {
      success: true,
      data: {
        rfrNumber,
        targetEmail,
        positionTitle: rfr.positionTitle,
        links,
      },
    }
  } catch (error: any) {
    console.error('[RFR] Generate test failed:', error)
    return { success: false, error: error.message || 'Gagal membuat permohonan RFR test.' }
  }
}

