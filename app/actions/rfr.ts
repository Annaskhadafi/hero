'use server'

import { db } from '@/db'
import {
  approvalMatrices,
  approvalMatrixSteps,
  emailSmtpSettings,
  employees,
  hcRecruitments,
  hcRfrApprovals,
  hcRfrRequests,
  hcRfrSettings,
  masterDepartments,
  masterSections,
  orgChartNodes,
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
  approverEmployeeId?: number | null
}

const DEFAULT_RFR_MATRIX: RfrMatrixStep[] = [
  { stepOrder: 1, stepKey: 'requestor_initiated', roleLabel: 'Submitted', approverName: '', approverEmail: '', approverTitle: 'Requestor', approverEmployeeId: null },
  { stepOrder: 2, stepKey: 'hc_verification', roleLabel: 'Adila Tri Arizona (HC Recruitment)', approverName: 'Adila Tri Arizona', approverEmail: 'adila.arizona@chitraparatama.co.id', approverTitle: 'HR Recruitment & GA', approverEmployeeId: 1064 },
  { stepOrder: 3, stepKey: 'acknowledge_hr_leader', roleLabel: 'Kesuma Bagas (Leader HR-GA)', approverName: 'Kesuma Bagaskara', approverEmail: 'kesuma.bagaskara@chitraparatama.co.id', approverTitle: 'Leader HR-GA', approverEmployeeId: 1253 },
  { stepOrder: 4, stepKey: 'acknowledge_dept_head', roleLabel: 'Manager Departemen Pemohon', approverName: 'Romy Hidayat', approverEmail: 'romy.hidayat@chitraparatama.co.id', approverTitle: 'Central Services Manager', approverEmployeeId: 972 },
  { stepOrder: 5, stepKey: 'approval_gm', roleLabel: 'Person Sihaloho (General Manager)', approverName: 'Person Sihaloho', approverEmail: 'person.sihaloho@chitraparatama.co.id', approverTitle: 'General Manager', approverEmployeeId: 940 },
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
          jobTitle: employees.jobTitle,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, secRows[0].headEmployeeId))
        .limit(1)

      if (headEmp.length > 0 && headEmp[0].name) {
        return {
          name: headEmp[0].name,
          title: headEmp[0].jobTitle || `${secRows[0].sectionName} Head`,
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
    return { name: 'Romy Hidayat', title: 'Central Services Manager', email: 'romy.hidayat@chitraparatama.co.id' }
  }

  // Parse "Section / Department" if formatted as split
  const parts = norm.split('/')
  const deptTerm = (parts.length > 1 ? parts[1] : parts[0]).trim()
  const deptTermLower = deptTerm.toLowerCase()

  if (deptTermLower.includes('central')) {
    return { name: 'Romy Hidayat', title: 'Central Services Manager', email: 'romy.hidayat@chitraparatama.co.id' }
  }

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
          jobTitle: employees.jobTitle,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, deptRows[0].headEmployeeId))
        .limit(1)

      if (headEmp.length > 0 && headEmp[0].name) {
        return {
          name: headEmp[0].name,
          title: headEmp[0].jobTitle || `${deptRows[0].deptName} Manager`,
          email: headEmp[0].email || '',
        }
      }
    }

    // 2. Search employees in department with Manager/Head in jobTitle
    const managerRows = await db
      .select({
        name: employees.name,
        jobTitle: employees.jobTitle,
        email: employees.email,
        deptName: masterDepartments.name,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .where(
        and(
          ilike(masterDepartments.name, `%${deptTerm}%`),
          or(
            ilike(employees.jobTitle, '%manager%'),
            ilike(employees.jobTitle, '%head%'),
            ilike(employees.employmentStatus, '%manager%')
          )
        )
      )
      .limit(1)

    if (managerRows.length > 0 && managerRows[0].name) {
      return {
        name: managerRows[0].name,
        title: managerRows[0].jobTitle || `${managerRows[0].deptName || deptTerm} Manager`,
        email: managerRows[0].email || '',
      }
    }
  } catch (err) {
    console.error('Error resolving dept head:', err)
  }

  return { name: 'Romy Hidayat', title: 'Central Services Manager', email: 'romy.hidayat@chitraparatama.co.id' }
}

export async function resolveRfrMatrixAction(sectionDepartment: string): Promise<RfrMatrixStep[]> {
  return await getRfrMatrixSettings(sectionDepartment)
}

export async function getRfrMatrixSettings(sectionDepartment?: string): Promise<RfrMatrixStep[]> {
  const normDept = (sectionDepartment || '').trim()
  const parts = normDept.split('/')
  const deptTerm = (parts.length > 1 ? parts[1] : parts[0]).trim()

  // 1. Check workflow builder matrix (approvalMatrices where transactionType = 'rfr_approval')
  //    Match by departmentId if sectionDepartment is provided
  try {
    let resolvedDeptId: number | null = null
    if (deptTerm) {
      const [deptRow] = await db
        .select({ id: masterDepartments.id })
        .from(masterDepartments)
        .where(ilike(masterDepartments.name, `%${deptTerm}%`))
        .limit(1)
      resolvedDeptId = deptRow?.id ?? null
    }

    let targetMatrixId: number | null = null

    if (resolvedDeptId) {
      const [deptMatrix] = await db
        .select({ id: approvalMatrices.id })
        .from(approvalMatrices)
        .where(
          and(
            eq(approvalMatrices.transactionType, 'rfr_approval'),
            eq(approvalMatrices.isActive, true),
            eq(approvalMatrices.departmentId, resolvedDeptId)
          )
        )
        .orderBy(desc(approvalMatrices.updatedAt))
        .limit(1)

      if (deptMatrix) {
        targetMatrixId = deptMatrix.id
      }
    }

    // Fallback: get any active rfr matrix
    if (!targetMatrixId) {
      const [wbMatrix] = await db
        .select({ id: approvalMatrices.id })
        .from(approvalMatrices)
        .where(
          and(
            eq(approvalMatrices.transactionType, 'rfr_approval'),
            eq(approvalMatrices.isActive, true)
          )
        )
        .orderBy(desc(approvalMatrices.updatedAt))
        .limit(1)

      if (wbMatrix) {
        targetMatrixId = wbMatrix.id
      }
    }

    if (targetMatrixId) {
      const steps = await db
        .select({
          stepOrder: approvalMatrixSteps.stepOrder,
          label: approvalMatrixSteps.label,
          nodeId: approvalMatrixSteps.nodeId,
          empId: orgChartNodes.employeeId,
          empName: employees.name,
          empEmail: employees.email,
          empJob: employees.jobTitle,
        })
        .from(approvalMatrixSteps)
        .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
        .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
        .where(eq(approvalMatrixSteps.matrixId, targetMatrixId))
        .orderBy(asc(approvalMatrixSteps.stepOrder))

      if (steps.length > 0) {
        const dh = await resolveDeptHeadByDepartment(sectionDepartment || '')
        const hasRequestor = steps.some((s) => {
          const l = s.label.toLowerCase()
          return l === 'submitted' || l === 'pemohon' || l === 'requestor' || l === 'proposed'
        })

        const mappedWorkflowSteps: RfrMatrixStep[] = steps.map((s, idx) => {
          const stepOrder = hasRequestor ? s.stepOrder : idx + 2
          const labelNorm = s.label.toLowerCase()
          let stepKey = s.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')
          let approverName = s.empName || ''
          let approverEmail = s.empEmail || ''
          let approverTitle = s.empJob || s.label

          if (labelNorm.includes('recruitment') || labelNorm.includes('hc verification')) {
            stepKey = 'hc_verification'
            if (!approverName) approverName = 'Adila Tri Arizona'
            if (!approverEmail) approverEmail = 'adila.arizona@chitraparatama.co.id'
            if (!approverTitle || approverTitle === s.label) approverTitle = 'HR Recruitment & GA'
          } else if (labelNorm.includes('leader')) {
            stepKey = 'acknowledge_hr_leader'
            if (!approverName) approverName = 'Kesuma Bagaskara'
            if (!approverEmail) approverEmail = 'kesuma.bagaskara@chitraparatama.co.id'
            if (!approverTitle || approverTitle === s.label) approverTitle = 'Leader HR-GA'
          } else if (labelNorm.includes('spv') || labelNorm.includes('supervisor')) {
            stepKey = 'acknowledge_hr_spv'
            if (!approverName) approverName = 'Muhammad Iqbal'
            if (!approverEmail) approverEmail = 'muhammad.iqbal@chitraparatama.co.id'
            if (!approverTitle || approverTitle === s.label) approverTitle = 'Human Capital Spv'
          } else if (labelNorm.includes('manager departemen') || labelNorm.includes('dept head') || labelNorm.includes('manager department')) {
            stepKey = 'acknowledge_dept_head'
            if (!approverName) approverName = dh.name
            if (!approverEmail) approverEmail = dh.email
            if (!approverTitle || approverTitle === s.label) approverTitle = dh.title || `${deptTerm || 'Departemen'} Manager`
          } else if (labelNorm.includes('general manager') || labelNorm.includes('gm')) {
            stepKey = 'approval_gm'
            if (!approverName) approverName = 'Person Sihaloho'
            if (!approverEmail) approverEmail = 'person.sihaloho@chitraparatama.co.id'
            if (!approverTitle || approverTitle === s.label) approverTitle = 'General Manager'
          }

          return {
            stepOrder,
            stepKey,
            roleLabel: s.label,
            approverName,
            approverEmail,
            approverTitle,
            approverEmployeeId: s.empId || null,
          }
        })

        if (!hasRequestor) {
          return [
            {
              stepOrder: 1,
              stepKey: 'requestor_initiated',
              roleLabel: 'Submitted',
              approverName: '',
              approverEmail: '',
              approverTitle: 'Requestor',
            },
            ...mappedWorkflowSteps,
          ]
        }

        return mappedWorkflowSteps
      }
    }
  } catch (e) {
    console.error('[RFR] Error loading matrix from workflow builder:', e)
  }

  // 2. Fallback: check hero_hc_rfr_settings
  try {
    const [settingRow] = await db
      .select()
      .from(hcRfrSettings)
      .where(eq(hcRfrSettings.settingKey, 'approval_matrix'))
      .limit(1)

    if (settingRow && Array.isArray(settingRow.settingValue) && settingRow.settingValue.length > 0) {
      return settingRow.settingValue as RfrMatrixStep[]
    }
  } catch (e) {
    // fallback to default
  }

  // 3. Final fallback: hardcoded standard 5 steps
  const dh = await resolveDeptHeadByDepartment(sectionDepartment || '')
  return [
    { stepOrder: 1, stepKey: 'requestor_initiated', roleLabel: 'Submitted', approverName: '', approverEmail: '', approverTitle: 'Requestor' },
    { stepOrder: 2, stepKey: 'hc_verification', roleLabel: 'Adila Tri Arizona (HC Recruitment)', approverName: 'Adila Tri Arizona', approverEmail: 'adila.arizona@chitraparatama.co.id', approverTitle: 'HR Recruitment & GA', approverEmployeeId: 1064 },
    { stepOrder: 3, stepKey: 'acknowledge_hr_leader', roleLabel: 'Kesuma Bagas (Leader HR-GA)', approverName: 'Kesuma Bagaskara', approverEmail: 'kesuma.bagaskara@chitraparatama.co.id', approverTitle: 'Leader HR-GA', approverEmployeeId: 1253 },
    { stepOrder: 4, stepKey: 'acknowledge_dept_head', roleLabel: 'Manager Departemen Pemohon', approverName: dh.name, approverEmail: dh.email, approverTitle: dh.title || 'Manager Departemen', approverEmployeeId: 972 },
    { stepOrder: 5, stepKey: 'approval_gm', roleLabel: 'Person Sihaloho (General Manager)', approverName: 'Person Sihaloho', approverEmail: 'person.sihaloho@chitraparatama.co.id', approverTitle: 'General Manager', approverEmployeeId: 940 },
  ]
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

async function sendRfrRevertedEmail(params: {
  to: string
  approverName: string
  revertedByName: string
  remarks: string
  rfr: any
  approvalToken: string
}) {
  const smtpSettings = await getSmtpSettings()
  if (!smtpSettings) {
    console.warn('[RFR] SMTP settings active not found, skipping email')
    return
  }

  const baseUrl = await getBaseUrl()
  const approvalLink = `${baseUrl}/review/rfr/${params.approvalToken}`

  try {
    const hcPolicyCc = await getHumanCapitalPolicyCcRecipients()
    const resolvedTemplate = await resolveWorkflowTemplateContent({
      templateCode: 'rfr_reverted_notification',
      cc: hcPolicyCc,
      variables: {
        approverName: params.approverName,
        rfrNumber: params.rfr.rfrNumber,
        positionTitle: params.rfr.positionTitle,
        revertedByName: params.revertedByName,
        remarks: params.remarks,
        approvalLink,
      },
      fallbackSubject: `[RFR Dikembalikan] ${params.rfr.rfrNumber} - ${params.rfr.positionTitle} oleh ${params.revertedByName}`,
      fallbackHtml: `<p>Yth. <strong>${params.approverName}</strong>,</p><p>Permohonan Rekrutmen (RFR) <strong>${params.rfr.rfrNumber}</strong> (${params.rfr.positionTitle}) telah <strong>dikembalikan (reverted)</strong> ke tahap persetujuan Anda oleh <strong>${params.revertedByName}</strong>.</p><p>Catatan revert: "${params.remarks}"</p><p><a href="${approvalLink}">Tinjau Ulang RFR</a></p>`,
      fallbackText: `Yth. ${params.approverName},\n\nRFR ${params.rfr.rfrNumber} (${params.rfr.positionTitle}) dikembalikan ke Anda oleh ${params.revertedByName}.\nAlasan: "${params.remarks}".\nLink: ${approvalLink}`,
    })

    if (params.to && params.to.trim()) {
      await sendEmailViaSmtp(smtpSettings, {
        to: params.to.trim(),
        cc: resolvedTemplate.ccList,
        subject: resolvedTemplate.subject,
        text: resolvedTemplate.text,
        html: resolvedTemplate.html,
        templateCode: 'rfr_reverted_notification',
        templateName: `RFR Reverted #${params.rfr.rfrNumber}`,
      })
    }
  } catch (error) {
    console.error('[RFR] Revert email send failed:', error)
  }
}

async function sendRfrRejectedEmail(params: {
  to: string
  requestorName: string
  rejectedByName: string
  remarks: string
  approvalStep: string
  rfr: any
}) {
  const smtpSettings = await getSmtpSettings()
  if (!smtpSettings) {
    console.warn('[RFR] SMTP settings active not found, skipping email')
    return
  }

  try {
    const hcPolicyCc = await getHumanCapitalPolicyCcRecipients()
    const resolvedTemplate = await resolveWorkflowTemplateContent({
      templateCode: 'rfr_rejected_notification',
      cc: hcPolicyCc,
      variables: {
        rfrNumber: params.rfr.rfrNumber,
        positionTitle: params.rfr.positionTitle,
        approvalStep: params.approvalStep,
        rejectedByName: params.rejectedByName,
        remarks: params.remarks,
      },
      fallbackSubject: `[RFR Ditolak] ${params.rfr.rfrNumber} - ${params.rfr.positionTitle}`,
      fallbackHtml: `<p>Yth. Karyawan Pemohon,</p><p>Permohonan Rekrutmen (RFR) dengan nomor <strong>${params.rfr.rfrNumber}</strong> untuk posisi <strong>${params.rfr.positionTitle}</strong> telah <strong>ditolak</strong> pada tahap <strong>${params.approvalStep}</strong> oleh <strong>${params.rejectedByName}</strong>.</p><p>Alasan Penolakan: "${params.remarks}"</p>`,
      fallbackText: `RFR ${params.rfr.rfrNumber} (${params.rfr.positionTitle}) ditolak pada tahap ${params.approvalStep} oleh ${params.rejectedByName}.\nAlasan: "${params.remarks}".`,
    })

    if (params.to && params.to.trim()) {
      await sendEmailViaSmtp(smtpSettings, {
        to: params.to.trim(),
        cc: resolvedTemplate.ccList,
        subject: resolvedTemplate.subject,
        text: resolvedTemplate.text,
        html: resolvedTemplate.html,
        templateCode: 'rfr_rejected_notification',
        templateName: `RFR Rejected #${params.rfr.rfrNumber}`,
      })
    }
  } catch (error) {
    console.error('[RFR] Reject email send failed:', error)
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
  functionalCompetencies?: Array<{ id?: string; skillName: string; level: 'basic' | 'intermediate' | 'advance'; remarks: string }>
  requestorSignatureDataUrl?: string
}) {
  try {
    const year = new Date().getFullYear()
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(hcRfrRequests)
    const seq = (countResult?.count || 0) + 1
    const rfrNumber = `RFR-${year}-${String(seq).padStart(4, '0')}`

    const matrix = await getRfrMatrixSettings(data.sectionDepartment)

    // Detect if the matrix starts with a requestor_initiated step ("Submitted")
    const hasRequestorStep = matrix.some((s) => s.stepKey === 'requestor_initiated')
    const firstPendingStepOrder = hasRequestorStep ? 2 : 1

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
        functionalCompetencies: (data.functionalCompetencies || []) as Array<{ id?: string; skillName: string; level: 'basic' | 'intermediate' | 'advance'; remarks: string }>,
        currentStepOrder: firstPendingStepOrder,
        status: 'in_progress',
      })
      .returning()

    if (!rfr) {
      return { success: false, error: 'Gagal membuat dokumen RFR di database.' }
    }

    // Fill step 1 with requestor info and auto-approve (requestor initiates by submitting)
    const requestorEmp = data.requestorEmployeeId
      ? await db.select({ name: employees.name, email: employees.email, position: employees.jobTitle }).from(employees).where(eq(employees.id, data.requestorEmployeeId)).limit(1)
      : await db.select({ name: employees.name, email: employees.email, position: employees.jobTitle }).from(employees).where(eq(employees.name, data.requestorName)).limit(1)
    const requestorInfo = requestorEmp?.[0]
    const requestorEmail = requestorInfo?.email || ''

    const approvalsToInsert = matrix.map((step) => {
      const isRequestorStep = step.stepKey === 'requestor_initiated'

      return {
        rfrId: rfr.id,
        stepOrder: step.stepOrder,
        stepKey: step.stepKey,
        roleLabel: step.roleLabel,
        approverName: isRequestorStep ? (requestorInfo?.name || data.requestorName) : (step.approverName || step.approverTitle),
        approverEmail: isRequestorStep ? requestorEmail : (step.approverEmail || ''),
        approverTitle: isRequestorStep ? (requestorInfo?.position || 'Requestor') : step.approverTitle,
        approverEmployeeId: isRequestorStep ? (data.requestorEmployeeId || null) : (step.approverEmployeeId || null),
        approvalToken: randomUUID(),
        // Requestor step is auto-approved since the requestor submits it themselves
        status: isRequestorStep ? ('approved' as const) : ('pending' as const),
        signatureDataUrl: isRequestorStep ? (data.requestorSignatureDataUrl || null) : null,
        signedAt: isRequestorStep ? new Date() : null,
      }
    })

    const insertedApprovals = await db.insert(hcRfrApprovals).values(approvalsToInsert).returning()

    // Dispatch notification & email to the first pending step
    const totalSteps = insertedApprovals.length
    const firstPendingStep = insertedApprovals.find((a) => a.stepOrder === firstPendingStepOrder)
    if (firstPendingStep) {
      await sendRfrApprovalEmail({
        to: firstPendingStep.approverEmail,
        approverName: firstPendingStep.approverName,
        approvalStep: `${firstPendingStep.roleLabel} (Langkah ${firstPendingStepOrder}/${totalSteps})`,
        rfr,
        approvals: insertedApprovals,
        approvalToken: firstPendingStep.approvalToken,
      })

      // Bell notification to first pending step approver
      if (firstPendingStep.approverEmail) {
        const baseUrl = await getBaseUrl()
        notifyWorkflowBellRecipients({
          recipientEmails: [firstPendingStep.approverEmail],
          eventType: 'rfr_approval_request',
          category: 'approval_requests',
          title: `RFR Baru: ${rfrNumber}`,
          body: `${data.requestorName} mengajukan RFR untuk posisi ${data.positionTitle} (${data.numberOfPersons} orang). Menunggu verifikasi Anda di tahap ${firstPendingStep.roleLabel}.`,
          url: `${baseUrl}/review/rfr/${firstPendingStep.approvalToken}`,
          tagPrefix: 'rfr',
          metadata: { rfrNumber, positionTitle: data.positionTitle, sectionDepartment: data.sectionDepartment },
        })
      }
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

    const totalSteps = allApprovals.length

    // Find the first pending step after this one (skipping already approved steps)
    const nextPendingApproval = allApprovals.find(
      (a) => a.stepOrder > approval.stepOrder && a.status === 'pending'
    )

    if (nextPendingApproval) {
      const targetStepOrder = nextPendingApproval.stepOrder
      // Advance to the target pending step
      await db
        .update(hcRfrRequests)
        .set({ currentStepOrder: targetStepOrder })
        .where(eq(hcRfrRequests.id, rfr.id))

      await sendRfrApprovalEmail({
        to: nextPendingApproval.approverEmail,
        approverName: nextPendingApproval.approverName,
        approvalStep: `${nextPendingApproval.roleLabel} (Langkah ${targetStepOrder}/${totalSteps})`,
        rfr,
        approvals: allApprovals,
        approvalToken: nextPendingApproval.approvalToken,
      })

      // Bell notification to next step approver
      if (nextPendingApproval.approverEmail) {
        const baseUrl = await getBaseUrl()
        notifyWorkflowBellRecipients({
          recipientEmails: [nextPendingApproval.approverEmail],
          eventType: 'rfr_approval_request',
          category: 'approval_requests',
          title: `RFR ${rfr.rfrNumber} — Tahap ${nextPendingApproval.roleLabel}`,
          body: `RFR ${rfr.rfrNumber} (${rfr.positionTitle}) telah disetujui di tahap sebelumnya. Menunggu persetujuan Anda di tahap ${nextPendingApproval.roleLabel}.`,
          url: `${baseUrl}/review/rfr/${nextPendingApproval.approvalToken}`,
          tagPrefix: 'rfr',
          metadata: { rfrNumber: rfr.rfrNumber, positionTitle: rfr.positionTitle, sectionDepartment: rfr.sectionDepartment },
        })
      }
    } else {
      // No more pending steps! All steps are approved.
      await db
        .update(hcRfrRequests)
        .set({ status: 'approved', currentStepOrder: totalSteps })
        .where(eq(hcRfrRequests.id, rfr.id))

      // Auto-generate Lowongan Pekerjaan (hcRecruitments)
      await autoCreateRecruitmentFromRfr(rfr)

      // Bell notification to requestor that RFR is fully approved
      if (rfr.requestorName) {
        const requestorEmp = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, rfr.requestorEmployeeId || 0))
          .limit(1)
        if (requestorEmp[0]?.email) {
          const baseUrl = await getBaseUrl()
          notifyWorkflowBellRecipients({
            recipientEmails: [requestorEmp[0].email],
            eventType: 'rfr_approved',
            category: 'approval_requests',
            title: `RFR ${rfr.rfrNumber} Disetujui!`,
            body: `RFR ${rfr.rfrNumber} (${rfr.positionTitle}) telah disetujui sepenuhnya oleh General Manager. Lowongan pekerjaan telah dibuat otomatis.`,
            url: `${baseUrl}/dashboard/hc/rfr`,
            tagPrefix: 'rfr',
            metadata: { rfrNumber: rfr.rfrNumber, positionTitle: rfr.positionTitle, status: 'approved' },
          })
        }
      }
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
    const [rfrDetail] = await db
      .select()
      .from(hcRfrRequests)
      .where(eq(hcRfrRequests.id, approval.rfrId))
      .limit(1)

    // Look up requestor email and trigger email notification
    if (rfrDetail) {
      const requestorEmp = rfrDetail.requestorEmployeeId
        ? await db.select({ email: employees.email }).from(employees).where(eq(employees.id, rfrDetail.requestorEmployeeId)).limit(1)
        : await db.select({ email: employees.email }).from(employees).where(eq(employees.name, rfrDetail.requestorName || '')).limit(1)
      
      const targetEmail = requestorEmp[0]?.email || ''
      
      await sendRfrRejectedEmail({
        to: targetEmail,
        requestorName: rfrDetail.requestorName || 'Requestor',
        rejectedByName: approval.approverName || 'Approver',
        remarks: remarks || 'Permohonan ditolak',
        approvalStep: approval.roleLabel,
        rfr: rfrDetail,
      })

      // Bell notification to requestor that RFR was rejected
      const baseUrl = await getBaseUrl()
      notifyWorkflowBellRecipients({
        recipientEmails: [targetEmail],
        eventType: 'rfr_rejected',
        category: 'approval_requests',
        title: `RFR ${rfrDetail.rfrNumber} Ditolak`,
        body: `RFR ${rfrDetail.rfrNumber} (${rfrDetail.positionTitle}) ditolak di tahap ${approval.roleLabel} oleh ${approval.approverName}. Alasan: ${remarks || 'Tidak disebutkan'}.`,
        url: `${baseUrl}/dashboard/hc/rfr`,
        tagPrefix: 'rfr',
        metadata: { rfrNumber: rfrDetail.rfrNumber, positionTitle: rfrDetail.positionTitle, status: 'rejected', reason: remarks },
      })
    }

    try {
      revalidatePath('/dashboard/hc/rfr')
      revalidatePath('/dashboard/approval')
    } catch (e) {}

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function revertRfrStep(token: string, remarks: string) {
  try {
    const [approval] = await db
      .select()
      .from(hcRfrApprovals)
      .where(eq(hcRfrApprovals.approvalToken, token))
      .limit(1)

    if (!approval) return { success: false, error: 'Token approval tidak valid.' }

    const prevStepOrder = 1
    if (approval.stepOrder === 1) {
      return { success: false, error: 'Tidak dapat melakukan revert dari langkah pertama.' }
    }

    const [rfr] = await db
      .select()
      .from(hcRfrRequests)
      .where(eq(hcRfrRequests.id, approval.rfrId))
      .limit(1)

    if (!rfr) return { success: false, error: 'Data RFR tidak ditemukan.' }

    // Set current reverting step back to pending
    await db
      .update(hcRfrApprovals)
      .set({
        status: 'pending',
        signatureDataUrl: null,
        remarks: remarks || 'Reverted',
        signedAt: null,
      })
      .where(eq(hcRfrApprovals.id, approval.id))

    // Set Step 1 (Requestor) back to pending so they can revise the form
    await db
      .update(hcRfrApprovals)
      .set({
        status: 'pending',
        signatureDataUrl: null,
        remarks: remarks || 'Reverted to requestor for revision',
        signedAt: null,
      })
      .where(and(eq(hcRfrApprovals.rfrId, rfr.id), eq(hcRfrApprovals.stepOrder, 1)))

    // Update request's currentStepOrder to 1
    await db
      .update(hcRfrRequests)
      .set({
        currentStepOrder: 1,
        status: 'in_progress',
      })
      .where(eq(hcRfrRequests.id, rfr.id))

    const allApprovals = await db
      .select()
      .from(hcRfrApprovals)
      .where(eq(hcRfrApprovals.rfrId, rfr.id))
      .orderBy(asc(hcRfrApprovals.stepOrder))

    // Find Step 1 (Requestor) to send email and notification
    const prevApproval = allApprovals.find((a) => a.stepOrder === 1)
    if (prevApproval) {
      await sendRfrRevertedEmail({
        to: prevApproval.approverEmail,
        approverName: prevApproval.approverName,
        revertedByName: approval.approverName || 'Approver',
        remarks: remarks || 'Tidak ada catatan',
        rfr,
        approvalToken: prevApproval.approvalToken,
      })

      // Bell notification to requestor
      if (prevApproval.approverEmail) {
        const baseUrl = await getBaseUrl()
        notifyWorkflowBellRecipients({
          recipientEmails: [prevApproval.approverEmail],
          eventType: 'rfr_approval_request',
          category: 'approval_requests',
          title: `RFR ${rfr.rfrNumber} Dikembalikan ke Anda`,
          body: `RFR ${rfr.rfrNumber} (${rfr.positionTitle}) telah di-revert/dikembalikan ke Anda untuk revisi oleh ${approval.approverName}. Catatan: "${remarks || 'Tidak ada catatan'}".`,
          url: `${baseUrl}/dashboard/hc/rfr`,
          tagPrefix: 'rfr',
          metadata: { rfrNumber: rfr.rfrNumber, positionTitle: rfr.positionTitle, sectionDepartment: rfr.sectionDepartment },
        })
      }
    }

    try {
      revalidatePath('/dashboard/hc/rfr')
      revalidatePath('/dashboard/approval')
    } catch (e) {}

    return { success: true }
  } catch (error: any) {
    console.error('[RFR] Revert step failed:', error)
    return { success: false, error: error.message || 'Gagal mereferensikan revert RFR.' }
  }
}

export async function resubmitRfrRequest(
  id: number,
  data: {
    requestDate: string
    joinDateEstimation: string
    requestorName: string
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
    contractDurationMonths: number
    attachmentMpp: boolean
    attachmentJd: boolean
    uploadedAttachmentUrls: string[]
    sexPreference: string
    agePreference: string
    educationDegree: string
    educationBackground: string[]
    yearsOfExperience: string
    fieldOfJobExperience: string
    functionalCompetencies: any[]
    requestorSignatureDataUrl?: string
  }
) {
  try {
    // 1. Update the RFR request details
    const [updatedRfr] = await db
      .update(hcRfrRequests)
      .set({
        requestDate: data.requestDate,
        joinDateEstimation: data.joinDateEstimation,
        requestorName: data.requestorName,
        sectionDepartment: data.sectionDepartment,
        receivedByHr: data.receivedByHr || '',
        positionTitle: data.positionTitle,
        numberOfPersons: data.numberOfPersons,
        briefJobDescription: data.briefJobDescription,
        level: data.level,
        reasonForRequest: data.reasonForRequest,
        mppStatus: data.mppStatus,
        reasonsIfNonBudgeted: data.reasonsIfNonBudgeted || '',
        employmentStatus: data.employmentStatus,
        contractDurationMonths: data.contractDurationMonths,
        attachmentMpp: data.attachmentMpp,
        attachmentJd: data.attachmentJd,
        uploadedAttachmentUrls: data.uploadedAttachmentUrls,
        sexPreference: data.sexPreference,
        agePreference: data.agePreference,
        educationDegree: data.educationDegree,
        educationBackground: data.educationBackground,
        yearsOfExperience: data.yearsOfExperience,
        fieldOfJobExperience: data.fieldOfJobExperience,
        functionalCompetencies: (data.functionalCompetencies || []) as Array<{ id?: string; skillName: string; level: 'basic' | 'intermediate' | 'advance'; remarks: string }>,
        status: 'in_progress',
      })
      .where(eq(hcRfrRequests.id, id))
      .returning()

    if (!updatedRfr) {
      return { success: false, error: 'Data RFR tidak ditemukan.' }
    }

    // 2. Find and update the requestor approval step (requestor_initiated)
    const allApprovals = await db
      .select()
      .from(hcRfrApprovals)
      .where(eq(hcRfrApprovals.rfrId, id))
      .orderBy(asc(hcRfrApprovals.stepOrder))

    const totalSteps = allApprovals.length
    const requestorApproval = allApprovals.find((a) => a.stepKey === 'requestor_initiated' || a.stepOrder === 1)

    if (requestorApproval) {
      await db
        .update(hcRfrApprovals)
        .set({
          status: 'approved',
          signatureDataUrl: data.requestorSignatureDataUrl || null,
          signedAt: new Date(),
          remarks: 'Resubmitted after revision',
        })
        .where(eq(hcRfrApprovals.id, requestorApproval.id))
    }

    const requestorStepOrder = requestorApproval?.stepOrder ?? 1

    // 3. Find the first pending step after the requestor step
    const nextPendingApproval = allApprovals.find(
      (a) => a.stepOrder > requestorStepOrder && a.status === 'pending'
    )

    if (nextPendingApproval) {
      const targetStepOrder = nextPendingApproval.stepOrder
      // Update request currentStepOrder
      await db
        .update(hcRfrRequests)
        .set({ currentStepOrder: targetStepOrder })
        .where(eq(hcRfrRequests.id, id))

      // Trigger notification & email to that pending step
      await sendRfrApprovalEmail({
        to: nextPendingApproval.approverEmail,
        approverName: nextPendingApproval.approverName,
        approvalStep: `${nextPendingApproval.roleLabel} (Langkah ${targetStepOrder}/${totalSteps})`,
        rfr: updatedRfr,
        approvals: allApprovals,
        approvalToken: nextPendingApproval.approvalToken,
      })

      // Bell notification to next step approver
      if (nextPendingApproval.approverEmail) {
        const baseUrl = await getBaseUrl()
        notifyWorkflowBellRecipients({
          recipientEmails: [nextPendingApproval.approverEmail],
          eventType: 'rfr_approval_request',
          category: 'approval_requests',
          title: `RFR ${updatedRfr.rfrNumber} — Tahap ${nextPendingApproval.roleLabel}`,
          body: `RFR ${updatedRfr.rfrNumber} (${updatedRfr.positionTitle}) telah diresubmit oleh pemohon. Menunggu persetujuan Anda di tahap ${nextPendingApproval.roleLabel}.`,
          url: `${baseUrl}/review/rfr/${nextPendingApproval.approvalToken}`,
          tagPrefix: 'rfr',
          metadata: { rfrNumber: updatedRfr.rfrNumber, positionTitle: updatedRfr.positionTitle, sectionDepartment: updatedRfr.sectionDepartment },
        })
      }
    } else {
      // In case there are no pending steps (should not happen normally)
      await db
        .update(hcRfrRequests)
        .set({ status: 'approved', currentStepOrder: 6 })
        .where(eq(hcRfrRequests.id, id))

      await autoCreateRecruitmentFromRfr(updatedRfr)
    }

    try {
      revalidatePath('/dashboard/hc/rfr')
      revalidatePath('/dashboard/approval')
    } catch (e) {}

    return { success: true }
  } catch (error: any) {
    console.error('[RFR] Resubmit RFR failed:', error)
    return { success: false, error: error.message || 'Gagal menyimpan perubahan RFR.' }
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

