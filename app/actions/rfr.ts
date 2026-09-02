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
  { stepOrder: 2, stepKey: 'hc_verification', roleLabel: 'Adila Tri Arizona (HC Recruitment)', approverName: 'Adila Tri Arizona', approverEmail: 'adila.arizona@chitraparatama.co.id', approverTitle: 'HR Recruitment Staff', approverEmployeeId: 1064 },
  { stepOrder: 3, stepKey: 'acknowledge_hr_leader', roleLabel: 'Kesuma Bagas (Leader HR-GA)', approverName: 'Kesuma Bagaskara', approverEmail: 'kesuma.bagaskara@chitraparatama.co.id', approverTitle: 'Leader HR-GA', approverEmployeeId: 1253 },
  { stepOrder: 4, stepKey: 'acknowledge_hr_spv', roleLabel: 'Muhammad Iqbal (Human Capital Spv)', approverName: 'Muhammad Iqbal', approverEmail: 'muhammad.iqbal@chitraparatama.co.id', approverTitle: 'Human Capital Spv', approverEmployeeId: 970 },
  { stepOrder: 5, stepKey: 'acknowledge_dept_head', roleLabel: 'Manager Departemen Pemohon', approverName: 'Romy Hidayat', approverEmail: 'romy.hidayat@chitraparatama.co.id', approverTitle: 'Central Services Manager', approverEmployeeId: 972 },
  { stepOrder: 6, stepKey: 'approval_gm', roleLabel: 'Person Sihaloho (General Manager)', approverName: 'Person Sihaloho', approverEmail: 'person.sihaloho@chitraparatama.co.id', approverTitle: 'General Manager', approverEmployeeId: 940 },
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

async function findMasterDepartmentByKeyword(term: string) {
  const clean = term.trim()
  if (!clean) return null

  // 1. Direct case-insensitive match
  const directMatch = await db
    .select()
    .from(masterDepartments)
    .where(ilike(masterDepartments.name, `%${clean}%`))
    .limit(1)
  if (directMatch[0]) return directMatch[0]

  // 2. Token / keyword heuristic mapping
  const lower = clean.toLowerCase()
  let keyword = ''
  if (lower.includes('finance') || lower.includes('keuangan') || lower.includes('fbp')) {
    keyword = 'Finance Business Partner'
  } else if (lower.includes('marketing') || lower.includes('bi')) {
    keyword = 'BI & MARKETING'
  } else if (lower.includes('cpi') || lower.includes('continuous') || lower.includes('ia')) {
    keyword = 'Continuous Process Improvement'
  } else if (lower.includes('human capital') || lower.includes('hc') || lower.includes('hr')) {
    keyword = 'Human Capital'
  } else if (lower.includes('supply') || lower.includes('sc') || lower.includes('logistic') || lower.includes('purchasing')) {
    keyword = 'Supply Chain'
  } else if (lower.includes('sales')) {
    keyword = 'Sales Operation'
  } else if (lower.includes('operation') || lower.includes('ops') || lower.includes('service')) {
    keyword = 'OPERATION'
  } else if (lower.includes('technical') || lower.includes('teknikal')) {
    keyword = 'TECHNICAL'
  } else if (lower.includes('qhse') || lower.includes('hse') || lower.includes('k3')) {
    keyword = 'QHSE'
  } else if (lower.includes('legal') || lower.includes('erm') || lower.includes('hukum')) {
    keyword = 'Legal & ERM'
  } else if (lower.includes('facility') || lower.includes('sfm') || lower.includes('support')) {
    keyword = 'Support Facilities Management'
  } else if (lower.includes('strategic') || lower.includes('osm')) {
    keyword = 'Office Strategic Management'
  } else if (lower.includes('central')) {
    keyword = 'Central Services'
  } else if (lower.includes('bod') || lower.includes('executive') || lower.includes('direksi') || lower.includes('director')) {
    keyword = 'BoD/Executive'
  }

  if (keyword) {
    const kwMatch = await db
      .select()
      .from(masterDepartments)
      .where(ilike(masterDepartments.name, `%${keyword}%`))
      .limit(1)
    if (kwMatch[0]) return kwMatch[0]
  }

  // 3. Fallback: try individual words > 3 chars
  const words = clean.split(/\s+/).filter((w) => w.length > 3)
  for (const w of words) {
    const wMatch = await db
      .select()
      .from(masterDepartments)
      .where(ilike(masterDepartments.name, `%${w}%`))
      .limit(1)
    if (wMatch[0]) return wMatch[0]
  }

  return null
}

async function resolveDeptHeadByDepartment(sectionDepartmentStr: string) {
  const norm = (sectionDepartmentStr || '').trim()
  if (!norm) {
    return { name: 'Romy Hidayat', title: 'Central Services Manager', email: 'romy.hidayat@chitraparatama.co.id', employeeId: 972 }
  }

  const parts = norm.split('/')
  const deptTerm = (parts.length > 1 ? parts[1] : parts[0]).trim()
  const deptRow = (await findMasterDepartmentByKeyword(deptTerm)) || (await findMasterDepartmentByKeyword(parts[0].trim()))

  if (deptRow && deptRow.headEmployeeId) {
    const [headEmp] = await db
      .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle, email: employees.email })
      .from(employees)
      .where(eq(employees.id, deptRow.headEmployeeId))
      .limit(1)
    if (headEmp && headEmp.name) {
      return {
        name: headEmp.name,
        title: headEmp.jobTitle || `${deptRow.name} Manager`,
        email: headEmp.email || '',
        employeeId: headEmp.id,
      }
    }
  }

  // Fallback defaults if no head in DB
  const lower = norm.toLowerCase()
  if (lower.includes('finance') || lower.includes('keuangan') || lower.includes('fbp')) {
    return { name: 'Febrian Dani', title: 'Finance Manager', email: 'febrian.dani@chitraparatama.co.id', employeeId: 960 }
  }
  if (lower.includes('human capital') || lower.includes('hc') || lower.includes('hr')) {
    return { name: 'Rendra Rachman', title: 'Human Capital Manager', email: 'rendra.rachman@chitraparatama.co.id', employeeId: 966 }
  }
  if (lower.includes('sales')) {
    return { name: 'Yean Alan Fabian Antonio M', title: 'Sales Operation Manager', email: 'yean.fabian@chitraparatama.co.id', employeeId: 947 }
  }
  if (lower.includes('supply') || lower.includes('logistic')) {
    return { name: 'Bekti Widyasmoro', title: 'Supply Chain Manager', email: 'bekti.widyasmoro@chitraparatama.co.id', employeeId: 943 }
  }
  if (lower.includes('cpi') || lower.includes('ia')) {
    return { name: 'Bardinia Susi Ekawaty', title: 'CPI & IA Reps Manager', email: 'bardynia.susi@chitraparatama.co.id', employeeId: 944 }
  }
  if (lower.includes('legal') || lower.includes('erm')) {
    return { name: 'Paulus Stupa Gumilang', title: 'Legal & ERM Lead', email: 'stupa.gumilang@chitraparatama.co.id', employeeId: 1009 }
  }
  if (lower.includes('facility') || lower.includes('sfm')) {
    return { name: 'Susanto', title: 'Support Facilities Manager', email: 'santo.susanto@chitraparatama.co.id', employeeId: 941 }
  }
  if (lower.includes('strategic') || lower.includes('osm')) {
    return { name: 'Asep Firdaus', title: 'OSM Manager', email: 'asep.firdaus@chitraparatama.co.id', employeeId: 1115 }
  }

  return { name: 'Romy Hidayat', title: 'Central Services Manager', email: 'romy.hidayat@chitraparatama.co.id', employeeId: 972 }
}

export async function getEmployeeJobTitleAction(name: string): Promise<string> {
  if (!name || !name.trim()) return 'Staff'
  try {
    const [emp] = await db
      .select({ jobTitle: employees.jobTitle })
      .from(employees)
      .where(ilike(employees.name, `%${name.trim()}%`))
      .limit(1)
    return emp?.jobTitle || 'Staff'
  } catch {
    return 'Staff'
  }
}

export async function resolveRfrMatrixAction(sectionDepartment: string): Promise<RfrMatrixStep[]> {
  return await getRfrMatrixSettings(sectionDepartment)
}

export async function getRfrMatrixSettings(sectionDepartment?: string): Promise<RfrMatrixStep[]> {
  const normDept = (sectionDepartment || '').trim()
  const parts = normDept.split('/')
  const deptTerm = (parts.length > 1 ? parts[1] : parts[0]).trim()

  // 1. Check workflow builder matrix (approvalMatrices where transactionType = 'rfr_approval')
  try {
    const deptRow = (await findMasterDepartmentByKeyword(deptTerm)) || (await findMasterDepartmentByKeyword(parts[0].trim()))
    const resolvedDeptId = deptRow?.id ?? null

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

    // Fallback: get any active rfr matrix (prefer Central Services or non-BoD)
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
          let approverEmployeeId = s.empId || null

          if (labelNorm.includes('recruitment') || labelNorm.includes('hc verification')) {
            stepKey = 'hc_verification'
            if (!approverName) approverName = 'Adila Tri Arizona'
            if (!approverEmail) approverEmail = 'adila.arizona@chitraparatama.co.id'
            approverTitle = 'HR Recruitment Staff'
            if (!approverEmployeeId) approverEmployeeId = 1064
          } else if (labelNorm.includes('leader')) {
            stepKey = 'acknowledge_hr_leader'
            if (!approverName) approverName = 'Kesuma Bagaskara'
            if (!approverEmail) approverEmail = 'kesuma.bagaskara@chitraparatama.co.id'
            approverTitle = 'Leader HR-GA'
            if (!approverEmployeeId) approverEmployeeId = 1253
          } else if (labelNorm.includes('spv') || labelNorm.includes('supervisor')) {
            stepKey = 'acknowledge_hr_spv'
            if (!approverName) approverName = 'Muhammad Iqbal'
            if (!approverEmail) approverEmail = 'muhammad.iqbal@chitraparatama.co.id'
            approverTitle = 'Human Capital Spv'
            if (!approverEmployeeId) approverEmployeeId = 970
          } else if (labelNorm.includes('manager departemen') || labelNorm.includes('dept head') || labelNorm.includes('manager department')) {
            stepKey = 'acknowledge_dept_head'
            approverName = dh.name
            approverEmail = dh.email
            approverTitle = dh.title || `${deptTerm || 'Departemen'} Manager`
            approverEmployeeId = dh.employeeId || s.empId || null
          } else if (labelNorm.includes('general manager') || labelNorm.includes('gm')) {
            stepKey = 'approval_gm'
            if (!approverName) approverName = 'Person Sihaloho'
            if (!approverEmail) approverEmail = 'person.sihaloho@chitraparatama.co.id'
            approverTitle = 'General Manager'
            if (!approverEmployeeId) approverEmployeeId = 940
          }

          return {
            stepOrder,
            stepKey,
            roleLabel: s.label,
            approverName,
            approverEmail,
            approverTitle,
            approverEmployeeId,
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

  // 3. Final fallback: hardcoded standard 6 steps
  const dh = await resolveDeptHeadByDepartment(sectionDepartment || '')
  return [
    { stepOrder: 1, stepKey: 'requestor_initiated', roleLabel: 'Submitted', approverName: '', approverEmail: '', approverTitle: 'Requestor' },
    { stepOrder: 2, stepKey: 'hc_verification', roleLabel: 'HC Verification', approverName: 'Adila Tri Arizona', approverEmail: 'adila.arizona@chitraparatama.co.id', approverTitle: 'HR Recruitment & GA', approverEmployeeId: 1064 },
    { stepOrder: 3, stepKey: 'acknowledge_hr_leader', roleLabel: 'Leader HR-GA', approverName: 'Kesuma Bagaskara', approverEmail: 'kesuma.bagaskara@chitraparatama.co.id', approverTitle: 'Leader HR-GA', approverEmployeeId: 1253 },
    { stepOrder: 4, stepKey: 'acknowledge_hr_spv', roleLabel: 'Human Capital Spv', approverName: 'Muhammad Iqbal', approverEmail: 'muhammad.iqbal@chitraparatama.co.id', approverTitle: 'HR-GA Supervisor', approverEmployeeId: 970 },
    { stepOrder: 5, stepKey: 'acknowledge_dept_head', roleLabel: 'Manager Departemen', approverName: dh.name, approverEmail: dh.email, approverTitle: dh.title || 'Manager Departemen', approverEmployeeId: dh.employeeId || 972 },
    { stepOrder: 6, stepKey: 'approval_gm', roleLabel: 'General Manager', approverName: 'Person Sihaloho', approverEmail: 'person.sihaloho@chitraparatama.co.id', approverTitle: 'General Manager', approverEmployeeId: 940 },
  ]
}

async function sendRfrApprovalEmail(params: {
  to: string
  approverName: string
  approvalStep: string
  rfr: any
  approvals: any[]
  approvalToken: string
  additionalCc?: string[]
  isResubmit?: boolean
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
    const allCc = Array.from(new Set([...(hcPolicyCc || []), ...(params.additionalCc || [])].filter(Boolean)))
    const resolvedTemplate = await resolveWorkflowTemplateContent({
      templateCode: 'rfr_approver_notification',
      cc: allCc,
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
      fallbackSubject: params.isResubmit
        ? `[RFR Telah Di-Resubmit] Menunggu Persetujuan Anda: ${params.rfr.rfrNumber} - ${params.rfr.positionTitle}`
        : `[RFR] Menunggu Persetujuan Anda: ${params.rfr.rfrNumber} - ${params.rfr.positionTitle} (${params.rfr.numberOfPersons} Orang)`,
      fallbackHtml: `<p>Yth. ${params.approverName},</p><p>Permohonan Rekrutmen (RFR) <strong>${params.rfr.rfrNumber}</strong> (${params.rfr.positionTitle}) ${params.isResubmit ? 'telah selesai direvisi dan di-resubmit oleh pemohon.' : ''} Memerlukan persetujuan/verifikasi Anda pada tahap <strong>${params.approvalStep}</strong>.</p><p><a href="${approvalLink}">Buka &amp; Tanda Tangan RFR</a></p><p>Dokumen lengkap RFR dalam format PDF dilampirkan pada email ini.</p>`,
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
  additionalCc?: string[]
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
    const allCc = Array.from(new Set([...(hcPolicyCc || []), ...(params.additionalCc || [])].filter(Boolean)))
    const resolvedTemplate = await resolveWorkflowTemplateContent({
      templateCode: 'rfr_reverted_notification',
      cc: allCc,
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

async function sendRfrCompletedEmail(params: {
  to: string
  requestorName: string
  rfr: any
  approvals: any[]
}) {
  const smtpSettings = await getSmtpSettings()
  if (!smtpSettings) {
    console.warn('[RFR] SMTP settings active not found, skipping email')
    return
  }

  let pdfBuffer: Buffer | null = null
  try {
    const rawPdf = await generateRfrPdf({
      rfrNumber: params.rfr.rfrNumber,
      requestDate: params.rfr.requestDate ? new Date(params.rfr.requestDate).toISOString().slice(0, 10) : '',
      joinDateEstimation: params.rfr.joinDateEstimation ? new Date(params.rfr.joinDateEstimation).toISOString().slice(0, 10) : '',
      requestorName: params.rfr.requestorName,
      sectionDepartment: params.rfr.sectionDepartment,
      receivedByHr: params.rfr.receivedByHr,
      positionTitle: params.rfr.positionTitle,
      numberOfPersons: params.rfr.numberOfPersons || 1,
      briefJobDescription: params.rfr.briefJobDescription || '',
      level: params.rfr.level || 'staff',
      reasonForRequest: params.rfr.reasonForRequest || 'new_headcount',
      mppStatus: params.rfr.mppStatus || 'budgeted',
      employmentStatus: params.rfr.employmentStatus || 'contract',
      contractDurationMonths: params.rfr.contractDurationMonths,
      attachmentMpp: params.rfr.attachmentMpp,
      attachmentJd: params.rfr.attachmentJd,
      sexPreference: params.rfr.sexPreference || 'any',
      agePreference: params.rfr.agePreference || 'any',
      educationDegree: params.rfr.educationDegree || 'any',
      educationBackground: Array.isArray(params.rfr.educationBackground) ? params.rfr.educationBackground : [],
      yearsOfExperience: params.rfr.yearsOfExperience || 'any',
      fieldOfJobExperience: params.rfr.fieldOfJobExperience || '',
      functionalCompetencies: Array.isArray(params.rfr.functionalCompetencies) ? params.rfr.functionalCompetencies : [],
      approvals: params.approvals.map((a: any) => ({
        stepOrder: a.stepOrder,
        roleLabel: a.roleLabel,
        approverName: a.approverName || '-',
        approverTitle: a.approverTitle || '-',
        status: a.status || 'pending',
        signatureDataUrl: a.signatureDataUrl,
        signedAt: a.signedAt ? new Date(a.signedAt).toISOString() : undefined,
        remarks: a.remarks,
      })),
    })
    pdfBuffer = rawPdf
  } catch (e) {
    console.error('[RFR] Failed to generate completed PDF for email:', e)
  }

  try {
    const hcPolicyCc = await getHumanCapitalPolicyCcRecipients()
    const resolvedTemplate = await resolveWorkflowTemplateContent({
      templateCode: 'rfr_completed_notification',
      cc: hcPolicyCc,
      variables: {
        rfrNumber: params.rfr.rfrNumber,
        positionTitle: params.rfr.positionTitle,
        numberOfPersons: String(params.rfr.numberOfPersons || 1),
        requestorName: params.requestorName,
        sectionDepartment: params.rfr.sectionDepartment,
      },
      fallbackSubject: `[RFR Disetujui] ${params.rfr.rfrNumber} - ${params.rfr.positionTitle} (Lowongan Pekerjaan Telah Dibuat)`,
      fallbackHtml: `<p>Yth. <strong>${params.requestorName}</strong>,</p><p>Permohonan Rekrutmen (RFR) dengan nomor <strong>${params.rfr.rfrNumber}</strong> untuk posisi <strong>${params.rfr.positionTitle}</strong> (${params.rfr.numberOfPersons} orang) telah <strong>selesai disetujui sepenuhnya oleh General Manager</strong>.</p><p>Sistem telah membuat Lowongan Pekerjaan otomatis untuk proses recruitment.</p><p>Dokumen PDF RFR versi final lengkap dengan 6 tanda tangan digital telah dilampirkan pada email ini.</p>`,
      fallbackText: `Yth. ${params.requestorName},\n\nRequest For Recruitment (RFR) ${params.rfr.rfrNumber} (${params.rfr.positionTitle}) telah selesai disetujui sepenuhnya oleh General Manager.\nLowongan pekerjaan baru telah berhasil dibuat secara otomatis.\nDokumen PDF final dilampirkan pada email ini.`,
    })

    if (params.to && params.to.trim()) {
      await sendEmailViaSmtp(smtpSettings, {
        to: params.to.trim(),
        cc: resolvedTemplate.ccList,
        subject: resolvedTemplate.subject,
        text: resolvedTemplate.text,
        html: resolvedTemplate.html,
        templateCode: 'rfr_completed_notification',
        templateName: `RFR Completed #${params.rfr.rfrNumber}`,
        attachments: pdfBuffer
          ? [
              {
                filename: `${params.rfr.rfrNumber}_RFR_Approved_Final.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ]
          : [],
      })
    }
  } catch (error) {
    console.error('[RFR] Completed email send failed:', error)
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
      ? await db.select({ id: employees.id, name: employees.name, email: employees.email, position: employees.jobTitle }).from(employees).where(eq(employees.id, data.requestorEmployeeId)).limit(1)
      : await db.select({ id: employees.id, name: employees.name, email: employees.email, position: employees.jobTitle }).from(employees).where(eq(sql`lower(trim(${employees.name}))`, data.requestorName.trim().toLowerCase())).limit(1)
    const requestorInfo = requestorEmp?.[0]
    const requestorEmail = requestorInfo?.email || ''
    const requestorPosition = requestorInfo?.position || 'Staff'

    const approvalsToInsert = matrix.map((step) => {
      const isRequestorStep = step.stepKey === 'requestor_initiated'

      return {
        rfrId: rfr.id,
        stepOrder: step.stepOrder,
        stepKey: step.stepKey,
        roleLabel: step.roleLabel,
        approverName: isRequestorStep ? (requestorInfo?.name || data.requestorName) : (step.approverName || step.approverTitle),
        approverEmail: isRequestorStep ? requestorEmail : (step.approverEmail || ''),
        approverTitle: isRequestorStep ? requestorPosition : step.approverTitle,
        approverEmployeeId: isRequestorStep ? (data.requestorEmployeeId || requestorInfo ? (requestorEmp?.[0] as any)?.id : null) : (step.approverEmployeeId || null),
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
  tokenOrId: string | number,
  payloadOrSig: { signatureDataUrl?: string; remarks?: string } | string,
  maybeRemarks?: string
) {
  try {
    const signatureDataUrl = typeof payloadOrSig === 'string' ? payloadOrSig : payloadOrSig?.signatureDataUrl || ''
    const remarks = typeof payloadOrSig === 'string' ? (maybeRemarks || '') : (payloadOrSig?.remarks || '')

    if (!signatureDataUrl) {
      return { success: false, error: 'Tanda tangan digital wajib disertakan.' }
    }

    let approval: typeof hcRfrApprovals.$inferSelect | undefined
    if (typeof tokenOrId === 'number' || (!isNaN(Number(tokenOrId)) && !String(tokenOrId).includes('-'))) {
      const [appById] = await db
        .select()
        .from(hcRfrApprovals)
        .where(eq(hcRfrApprovals.id, Number(tokenOrId)))
        .limit(1)
      approval = appById
    }

    if (!approval) {
      const [appByToken] = await db
        .select()
        .from(hcRfrApprovals)
        .where(eq(hcRfrApprovals.approvalToken, String(tokenOrId)))
        .limit(1)
      approval = appByToken
    }

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
        signatureDataUrl,
        remarks: remarks || '',
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

      // Fetch fresh approvals for email attachment
      const updatedApprovals = await db
        .select()
        .from(hcRfrApprovals)
        .where(eq(hcRfrApprovals.rfrId, rfr.id))
        .orderBy(asc(hcRfrApprovals.stepOrder))

      // Resolve requestor email from DB (by exact ID or exact full name)
      let requestorEmail = ''
      if (rfr.requestorEmployeeId) {
        const [emp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, rfr.requestorEmployeeId))
          .limit(1)
        requestorEmail = emp?.email || ''
      }
      if (!requestorEmail && rfr.requestorName) {
        const [emp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(sql`lower(trim(${employees.name}))`, rfr.requestorName.trim().toLowerCase()))
          .limit(1)
        requestorEmail = emp?.email || ''
      }

      // 1. Send Completed Email with attached PDF & templateCode: rfr_completed_notification
      if (requestorEmail) {
        await sendRfrCompletedEmail({
          to: requestorEmail,
          requestorName: rfr.requestorName || 'Requestor',
          rfr,
          approvals: updatedApprovals,
        })
      }

      // 2. Bell notification to requestor that RFR is fully approved
      if (requestorEmail) {
        const baseUrl = await getBaseUrl()
        notifyWorkflowBellRecipients({
          recipientEmails: [requestorEmail],
          eventType: 'rfr_completed_notification',
          category: 'approval_requests',
          title: `RFR ${rfr.rfrNumber} Disetujui!`,
          body: `RFR ${rfr.rfrNumber} (${rfr.positionTitle}) telah disetujui sepenuhnya oleh General Manager. Lowongan pekerjaan telah dibuat otomatis.`,
          url: `${baseUrl}/dashboard/hc/rfr`,
          tagPrefix: 'rfr',
          metadata: { rfrNumber: rfr.rfrNumber, positionTitle: rfr.positionTitle, status: 'approved' },
        })
      }
    }

    try {
      revalidatePath('/dashboard/hc/rfr')
      revalidatePath('/dashboard/hc/recruitment')
      revalidatePath('/dashboard/approval')
    } catch (e) {}

    return { success: true }
  } catch (error: any) {
    console.error('[RFR] Approve step failed:', error)
    return { success: false, error: error.message || 'Gagal memproses persetujuan RFR.' }
  }
}

export async function rejectRfrStep(tokenOrId: string | number, remarks: string) {
  try {
    if (!remarks || remarks.trim().length < 3) {
      return { success: false, error: 'Catatan alasan penolakan (reject) wajib diisi minimal 3 karakter.' }
    }

    let approval: typeof hcRfrApprovals.$inferSelect | undefined
    if (typeof tokenOrId === 'number' || (!isNaN(Number(tokenOrId)) && !String(tokenOrId).includes('-'))) {
      const [appById] = await db
        .select()
        .from(hcRfrApprovals)
        .where(eq(hcRfrApprovals.id, Number(tokenOrId)))
        .limit(1)
      approval = appById
    }

    if (!approval) {
      const [appByToken] = await db
        .select()
        .from(hcRfrApprovals)
        .where(eq(hcRfrApprovals.approvalToken, String(tokenOrId)))
        .limit(1)
      approval = appByToken
    }

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
        : await db.select({ email: employees.email }).from(employees).where(eq(sql`lower(trim(${employees.name}))`, (rfrDetail.requestorName || '').trim().toLowerCase())).limit(1)
      
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

export async function revertRfrStep(tokenOrId: string | number, remarks: string) {
  try {
    if (!remarks || remarks.trim().length < 3) {
      return { success: false, error: 'Catatan alasan revisi (revert) wajib diisi minimal 3 karakter.' }
    }

    let approval: typeof hcRfrApprovals.$inferSelect | undefined
    if (typeof tokenOrId === 'number' || (!isNaN(Number(tokenOrId)) && !String(tokenOrId).includes('-'))) {
      const [appById] = await db
        .select()
        .from(hcRfrApprovals)
        .where(eq(hcRfrApprovals.id, Number(tokenOrId)))
        .limit(1)
      approval = appById
    }

    if (!approval) {
      const [appByToken] = await db
        .select()
        .from(hcRfrApprovals)
        .where(eq(hcRfrApprovals.approvalToken, String(tokenOrId)))
        .limit(1)
      approval = appByToken
    }

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

    // 1. Set only the reverting step back to pending (while preserving previous approved steps & signatures)
    await db
      .update(hcRfrApprovals)
      .set({
        status: 'pending',
        signatureDataUrl: null,
        remarks: remarks || 'Reverted',
        signedAt: null,
      })
      .where(eq(hcRfrApprovals.id, approval.id))

    // 2. Mark request as in_progress and return control to Step 1 (Requestor) to edit
    await db
      .update(hcRfrRequests)
      .set({
        currentStepOrder: 1,
        status: 'in_progress',
        rejectionReason: `Revert dari ${approval.roleLabel} (${approval.approverName}): ${remarks}`,
      })
      .where(eq(hcRfrRequests.id, rfr.id))

    const allApprovals = await db
      .select()
      .from(hcRfrApprovals)
      .where(eq(hcRfrApprovals.rfrId, rfr.id))
      .orderBy(asc(hcRfrApprovals.stepOrder))

    // Collect emails of all prior approvers (steps between Step 1 and reverting step) who already approved
    const priorApprovedEmails = allApprovals
      .filter((a) => a.stepOrder > 1 && a.stepOrder < approval.stepOrder && a.status === 'approved' && a.approverEmail)
      .map((a) => a.approverEmail.trim())

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
        additionalCc: priorApprovedEmails,
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

      // Bell notification to prior approvers
      if (priorApprovedEmails.length > 0) {
        const baseUrl = await getBaseUrl()
        notifyWorkflowBellRecipients({
          recipientEmails: priorApprovedEmails,
          eventType: 'rfr_approval_request',
          category: 'approval_requests',
          title: `RFR ${rfr.rfrNumber} Dikembalikan (Revert)`,
          body: `RFR ${rfr.rfrNumber} (${rfr.positionTitle}) telah dikembalikan oleh ${approval.approverName} ke pemohon untuk revisi. Catatan: "${remarks || 'Tidak ada catatan'}".`,
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

    const requestorEmp = updatedRfr.requestorEmployeeId
      ? await db.select({ name: employees.name, email: employees.email, position: employees.jobTitle }).from(employees).where(eq(employees.id, updatedRfr.requestorEmployeeId)).limit(1)
      : await db.select({ name: employees.name, email: employees.email, position: employees.jobTitle }).from(employees).where(eq(sql`lower(trim(${employees.name}))`, data.requestorName.trim().toLowerCase())).limit(1)
    const requestorPosition = requestorEmp?.[0]?.position || 'Staff'

    if (requestorApproval) {
      await db
        .update(hcRfrApprovals)
        .set({
          status: 'approved',
          signatureDataUrl: data.requestorSignatureDataUrl || requestorApproval.signatureDataUrl || null,
          signedAt: new Date(),
          approverTitle: requestorPosition,
          remarks: 'Resubmitted after revision',
        })
        .where(eq(hcRfrApprovals.id, requestorApproval.id))
    }

    const requestorStepOrder = requestorApproval?.stepOrder ?? 1

    // 3. Find the first pending step after the requestor step (e.g. Step 3 that reverted, jumping over already approved Step 2)
    const nextPendingApproval = allApprovals.find(
      (a) => a.stepOrder > requestorStepOrder && a.status === 'pending'
    )

    if (nextPendingApproval) {
      const targetStepOrder = nextPendingApproval.stepOrder
      // Update request currentStepOrder and clear rejection reason
      await db
        .update(hcRfrRequests)
        .set({
          currentStepOrder: targetStepOrder,
          rejectionReason: '',
        })
        .where(eq(hcRfrRequests.id, id))

      // Collect emails of all prior approvers (steps between Step 1 and targetStepOrder) who already approved
      const priorApprovedEmails = allApprovals
        .filter((a) => a.stepOrder > 1 && a.stepOrder < targetStepOrder && a.status === 'approved' && a.approverEmail)
        .map((a) => a.approverEmail.trim())

      // Trigger notification & email to that pending step with CC to all prior approvers
      await sendRfrApprovalEmail({
        to: nextPendingApproval.approverEmail,
        approverName: nextPendingApproval.approverName,
        approvalStep: `${nextPendingApproval.roleLabel} (Langkah ${targetStepOrder}/${totalSteps})`,
        rfr: updatedRfr,
        approvals: allApprovals,
        approvalToken: nextPendingApproval.approvalToken,
        additionalCc: priorApprovedEmails,
        isResubmit: true,
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

      // Bell notification to prior approvers
      if (priorApprovedEmails.length > 0) {
        const baseUrl = await getBaseUrl()
        notifyWorkflowBellRecipients({
          recipientEmails: priorApprovedEmails,
          eventType: 'rfr_approval_request',
          category: 'approval_requests',
          title: `RFR ${updatedRfr.rfrNumber} Telah Diresubmit`,
          body: `RFR ${updatedRfr.rfrNumber} (${updatedRfr.positionTitle}) telah selesai direvisi dan diresubmit oleh pemohon ke tahap ${nextPendingApproval.roleLabel}.`,
          url: `${baseUrl}/dashboard/hc/rfr`,
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
      revalidatePath('/dashboard/hc/recruitment')
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

export async function getRfrDetail(id: number | string) {
  let numericId: number
  if (typeof id === 'number') {
    numericId = id
  } else {
    const cleaned = String(id).replace(/^rfr-/, '')
    numericId = parseInt(cleaned, 10)
    if (isNaN(numericId)) return null
  }

  let [rfr] = await db
    .select()
    .from(hcRfrRequests)
    .where(eq(hcRfrRequests.id, numericId))
    .limit(1)

  // Fallback: in case approval ID was passed instead of rfr ID
  if (!rfr) {
    const [approval] = await db
      .select({ rfrId: hcRfrApprovals.rfrId })
      .from(hcRfrApprovals)
      .where(eq(hcRfrApprovals.id, numericId))
      .limit(1)
    if (approval?.rfrId) {
      const [rfrByApp] = await db
        .select()
        .from(hcRfrRequests)
        .where(eq(hcRfrRequests.id, approval.rfrId))
        .limit(1)
      rfr = rfrByApp
      numericId = approval.rfrId
    }
  }

  if (!rfr) return null

  const approvals = await db
    .select()
    .from(hcRfrApprovals)
    .where(eq(hcRfrApprovals.rfrId, numericId))
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

