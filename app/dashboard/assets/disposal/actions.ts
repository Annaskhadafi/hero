'use server'

import { db } from '@/db'
import { assetDisposals, type AssetDisposalRow } from '@/db/schema/asset-disposal'
import { centralServiceAssets, centralServiceAssetHistories } from '@/db/schema/central-service'
import { approvals, employees, masterDepartments, masterSections, sites } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployeeAccessContext, isSuperAdminRole } from '@/lib/hero-access'
import { and, desc, eq, ilike, or, sql, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { generateAssetDisposalPdf } from '@/lib/asset-disposal-pdf'
import { saveGeneratedPdfUpload } from '@/lib/save-pdf-upload'
import { assetDisposalInputSchema, type AssetDisposalInput, type DisposalApproverStep } from './schema'
import { sendAssetRevisionRequestedEmail, sendAssetResubmittedEmail } from '@/lib/asset-approval-email'

/**
 * Fetch Asset Disposal list with filtering, pagination, and KPI counts
 */
export async function getAssetDisposals(params?: {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Unauthorized',
        items: [],
        total: 0,
        kpi: { total: 0, pending: 0, approved: 0, rejected: 0 },
      }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

    const search = params?.search?.trim() || ''
    const statusFilter = params?.status?.trim() || ''
    const page = Math.max(1, params?.page || 1)
    const pageSize = Math.max(1, Math.min(100, params?.pageSize || 25))
    const offset = (page - 1) * pageSize

    const conditions = []

    if (search) {
      conditions.push(
        or(
          ilike(assetDisposals.disposalNumber, `%${search}%`),
          ilike(assetDisposals.assetName, `%${search}%`),
          ilike(assetDisposals.assetNumber, `%${search}%`),
          ilike(assetDisposals.applicantName, `%${search}%`),
          ilike(assetDisposals.departmentName, `%${search}%`),
          ilike(assetDisposals.siteName, `%${search}%`)
        )
      )
    }

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(assetDisposals.status, statusFilter))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [totalRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assetDisposals)
      .where(whereClause)

    const total = Number(totalRes?.count || 0)

    const items = await db
      .select()
      .from(assetDisposals)
      .where(whereClause)
      .orderBy(desc(assetDisposals.createdAt))
      .limit(pageSize)
      .offset(offset)

    // Calculate KPI Stats
    const [kpiStats] = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${assetDisposals.status} = 'pending')`,
        approved: sql<number>`count(*) filter (where ${assetDisposals.status} = 'approved')`,
        rejected: sql<number>`count(*) filter (where ${assetDisposals.status} in ('rejected', 'cancelled'))`,
      })
      .from(assetDisposals)

    const currentEmpId = empContext?.employeeId
    const currentUserId = session.user.id

    return {
      success: true,
      items: items.map((item) => {
        const isCreator =
          (currentUserId && item.createdById === currentUserId) ||
          (currentEmpId && item.applicantEmployeeId === currentEmpId)
        return {
          ...item,
          attachments: JSON.parse(item.attachments || '[]'),
          canEditRevision: Boolean(item.status === 'needs_revision' && (isCreator || isSuperAdmin)),
        }
      }),
      total,
      page,
      pageSize,
      kpi: {
        total: Number(kpiStats?.total || 0),
        pending: Number(kpiStats?.pending || 0),
        approved: Number(kpiStats?.approved || 0),
        rejected: Number(kpiStats?.rejected || 0),
      },
    }
  } catch (error: any) {
    console.error('[getAssetDisposals] Error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal mengambil data Asset Disposal.',
      items: [],
      total: 0,
      kpi: { total: 0, pending: 0, approved: 0, rejected: 0 },
    }
  }
}

/**
 * Fetch detail of an Asset Disposal request
 */
export async function getAssetDisposalDetail(id: number) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, id))
      .limit(1)

    if (!disposal) {
      return { success: false, message: 'Data permohonan Asset Disposal tidak ditemukan.' }
    }

    const approvalSteps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.assetDisposalId, id))
      .orderBy(approvals.level)

    const isPending = disposal.status === 'pending'
    const activeStep = approvalSteps.find((s) => s.status === 'Pending' || s.level === disposal.currentStepOrder)
    const currentApproverId = disposal.currentApproverEmployeeId || activeStep?.approverEmployeeId

    const canApprove = Boolean(
      isPending &&
        (isSuperAdmin || (empContext?.employeeId && currentApproverId === empContext.employeeId))
    )

    const canCancel = Boolean(
      isPending &&
        (isSuperAdmin ||
          (session?.user?.id && disposal.createdById === session.user.id) ||
          (empContext?.employeeId && disposal.applicantEmployeeId === empContext.employeeId))
    )

    const canEditRevision = Boolean(
      disposal.status === 'needs_revision' &&
        (isSuperAdmin ||
          (session?.user?.id && disposal.createdById === session.user.id) ||
          (empContext?.employeeId && disposal.applicantEmployeeId === empContext.employeeId))
    )

    return {
      success: true,
      data: {
        ...disposal,
        attachments: JSON.parse(disposal.attachments || '[]'),
        approvalSteps,
        canApprove,
        canCancel,
        canEditRevision,
      },
    }
  } catch (error: any) {
    console.error('[getAssetDisposalDetail] Error:', error)
    return { success: false, message: error?.message || 'Gagal mengambil detail Asset Disposal.' }
  }
}

/**
 * Dynamic Approval Hierarchy Resolver:
 * Resolves standard organizational chain up to Director, ensuring Amama Ira is mandatory before General Manager.
 */
export async function getDisposalDefaultApprovers(applicantEmployeeId?: number) {
  try {
    // 1. Fetch Amama Ira (Finance & Accounting Supervisor - ID 1341, SN 76436)
    const [amamaIra] = await db
      .select({
        id: employees.id,
        name: employees.name,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(or(ilike(employees.name, '%Amama Ira%'), eq(employees.employeeSn, '76436')))
      .limit(1)

    // 2. Fetch General Manager (Person Sihaloho - ID 940)
    const [generalManager] = await db
      .select({
        id: employees.id,
        name: employees.name,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(or(ilike(employees.jobTitle, '%General Manager%'), eq(employees.id, 940)))
      .limit(1)

    // 3. Fetch Director (Hidayat Rahman - ID 10)
    const [director] = await db
      .select({
        id: employees.id,
        name: employees.name,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(or(ilike(employees.jobTitle, '%Director%'), eq(employees.id, 10)))
      .limit(1)

    // 4. Resolve applicant's Section Head and Dept Head
    let step1Approver: { id: number; name: string; jobTitle: string } | null = null
    let step2Approver: { id: number; name: string; jobTitle: string } | null = null

    if (applicantEmployeeId) {
      const [applicant] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, applicantEmployeeId))
        .limit(1)

      if (applicant) {
        // Direct manager or section head
        if (applicant.directManagerId && applicant.directManagerId !== applicant.id) {
          const [dm] = await db
            .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle })
            .from(employees)
            .where(eq(employees.id, applicant.directManagerId))
            .limit(1)
          if (dm) step1Approver = dm
        }

        // Section Head fallback
        if (!step1Approver && applicant.sectionId) {
          const [sec] = await db
            .select({ headEmployeeId: masterSections.headEmployeeId })
            .from(masterSections)
            .where(eq(masterSections.id, applicant.sectionId))
            .limit(1)
          if (sec?.headEmployeeId && sec.headEmployeeId !== applicant.id) {
            const [sh] = await db
              .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle })
              .from(employees)
              .where(eq(employees.id, sec.headEmployeeId))
              .limit(1)
            if (sh) step1Approver = sh
          }
        }

        // Department Head / Manager
        if (applicant.departmentId) {
          const [dept] = await db
            .select({ headEmployeeId: masterDepartments.headEmployeeId })
            .from(masterDepartments)
            .where(eq(masterDepartments.id, applicant.departmentId))
            .limit(1)
          if (dept?.headEmployeeId && dept.headEmployeeId !== applicant.id) {
            const [dh] = await db
              .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle })
              .from(employees)
              .where(eq(employees.id, dept.headEmployeeId))
              .limit(1)
            if (dh) step2Approver = dh
          }
        }
      }
    }

    // Fallbacks if not found
    if (!step1Approver) {
      step1Approver = {
        id: 1008,
        name: 'Andana Gustafianto',
        jobTitle: 'Marketing & Corporate Comm. Coordinator / Atasan Langsung',
      }
    }

    if (!step2Approver) {
      step2Approver = {
        id: 960,
        name: 'Febrian Dani',
        jobTitle: 'Finance Business Partners Manager',
      }
    }

    // Assemble the complete 5-step hierarchy
    const defaultSteps: DisposalApproverStep[] = [
      {
        level: 1,
        title: 'Step 1: Atasan Langsung / Section Head (Mengetahui)',
        approverEmployeeId: step1Approver.id,
        approverName: step1Approver.name,
        jobTitle: step1Approver.jobTitle,
      },
      {
        level: 2,
        title: 'Step 2: Department Head / Manager (Menyetujui)',
        approverEmployeeId: step2Approver.id,
        approverName: step2Approver.name,
        jobTitle: step2Approver.jobTitle,
      },
      {
        level: 3,
        title: 'Step 3: Verifikasi by Finance & Accounting (Amama Ira)',
        approverEmployeeId: amamaIra?.id || 1341,
        approverName: amamaIra?.name || 'Amama Ira Amalia Priyono',
        jobTitle: amamaIra?.jobTitle || 'Finance & Accounting Supervisor',
      },
      {
        level: 4,
        title: 'Step 4: General Manager (Otorisasi GM)',
        approverEmployeeId: generalManager?.id || 940,
        approverName: generalManager?.name || 'Person Sihaloho',
        jobTitle: generalManager?.jobTitle || 'General Manager',
      },
      {
        level: 5,
        title: 'Step 5: Director (Persetujuan Final)',
        approverEmployeeId: director?.id || 10,
        approverName: director?.name || 'Hidayat Rahman',
        jobTitle: director?.jobTitle || 'Director',
      },
    ]

    return {
      success: true,
      approvers: defaultSteps,
    }
  } catch (error: any) {
    console.error('[getDisposalDefaultApprovers] Error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal memetakan approver default.',
      approvers: [],
    }
  }
}

/**
 * Fetch master data needed for the form (sites, depts, sections, central assets, current employee)
 */
export async function getDisposalFormData() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const empContext = await getCurrentEmployeeAccessContext()

    // 1. Fetch current employee
    let currentEmployee: any = null
    if (empContext?.employeeId) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, empContext.employeeId))
        .limit(1)
      currentEmployee = emp || null
    }

    // 2. Fetch sites
    const siteList = await db
      .select({ id: sites.id, name: sites.name, location: sites.location })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(sites.name)

    // 3. Fetch departments
    const deptList = await db
      .select({ id: masterDepartments.id, name: masterDepartments.name, code: masterDepartments.code })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true))
      .orderBy(masterDepartments.name)

    // 4. Fetch sections
    const secList = await db
      .select({
        id: masterSections.id,
        name: masterSections.name,
        departmentId: masterSections.departmentId,
      })
      .from(masterSections)
      .where(eq(masterSections.isActive, true))
      .orderBy(masterSections.name)

    // 5. Fetch Active Central Service Assets (Hybrid Selection)
    const assetList = await db
      .select({
        id: centralServiceAssets.id,
        assetNumber: centralServiceAssets.assetNumber,
        description: centralServiceAssets.description,
        serialNumber: centralServiceAssets.serialNumber,
        condition: centralServiceAssets.condition,
        location: centralServiceAssets.location,
        section: centralServiceAssets.section,
        purchaseDate: centralServiceAssets.purchaseDate,
        status: centralServiceAssets.status,
      })
      .from(centralServiceAssets)
      .where(eq(centralServiceAssets.status, 'ACTIVE'))
      .orderBy(centralServiceAssets.description)
      .limit(300)

    // 6. Fetch default approvers
    const approversRes = await getDisposalDefaultApprovers(currentEmployee?.id)

    return {
      success: true,
      currentEmployee,
      sites: siteList,
      departments: deptList,
      sections: secList,
      assets: assetList,
      defaultApprovers: approversRes.approvers || [],
    }
  } catch (error: any) {
    console.error('[getDisposalFormData] Error:', error)
    return { success: false, message: error?.message || 'Gagal memuat master data form.' }
  }
}

/**
 * Create a new Asset Disposal submission
 */
export async function createAssetDisposal(rawInput: AssetDisposalInput) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    const parsed = assetDisposalInputSchema.safeParse(rawInput)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join(', ')
      return { success: false, message: `Validasi gagal: ${issues}` }
    }
    const input = parsed.data

    const empContext = await getCurrentEmployeeAccessContext()

    // 1. Resolve applicant details
    let applicantName = 'Staff'
    let applicantJobTitle = 'Staff'
    let applicantEmployeeId = input.applicantEmployeeId || empContext?.employeeId || null

    if (applicantEmployeeId) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, applicantEmployeeId))
        .limit(1)
      if (emp) {
        applicantName = emp.name
        applicantJobTitle = emp.jobTitle || applicantJobTitle
      }
    } else if (session.user.name) {
      applicantName = session.user.name
    }

    // 2. Generate sequential number: DSP-YYYYMM-XXXX
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const prefix = `DSP-${yearMonth}-`

    const [lastRecord] = await db
      .select({ disposalNumber: assetDisposals.disposalNumber })
      .from(assetDisposals)
      .where(ilike(assetDisposals.disposalNumber, `${prefix}%`))
      .orderBy(desc(assetDisposals.id))
      .limit(1)

    let nextSeq = 1
    if (lastRecord?.disposalNumber) {
      const parts = lastRecord.disposalNumber.split('-')
      const lastSeq = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1
    }
    const disposalNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`

    // 3. Resolve Approver Chain
    let approvalChain: DisposalApproverStep[] = []
    if (input.customApprovers && input.customApprovers.length > 0) {
      approvalChain = input.customApprovers
    } else {
      const defRes = await getDisposalDefaultApprovers(applicantEmployeeId || undefined)
      approvalChain = defRes.approvers || []
    }

    // Guardrail: Validate that Amama Ira (ID 1341 / SN 76436) exists in the chain
    const amamaIndex = approvalChain.findIndex(
      (s) =>
        s.approverEmployeeId === 1341 ||
        s.approverName.toLowerCase().includes('amama ira')
    )

    if (amamaIndex === -1) {
      return {
        success: false,
        message:
          'Validasi Alur Approval: Verifikasi by Finance & Accounting (Amama Ira) wajib disertakan dalam rantai approval.',
      }
    }

    // Guardrail: Validate that Amama Ira occurs BEFORE General Manager & Director
    const gmIndex = approvalChain.findIndex(
      (s) =>
        s.approverEmployeeId === 940 ||
        (s.jobTitle && s.jobTitle.toLowerCase().includes('general manager'))
    )
    if (gmIndex !== -1 && amamaIndex > gmIndex) {
      return {
        success: false,
        message:
          'Validasi Alur Approval: Verifikasi Finance & Accounting (Amama Ira) wajib diposisikan SEBELUM General Manager.',
      }
    }

    const firstApprover = approvalChain[0]

    // 4. Insert into hero_asset_disposals
    const [newDisposal] = await db
      .insert(assetDisposals)
      .values({
        disposalNumber,
        assetId: input.assetId || null,
        assetName: input.assetName,
        assetNumber: input.assetNumber || null,
        purchaseYear: input.purchaseYear || null,
        departmentId: input.departmentId || null,
        departmentName: input.departmentName,
        sectionId: input.sectionId || null,
        sectionName: input.sectionName || null,
        siteId: input.siteId,
        siteName: input.siteName,
        disposalDate: input.disposalDate,
        notes: input.notes,
        attachments: JSON.stringify(input.attachments || []),
        applicantEmployeeId,
        applicantName,
        applicantJobTitle,
        createdById: session.user.id,
        status: 'pending',
        currentStepOrder: 1,
        totalSteps: approvalChain.length,
        currentApproverEmployeeId: firstApprover.approverEmployeeId,
        currentApproverName: firstApprover.approverName,
        submittedAt: now,
      })
      .returning()

    // 5. Insert steps into hero_approvals for central inbox integration
    for (let i = 0; i < approvalChain.length; i++) {
      const step = approvalChain[i]
      await db.insert(approvals).values({
        assetDisposalId: newDisposal.id,
        level: i + 1,
        approverName: step.approverName,
        approverEmployeeId: step.approverEmployeeId,
        status: i === 0 ? 'Pending' : 'Draft',
        submittedAt: now,
        activityType: 'asset_disposal',
        requestNumber: disposalNumber,
        activityTitle: `Disposal Aset: ${input.assetName} (${input.assetNumber || '-'})`,
        formName: 'Asset Disposal',
        decisionNote: step.title,
        approverRole: step.jobTitle || undefined,
        resolutionSource: 'matrix',
      })
    }

    revalidatePath('/dashboard/assets/disposal')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Form Asset Disposal ${disposalNumber} berhasil diajukan.`,
      disposalNumber,
      id: newDisposal.id,
    }
  } catch (error: any) {
    console.error('[createAssetDisposal] Error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal menyimpan pengajuan Asset Disposal.',
    }
  }
}

/**
 * Approve current step / Final Approve by Director
 */
export async function approveAssetDisposal(id: number, decisionNote: string, signatureUrl?: string) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    if (!decisionNote || !decisionNote.trim()) {
      return { success: false, message: 'Catatan persetujuan wajib diisi.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, id))
      .limit(1)

    if (!disposal) {
      return { success: false, message: 'Data permohonan Asset Disposal tidak ditemukan.' }
    }

    if (disposal.status !== 'pending') {
      return { success: false, message: `Permohonan sudah berstatus ${disposal.status.toUpperCase()}.` }
    }

    const approvalSteps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.assetDisposalId, id))
      .orderBy(approvals.level)

    const currentStep = approvalSteps.find((s) => s.level === disposal.currentStepOrder)
    if (!currentStep) {
      return { success: false, message: 'Tahap approval aktif tidak ditemukan.' }
    }

    // Permission check
    const isAuthorized =
      isSuperAdmin || (empContext?.employeeId && currentStep.approverEmployeeId === empContext.employeeId)
    if (!isAuthorized) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak otorisasi untuk menyetujui tahap ini.',
      }
    }

    const now = new Date()

    // 1. Mark current step as Approved
    await db
      .update(approvals)
      .set({
        status: 'Approved',
        decisionNote: decisionNote.trim(),
        signatureUrl: signatureUrl || undefined,
        reviewedAt: now,
      })
      .where(eq(approvals.id, currentStep.id))

    // 2. Check if there is next step in chain
    const nextStep = approvalSteps.find((s) => s.level === disposal.currentStepOrder + 1)

    if (nextStep) {
      // Escalate to next step
      await db
        .update(approvals)
        .set({ status: 'Pending' })
        .where(eq(approvals.id, nextStep.id))

      await db
        .update(assetDisposals)
        .set({
          currentStepOrder: nextStep.level || disposal.currentStepOrder + 1,
          currentApproverEmployeeId: nextStep.approverEmployeeId,
          currentApproverName: nextStep.approverName,
          updatedAt: now,
        })
        .where(eq(assetDisposals.id, id))

      revalidatePath('/dashboard/assets/disposal')
      revalidatePath('/dashboard/approval')

      return {
        success: true,
        message: `Persetujuan tahap ${disposal.currentStepOrder} berhasil dicatat. Permohonan diteruskan ke ${nextStep.approverName}.`,
      }
    } else {
      // Final step approved (Director)! Generate Official A4 PDF Document
      let pdfUrl: string | null = null
      try {
        const [applicant] = await db
          .select({
            name: employees.name,
            employeeSn: employees.employeeSn,
            jobTitle: employees.jobTitle,
            signatureDataUrl: employees.signatureDataUrl,
          })
          .from(employees)
          .where(eq(employees.id, disposal.applicantEmployeeId || 0))
          .limit(1)

        const allApprovals = await db
          .select()
          .from(approvals)
          .where(eq(approvals.assetDisposalId, id))
          .orderBy(asc(approvals.level))

        const pdfApprovers = allApprovals.map((s) => ({
          level: s.level,
          title: s.decisionNote || `Step ${s.level}`,
          approverName: s.approverName,
          status: s.status,
          reviewedAt: s.reviewedAt,
          signatureUrl: s.signatureUrl,
        }))

        const attachments = (disposal.attachmentUrls as string[] || []).map((url, idx) => ({
          fileName: url.split('/').pop() || `Lampiran ${idx + 1}`,
          fileUrl: url,
        }))

        const pdfBytes = await generateAssetDisposalPdf({
          disposalNumber: disposal.disposalNumber,
          disposalDate: disposal.disposalDate,
          status: 'approved',
          applicantName: applicant?.name || disposal.applicantName,
          applicantSn: applicant?.employeeSn,
          applicantJobTitle: applicant?.jobTitle,
          applicantSignatureUrl: applicant?.signatureDataUrl,
          departmentName: disposal.departmentName,
          sectionName: disposal.sectionName,
          siteName: disposal.siteName,
          assetName: disposal.assetName,
          assetNumber: disposal.assetNumber,
          purchaseYear: disposal.purchaseYear,
          notes: disposal.notes || '-',
          attachments,
          submittedAt: disposal.submittedAt,
          approvedAt: now,
          approvals: pdfApprovers,
        } as any)

        pdfUrl = await saveGeneratedPdfUpload(pdfBytes, 'asset-disposal', disposal.disposalNumber)
      } catch (pdfErr) {
        console.error('[approveAssetDisposal] PDF generation error:', pdfErr)
      }

      await db
        .update(assetDisposals)
        .set({
          status: 'approved',
          pdfUrl: pdfUrl || undefined,
          approvedAt: now,
          updatedAt: now,
        })
        .where(eq(assetDisposals.id, id))

      // Update central asset status to 'DISPOSED' if assetId is linked
      if (disposal.assetId) {
        await db
          .update(centralServiceAssets)
          .set({
            status: 'DISPOSED',
            updatedAt: now,
          })
          .where(eq(centralServiceAssets.id, disposal.assetId))

        // Record history log in centralServiceAssetHistories
        await db.insert(centralServiceAssetHistories).values({
          assetId: disposal.assetId,
          action: 'update',
          fieldName: 'status',
          fieldLabel: 'Status Aset',
          previousValue: 'ACTIVE',
          newValue: 'DISPOSED',
          changeRemark: `Disposal aset disetujui penuh via permohonan ${disposal.disposalNumber}. Catatan: ${decisionNote.trim()}`,
        })
      }

      revalidatePath('/dashboard/assets/disposal')
      revalidatePath('/dashboard/approval')
      revalidatePath('/dashboard/central-service/assets')

      return {
        success: true,
        message: `Permohonan ${disposal.disposalNumber} telah disetujui penuh (Full Approved). Status aset di Master Data telah diperbarui menjadi DISPOSED.`,
      }
    }
  } catch (error: any) {
    console.error('[approveAssetDisposal] Error:', error)
    return { success: false, message: error?.message || 'Gagal memproses persetujuan Asset Disposal.' }
  }
}

/**
 * Reject Asset Disposal request
 */
export async function rejectAssetDisposal(id: number, rejectionNote: string) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    if (!rejectionNote || !rejectionNote.trim()) {
      return { success: false, message: 'Alasan penolakan wajib diisi.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, id))
      .limit(1)

    if (!disposal) {
      return { success: false, message: 'Data permohonan Asset Disposal tidak ditemukan.' }
    }

    const approvalSteps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.assetDisposalId, id))
      .orderBy(approvals.level)

    const currentStep = approvalSteps.find((s) => s.level === disposal.currentStepOrder)
    const isAuthorized =
      isSuperAdmin || (empContext?.employeeId && currentStep?.approverEmployeeId === empContext.employeeId)
    if (!isAuthorized) {
      return { success: false, message: 'Anda tidak memiliki hak otorisasi untuk menolak tahap ini.' }
    }

    const now = new Date()

    if (currentStep) {
      await db
        .update(approvals)
        .set({
          status: 'Rejected',
          decisionNote: rejectionNote.trim(),
          reviewedAt: now,
        })
        .where(eq(approvals.id, currentStep.id))
    }

    await db
      .update(assetDisposals)
      .set({
        status: 'rejected',
        rejectedAt: now,
        rejectionNote: rejectionNote.trim(),
        updatedAt: now,
      })
      .where(eq(assetDisposals.id, id))

    revalidatePath('/dashboard/assets/disposal')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Permohonan ${disposal.disposalNumber} telah ditolak.`,
    }
  } catch (error: any) {
    console.error('[rejectAssetDisposal] Error:', error)
    return { success: false, message: error?.message || 'Gagal menolak Asset Disposal.' }
  }
}

/**
 * Cancel Asset Disposal request (by creator or superadmin)
 */
export async function cancelAssetDisposal(id: number, cancellationReason?: string) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, id))
      .limit(1)

    if (!disposal) {
      return { success: false, message: 'Data permohonan Asset Disposal tidak ditemukan.' }
    }

    const isCreator =
      (session.user.id && disposal.createdById === session.user.id) ||
      (empContext?.employeeId && disposal.applicantEmployeeId === empContext.employeeId)

    if (!isSuperAdmin && !isCreator) {
      return { success: false, message: 'Anda hanya dapat membatalkan permohonan yang anda buat sendiri.' }
    }

    if (disposal.status !== 'pending') {
      return { success: false, message: 'Hanya permohonan berstatus pending yang dapat dibatalkan.' }
    }

    const now = new Date()

    // Mark active/draft approvals as Cancelled
    await db
      .update(approvals)
      .set({ status: 'Cancelled' })
      .where(eq(approvals.assetDisposalId, id))

    await db
      .update(assetDisposals)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancellationReason: cancellationReason || 'Dibatalkan oleh pembuat permohonan.',
        updatedAt: now,
      })
      .where(eq(assetDisposals.id, id))

    revalidatePath('/dashboard/assets/disposal')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Permohonan ${disposal.disposalNumber} berhasil dibatalkan.`,
    }
  } catch (error: any) {
    console.error('[cancelAssetDisposal] Error:', error)
    return { success: false, message: error?.message || 'Gagal membatalkan Asset Disposal.' }
  }
}

/**
 * Revert Asset Disposal (Kembalikan ke Pemohon untuk Revisi)
 */
export async function revertAssetDisposalAction(id: number, revertReason: string) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    if (!revertReason || !revertReason.trim()) {
      return { success: false, message: 'Catatan alasan revisi wajib diisi.' }
    }

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, id))
      .limit(1)

    if (!disposal) {
      return { success: false, message: 'Data Asset Disposal tidak ditemukan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isCurrentApprover = Boolean(
      empContext?.employeeId && disposal.currentApproverEmployeeId === empContext.employeeId
    )

    if (!isSuperAdmin && !isCurrentApprover) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak akses untuk merevert permohonan Asset Disposal ini.',
      }
    }

    const allSteps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.assetDisposalId, id))
      .orderBy(approvals.level)

    const activeStep =
      allSteps.find((s) => s.status === 'Pending' || s.level === disposal.currentStepOrder) ||
      allSteps[0]

    const revertStepLevel = activeStep?.level || disposal.currentStepOrder || 1
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .update(assetDisposals)
        .set({
          status: 'needs_revision',
          lastRevertNote: revertReason.trim(),
          lastRevertStepOrder: revertStepLevel,
          lastRevertedByEmployeeId: empContext?.employeeId || null,
          updatedAt: now,
        })
        .where(eq(assetDisposals.id, id))

      if (activeStep) {
        await tx
          .update(approvals)
          .set({
            status: 'Reverted',
            reviewedAt: now,
            decisionNote: `Revisi diminta: ${revertReason.trim()}`,
            rejectionReason: revertReason.trim(),
          })
          .where(eq(approvals.id, activeStep.id))
      }
    })

    // Send email & bell notification to applicant
    const [applicant] = disposal.applicantEmployeeId
      ? await db
          .select({ email: employees.email, name: employees.name })
          .from(employees)
          .where(eq(employees.id, disposal.applicantEmployeeId))
          .limit(1)
      : [null]

    if (applicant?.email) {
      await sendAssetRevisionRequestedEmail({
        module: 'ASSET_DISPOSAL',
        applicantEmail: applicant.email,
        applicantName: applicant.name,
        documentNumber: disposal.disposalNumber,
        assetName: disposal.assetName,
        revertedByName: empContext?.employeeName || disposal.currentApproverName || 'Approver',
        revertNote: revertReason.trim(),
        targetId: id,
      }).catch((err) => console.error('[revertAssetDisposalAction] Email error:', err))
    }

    revalidatePath('/dashboard/assets/disposal')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Permohonan disposal ${disposal.disposalNumber} berhasil dikembalikan ke pemohon untuk revisi.`,
    }
  } catch (error: any) {
    console.error('[revertAssetDisposalAction] Error:', error)
    return { success: false, message: error?.message || 'Gagal merevert permohonan Asset Disposal.' }
  }
}

/**
 * Resubmit Asset Disposal (Kirim Ulang Revisi oleh Pemohon -> Langsung Kembali ke Last Approver)
 */
export async function resubmitAssetDisposalAction(input: {
  id: number
  notes?: string
  attachments?: Array<{ fileName: string; fileUrl: string; fileSize?: number }>
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, input.id))
      .limit(1)

    if (!disposal) {
      return { success: false, message: 'Data Asset Disposal tidak ditemukan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isCreator = Boolean(
      (empContext?.employeeId && disposal.applicantEmployeeId === empContext.employeeId) ||
      (session.user.id && disposal.createdById === session.user.id)
    )

    if (!isCreator && !isSuperAdmin) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak akses untuk memperbarui permohonan ini.',
      }
    }

    const now = new Date()
    const targetStepLevel = disposal.lastRevertStepOrder || disposal.currentStepOrder || 1

    const [targetStep] = await db
      .select()
      .from(approvals)
      .where(and(eq(approvals.assetDisposalId, input.id), eq(approvals.level, targetStepLevel)))
      .limit(1)

    await db.transaction(async (tx) => {
      await tx
        .update(assetDisposals)
        .set({
          notes: input.notes !== undefined ? input.notes : disposal.notes,
          attachments: input.attachments ? JSON.stringify(input.attachments) : disposal.attachments,
          status: 'pending',
          currentStepOrder: targetStepLevel,
          currentApproverEmployeeId: targetStep?.approverEmployeeId || disposal.currentApproverEmployeeId,
          currentApproverName: targetStep?.approverName || disposal.currentApproverName,
          updatedAt: now,
        })
        .where(eq(assetDisposals.id, input.id))

      if (targetStep) {
        // Reset only the reverted step back to Pending. Previous steps remain Approved!
        await tx
          .update(approvals)
          .set({
            status: 'Pending',
            submittedAt: now,
            decisionNote: 'Resubmitted oleh pemohon',
            rejectionReason: '',
            reviewedAt: null,
            signatureUrl: null,
          })
          .where(eq(approvals.id, targetStep.id))
      }
    })

    // Send email & bell notification to the last approver
    if (targetStep?.approverEmployeeId) {
      const [approverEmp] = await db
        .select({ email: employees.email, name: employees.name })
        .from(employees)
        .where(eq(employees.id, targetStep.approverEmployeeId))
        .limit(1)

      if (approverEmp?.email) {
        await sendAssetResubmittedEmail({
          module: 'ASSET_DISPOSAL',
          approverEmail: approverEmp.email,
          approverName: approverEmp.name,
          documentNumber: disposal.disposalNumber,
          assetName: disposal.assetName,
          applicantName: disposal.applicantName,
        }).catch((err) => console.error('[resubmitAssetDisposalAction] Email error:', err))
      }
    }

    revalidatePath('/dashboard/assets/disposal')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Revisi permohonan ${disposal.disposalNumber} berhasil dikirim kembali ke ${targetStep?.approverName || 'Approver'}.`,
    }
  } catch (error: any) {
    console.error('[resubmitAssetDisposalAction] Error:', error)
    return { success: false, message: error?.message || 'Gagal mengirim ulang revisi Asset Disposal.' }
  }
}
