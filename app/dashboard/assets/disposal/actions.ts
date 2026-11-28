'use server'

import { db } from '@/db'
import { onechitaDb } from '@/db/onechitra-db'
import { assetDisposals, type AssetDisposalRow } from '@/db/schema/asset-disposal'
import { centralServiceAssets, centralServiceAssetHistories } from '@/db/schema/central-service'
import { approvals, employees, masterDepartments, masterSections, sites } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployeeAccessContext, isSuperAdminRole } from '@/lib/hero-access'
import { isSuperAdminUser } from '@/lib/role-utils'
import { and, desc, eq, ilike, or, sql, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { generateAssetDisposalPdf } from '@/lib/asset-disposal-pdf'
import { saveGeneratedPdfUpload } from '@/lib/save-pdf-upload'
import { assetDisposalInputSchema, type AssetDisposalInput, type DisposalApproverStep } from './schema'
import {
  sendAssetRevisionRequestedEmail,
  sendAssetResubmittedEmail,
  sendAssetDisposalSubmittedEmail,
  sendAssetDisposalApprovedEmail,
  sendAssetDisposalAuctionReadyEmail,
  sendAssetDisposalFinanceReadyEmail,
  sendAssetDisposalCompletedEmail,
  sendAssetDisposalBaReadyEmail,
  sendAssetDisposalBaSubmittedEmail,
} from '@/lib/asset-approval-email'
import { isAssetTestingApprover, resolveAssetTestingApprover } from '@/lib/asset-testing-guard'

/**
 * Fetch Asset Disposal list with filtering, pagination, and KPI counts
 */
export async function getAssetDisposals(params?: {
  search?: string
  status?: string
  disposalType?: string
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
    const isSuperAdmin =
      isSuperAdminRole(empContext?.roleName) || isSuperAdminUser(empContext as any, session?.user)

    const search = params?.search?.trim() || ''
    const statusFilter = params?.status?.trim() || ''
    const disposalTypeFilter = params?.disposalType?.trim() || ''
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

    if (disposalTypeFilter && disposalTypeFilter !== 'all') {
      conditions.push(eq(assetDisposals.disposalType, disposalTypeFilter))
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
        const parsedItems = JSON.parse(item.items || '[]')
        const calculatedTotalBookValue =
          Number(item.totalBookValue) ||
          parsedItems.reduce((acc: number, it: any) => acc + (Number(it.bookValue) || 0), 0)
        const calculatedTotalEstimatedSalePrice =
          Number(item.totalEstimatedSalePrice) ||
          parsedItems.reduce((acc: number, it: any) => acc + (Number(it.estimatedSalePrice) || 0), 0)
        return {
          ...item,
          disposalType: item.disposalType || 'Penghapusan',
          items: parsedItems,
          attachments: JSON.parse(item.attachments || '[]'),
          baDocuments: item.baDocuments ? JSON.parse(item.baDocuments) : null,
          auctionDocuments: item.auctionDocuments ? JSON.parse(item.auctionDocuments) : null,
          financeDocuments: item.financeDocuments ? JSON.parse(item.financeDocuments) : null,
          submitterSignatureUrl: item.applicantSignatureUrl || null,
          totalBookValue: calculatedTotalBookValue,
          totalEstimatedSalePrice: calculatedTotalEstimatedSalePrice,
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
    const isSuperAdmin =
      isSuperAdminRole(empContext?.roleName) || isSuperAdminUser(empContext as any, session?.user)

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

    const parsedItems = JSON.parse(disposal.items || '[]')
    const calculatedTotalBookValue =
      Number(disposal.totalBookValue) ||
      parsedItems.reduce((acc: number, it: any) => acc + (Number(it.bookValue) || 0), 0)
    const calculatedTotalEstimatedSalePrice =
      Number(disposal.totalEstimatedSalePrice) ||
      parsedItems.reduce((acc: number, it: any) => acc + (Number(it.estimatedSalePrice) || 0), 0)

    return {
      success: true,
      data: {
        ...disposal,
        items: parsedItems,
        totalBookValue: calculatedTotalBookValue,
        totalEstimatedSalePrice: calculatedTotalEstimatedSalePrice,
        attachments: JSON.parse(disposal.attachments || '[]'),
        baDocuments: disposal.baDocuments ? JSON.parse(disposal.baDocuments) : null,
        auctionDocuments: disposal.auctionDocuments ? JSON.parse(disposal.auctionDocuments) : null,
        financeDocuments: disposal.financeDocuments ? JSON.parse(disposal.financeDocuments) : null,
        approvalSteps,
        applicantSignatureUrl: disposal.applicantSignatureUrl || null,
        submitterSignatureUrl: disposal.applicantSignatureUrl || null,
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

function isDepartmentDirectToDirector(deptCode?: string | null, deptName?: string | null): boolean {
  const code = (deptCode || '').toUpperCase()
  const name = (deptName || '').toLowerCase()
  return (
    code === 'F-BIMA' ||
    code === 'BIMA' ||
    code === 'HC' ||
    code === 'LEGAL' ||
    code === 'MAN' ||
    name.includes('finance') ||
    name.includes('human capital') ||
    name.includes('legal') ||
    name.includes('director') ||
    name.includes('bi & marketing')
  )
}

/**
 * Dynamic Approval Hierarchy Resolver:
 * Resolves standard organizational chain up to Director, ensuring Amama Ira & Febrian Dani are mandatory sequential finance verifiers.
 * If applicant belongs to direct-to-Director departments (Finance, HC, Legal), General Manager is skipped.
 * Otherwise, General Manager is inserted before Director.
 * If disposalType === 'Penjualan', inserts Procurement (Rajab & Sofyan) between Manager and Finance for price estimation.
 */
export async function getDisposalDefaultApprovers(applicantEmployeeId?: number, disposalType?: string) {
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

    // 2. Fetch Febrian Dani (Finance Business Partners Manager - ID 960)
    const [febrianDani] = await db
      .select({
        id: employees.id,
        name: employees.name,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(or(ilike(employees.name, '%Febrian Dani%'), eq(employees.id, 960)))
      .limit(1)

    // 3. Fetch General Manager (Person Sihaloho - ID 940)
    const [generalManager] = await db
      .select({
        id: employees.id,
        name: employees.name,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(or(ilike(employees.jobTitle, '%General Manager%'), eq(employees.id, 940)))
      .limit(1)

    // 4. Fetch Director (Hidayat Rahman - ID 10)
    const [director] = await db
      .select({
        id: employees.id,
        name: employees.name,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(or(ilike(employees.jobTitle, '%Director%'), eq(employees.id, 10)))
      .limit(1)

    // 5. Fetch Procurement (Abd.Rajab ID 985 / Sofyan Darmawan ID 1143) for sale category
    const [procurement] = await db
      .select({
        id: employees.id,
        name: employees.name,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(or(ilike(employees.name, '%Rajab%'), eq(employees.id, 985), ilike(employees.name, '%Sofyan Darmawan%')))
      .limit(1)

    // 6. Resolve applicant's Section Head and Dept Head
    let isDirectToDirector = false
    let step1Approver: { id: number; name: string; jobTitle: string } | null = null
    let step2Approver: { id: number; name: string; jobTitle: string } | null = null

    if (applicantEmployeeId) {
      const [applicant] = await db
        .select({
          id: employees.id,
          directManagerId: employees.directManagerId,
          sectionId: employees.sectionId,
          departmentId: employees.departmentId,
          deptCode: masterDepartments.code,
          deptName: masterDepartments.name,
        })
        .from(employees)
        .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
        .where(eq(employees.id, applicantEmployeeId))
        .limit(1)

      if (applicant) {
        isDirectToDirector = isDepartmentDirectToDirector(applicant.deptCode, applicant.deptName)

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

    const isSale = disposalType === 'Penjualan'
    const rawSteps: DisposalApproverStep[] = []

    // 1. Step Atasan Langsung / Section Head
    rawSteps.push({
      level: 1,
      title: 'Step 1: Atasan Langsung / Section Head (Mengetahui)',
      approverEmployeeId: step1Approver.id,
      approverName: step1Approver.name,
      jobTitle: step1Approver.jobTitle,
    })

    // 2. Step Department Head (jika ada & bukan orang yang sama dengan Section Head atau Finance Manager Febrian Dani / Amama Ira)
    if (
      step2Approver &&
      step2Approver.id !== step1Approver.id &&
      step2Approver.id !== (febrianDani?.id || 960) &&
      step2Approver.id !== (amamaIra?.id || 1341)
    ) {
      rawSteps.push({
        level: 2,
        title: 'Step 2: Department Head / Manager (Menyetujui)',
        approverEmployeeId: step2Approver.id,
        approverName: step2Approver.name,
        jobTitle: step2Approver.jobTitle,
      })
    }

    // 3. Step Procurement (hanya untuk kategori Penjualan)
    if (isSale) {
      rawSteps.push({
        level: 3,
        title: 'Step 3: Procurement (Input Estimasi Harga Penjualan)',
        approverEmployeeId: procurement?.id || 985,
        approverName: procurement?.name || 'Abd.Rajab',
        jobTitle: procurement?.jobTitle || 'Procurement Coordinator',
      })
    }

    // 4. Step Finance SPV (Amama Ira - Wajib Terpasang)
    rawSteps.push({
      level: 4,
      title: 'Step 4: Verifikasi by Finance & Accounting Supervisor (Amama Ira)',
      approverEmployeeId: amamaIra?.id || 1341,
      approverName: amamaIra?.name || 'Amama Ira Amalia Priyono',
      jobTitle: amamaIra?.jobTitle || 'Finance & Accounting Supervisor',
    })

    // 5. Step Finance Manager (Febrian Dani - Wajib Terpasang)
    rawSteps.push({
      level: 5,
      title: 'Step 5: Verifikasi by Finance Business Partners Manager (Febrian Dani)',
      approverEmployeeId: febrianDani?.id || 960,
      approverName: febrianDani?.name || 'Febrian Dani',
      jobTitle: febrianDani?.jobTitle || 'Finance Business Partners Manager',
    })

    // 6. Step General Manager (Person Sihaloho - hanya jika departemen pemohon di bawah GM)
    if (!isDirectToDirector) {
      rawSteps.push({
        level: 6,
        title: 'Step 6: General Manager (Otorisasi GM)',
        approverEmployeeId: generalManager?.id || 940,
        approverName: generalManager?.name || 'Person Sihaloho',
        jobTitle: generalManager?.jobTitle || 'General Manager',
      })
    }

    // 7. Step Director (Hidayat Rahman, Co-Approval: Freshya Ochtovita - Wajib Terpasang)
    rawSteps.push({
      level: 7,
      title: 'Step 7: Director - Hidayat Rahman (Co-Approve: Freshya Ochtovita)',
      approverEmployeeId: director?.id || 10,
      approverName: director?.name || 'Hidayat Rahman',
      jobTitle: director?.jobTitle || 'Director',
    })

    // Re-index levels 1..N
    const defaultSteps = rawSteps.map((s, idx) => ({
      ...s,
      level: idx + 1,
      title: s.title.replace(/Step \d+:/, `Step ${idx + 1}:`),
    }))

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

    // Query SAP book values for active assets
    const bookValueMap = new Map<string, number>()
    try {
      const assetNumbers = assetList
        .map((a) => a.assetNumber?.trim())
        .filter((no): no is string => Boolean(no))

      if (assetNumbers.length > 0) {
        const sapRes = await onechitaDb.query(
          `SELECT asset_no, SUM(COALESCE(curr_book_value, 0)) AS book_value 
           FROM public.cp_asset_balances 
           WHERE asset_no = ANY($1) 
           GROUP BY asset_no`,
          [assetNumbers]
        )
        for (const row of sapRes.rows) {
          bookValueMap.set(String(row.asset_no).trim(), Number(row.book_value) || 0)
        }
      }
    } catch (sapErr) {
      console.warn('[getDisposalFormData] Could not fetch SAP book values:', sapErr)
    }

    const assetsWithBookValue = assetList.map((a) => ({
      ...a,
      bookValue: a.assetNumber ? (bookValueMap.get(a.assetNumber.trim()) ?? 0) : 0,
    }))

    // 6. Fetch default approvers
    const approversRes = await getDisposalDefaultApprovers(currentEmployee?.id)

    // 7. Fetch active employees for custom approver selection
    const allEmployees = await db
      .select({
        id: employees.id,
        employeeSn: employees.employeeSn,
        name: employees.name,
        jobTitle: employees.jobTitle,
        department: employees.department,
        workLocation: employees.workLocation,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name))

    return {
      success: true,
      currentEmployee,
      sites: siteList,
      departments: deptList,
      sections: secList,
      assets: assetsWithBookValue,
      defaultApprovers: approversRes.approvers || [],
      allEmployees,
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
      const defRes = await getDisposalDefaultApprovers(applicantEmployeeId || undefined, input.disposalType)
      approvalChain = defRes.approvers || []
    }

    // Guardrail for Donasi: Validate mandatory proposal attachment
    if (input.disposalType === 'Donasi') {
      const atts = input.attachments || []
      if (atts.length === 0) {
        return {
          success: false,
          message: 'Validasi Pengajuan Donasi: Berkas Proposal Donasi wajib diunggah sebelum mengirimkan pengajuan.',
        }
      }
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
          'Validasi Alur Approval: Verifikasi by Finance & Accounting Supervisor (Amama Ira) wajib disertakan dalam rantai approval.',
      }
    }

    // Guardrail: Validate that Febrian Dani (ID 960) exists in the chain
    const febrianIndex = approvalChain.findIndex(
      (s) =>
        s.approverEmployeeId === 960 ||
        s.approverName.toLowerCase().includes('febrian dani')
    )

    if (febrianIndex === -1) {
      return {
        success: false,
        message:
          'Validasi Alur Approval: Verifikasi by Finance Business Partners Manager (Febrian Dani) wajib disertakan dalam rantai approval.',
      }
    }

    // Guardrail: Amama Ira must be BEFORE Febrian Dani
    if (amamaIndex > febrianIndex) {
      return {
        success: false,
        message:
          'Validasi Alur Approval: Verifikasi Finance SPV (Amama Ira) wajib diposisikan SEBELUM Finance Manager (Febrian Dani).',
      }
    }

    // Guardrail: Validate that Director (ID 10) exists in the chain
    const directorIndex = approvalChain.findIndex(
      (s) =>
        s.approverEmployeeId === 10 ||
        (s.jobTitle && s.jobTitle.toLowerCase().includes('director')) ||
        (s.title && s.title.toLowerCase().includes('director'))
    )

    if (directorIndex === -1) {
      return {
        success: false,
        message:
          'Validasi Alur Approval: Persetujuan Final Direktur (Hidayat Rahman) wajib disertakan dalam rantai approval.',
      }
    }

    // Guardrail for Penjualan: Validate that Procurement (Rajab / Sofyan) occurs BEFORE Amama Ira
    if (input.disposalType === 'Penjualan') {
      const procIndex = approvalChain.findIndex(
        (s) =>
          s.approverEmployeeId === 985 ||
          s.approverEmployeeId === 1143 ||
          s.approverName.toLowerCase().includes('rajab') ||
          s.approverName.toLowerCase().includes('sofyan') ||
          s.title.toLowerCase().includes('procurement')
      )
      if (procIndex === -1) {
        return {
          success: false,
          message:
            'Validasi Alur Approval: Step peninjauan Procurement (Rajab & Sofyan) wajib disertakan untuk kategori Penjualan.',
        }
      }
      if (procIndex > amamaIndex) {
        return {
          success: false,
          message:
            'Validasi Alur Approval: Step Procurement (Input Estimasi Harga) wajib diposisikan SEBELUM Verifikasi Finance (Amama Ira).',
        }
      }
    }

    // Guardrail: GM ordering if present
    const gmIndex = approvalChain.findIndex(
      (s) =>
        s.approverEmployeeId === 940 ||
        (s.jobTitle && s.jobTitle.toLowerCase().includes('general manager'))
    )
    if (gmIndex !== -1) {
      if (febrianIndex > gmIndex) {
        return {
          success: false,
          message:
            'Validasi Alur Approval: Verifikasi Finance Business Partners Manager (Febrian Dani) wajib diposisikan SEBELUM General Manager.',
        }
      }
      if (gmIndex > directorIndex) {
        return {
          success: false,
          message:
            'Validasi Alur Approval: General Manager wajib diposisikan SEBELUM Direktur.',
        }
      }
    } else {
      if (febrianIndex > directorIndex) {
        return {
          success: false,
          message:
            'Validasi Alur Approval: Verifikasi Finance Business Partners Manager (Febrian Dani) wajib diposisikan SEBELUM Direktur.',
        }
      }
    }

    const firstApprover = approvalChain[0]
    const resolvedFirstApprover = await resolveAssetTestingApprover({
      approverEmployeeId: firstApprover.approverEmployeeId,
      approverName: firstApprover.approverName,
      approverJobTitle: firstApprover.jobTitle,
    })

    // 4. Resolve multi-item summary fields
    const items = input.items && input.items.length > 0 ? input.items : []
    const totalBookValue = items.reduce(
      (acc, it) => acc + (Number(it.bookValue) || 0),
      0
    )
    const totalEstimatedSalePrice = items.reduce(
      (acc, it) => acc + (Number(it.estimatedSalePrice) || 0),
      0
    )
    const firstItem = items[0]
    const topAssetName = firstItem
      ? items.length > 1
        ? `${firstItem.assetName} (+${items.length - 1} aset lainnya)`
        : firstItem.assetName
      : input.assetName || 'Disposal Aset'
    const topAssetNumber =
      items.map((i) => i.assetNumber).filter(Boolean).join(', ') || input.assetNumber || null
    const topPurchaseYear = firstItem?.purchaseYear || input.purchaseYear || null
    const topNotes =
      input.notes || items.map((i) => `${i.assetName}: ${i.notes}`).join('; ')

    // 5. Insert into hero_asset_disposals
    const [newDisposal] = await db
      .insert(assetDisposals)
      .values({
        disposalNumber,
        assetId: firstItem?.assetId || input.assetId || null,
        assetName: topAssetName,
        assetNumber: topAssetNumber,
        purchaseYear: topPurchaseYear,
        departmentId: input.departmentId || null,
        departmentName: input.departmentName,
        sectionId: input.sectionId || null,
        sectionName: input.sectionName || null,
        siteId: input.siteId,
        siteName: input.siteName,
        disposalDate: input.disposalDate,
        disposalType: input.disposalType || 'Penghapusan',
        notes: topNotes,
        items: JSON.stringify(items),
        totalBookValue,
        totalEstimatedSalePrice,
        attachments: JSON.stringify(input.attachments || []),
        applicantEmployeeId,
        applicantName,
        applicantJobTitle,
        applicantSignatureUrl: input.applicantSignatureUrl || null,
        createdById: session.user.id,
        status: 'pending',
        currentStepOrder: 1,
        totalSteps: approvalChain.length,
        currentApproverEmployeeId: resolvedFirstApprover.approverEmployeeId,
        currentApproverName: resolvedFirstApprover.approverName,
        submittedAt: now,
      })
      .returning()

    // 5. Insert steps into hero_approvals for central inbox integration
    for (let i = 0; i < approvalChain.length; i++) {
      const step = approvalChain[i]
      const resolvedStep = await resolveAssetTestingApprover({
        approverEmployeeId: step.approverEmployeeId,
        approverName: step.approverName,
        approverJobTitle: step.jobTitle,
      })

      await db.insert(approvals).values({
        assetDisposalId: newDisposal.id,
        level: i + 1,
        approverName: resolvedStep.approverName || step.approverName,
        approverEmployeeId: resolvedStep.approverEmployeeId,
        status: i === 0 ? 'Pending' : 'Draft',
        submittedAt: now,
        activityType: 'asset_disposal',
        requestNumber: disposalNumber,
        activityTitle: `Disposal Aset (${input.disposalType || 'Penghapusan'}): ${input.assetName} (${input.assetNumber || '-'})`,
        formName: 'Asset Disposal',
        decisionNote: step.title,
        approverRole: resolvedStep.approverJobTitle || step.jobTitle || undefined,
        resolutionSource: 'matrix',
      })
    }

    // 6. Notify first approver via Email & In-App Notification (routed via Testing Guardrail)
    if (firstApprover.approverEmployeeId) {
      try {
        const [firstEmp] = await db
          .select({ email: employees.email, name: employees.name, jobTitle: employees.jobTitle })
          .from(employees)
          .where(eq(employees.id, firstApprover.approverEmployeeId))
          .limit(1)

        if (firstEmp?.email) {
          await sendAssetDisposalSubmittedEmail({
            approverEmail: firstEmp.email,
            approverName: resolvedFirstApprover.approverName || firstEmp.name,
            approverJobTitle: resolvedFirstApprover.approverJobTitle || firstEmp.jobTitle,
            applicantName,
            disposalNumber,
            assetName: topAssetName,
            assetNumber: topAssetNumber,
            siteName: input.siteName,
            departmentName: input.departmentName,
            notes: topNotes,
            disposalId: newDisposal.id,
            stepOrder: 1,
            totalSteps: approvalChain.length,
          }).catch((err) => console.error('[createAssetDisposal] Email notify error:', err))
        }
      } catch (notifyErr) {
        console.warn('[createAssetDisposal] Failed to send initial approver email:', notifyErr)
      }
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
export async function approveAssetDisposal(
  id: number,
  decisionNote: string,
  signatureUrl?: string,
  itemEstimates?: Array<{ assetId?: number; assetNumber?: string; estimatedSalePrice: number }>
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    if (!decisionNote || !decisionNote.trim()) {
      return { success: false, message: 'Catatan persetujuan wajib diisi.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin =
      isSuperAdminRole(empContext?.roleName) || isSuperAdminUser(empContext as any, session?.user)

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

    const isTestingApprover = await isAssetTestingApprover(empContext?.employeeId)

    // Check if step is Director (Hidayat Rahman - ID 10) or Febrian Dani (ID 960)
    const isDirectorStep =
      currentStep.approverEmployeeId === 10 ||
      Boolean(currentStep.approverRole && currentStep.approverRole.toLowerCase().includes('director')) ||
      Boolean(currentStep.decisionNote && currentStep.decisionNote.toLowerCase().includes('director')) ||
      Boolean(currentStep.approverName && currentStep.approverName.toLowerCase().includes('hidayat rahman'))

    const isFreshya =
      empContext?.employeeId === 974 ||
      Boolean(session.user.email && session.user.email.toLowerCase().includes('freshya'))

    const isFebrianStep =
      currentStep.approverEmployeeId === 960 ||
      Boolean(currentStep.approverName && currentStep.approverName.toLowerCase().includes('febrian dani'))

    const isFebrianUser =
      empContext?.employeeId === 960 ||
      Boolean(session.user.email && session.user.email.toLowerCase().includes('febrian'))

    // Permission check
    const isAuthorized =
      isSuperAdmin ||
      (empContext?.employeeId && currentStep.approverEmployeeId === empContext.employeeId) ||
      (isDirectorStep && isFreshya) ||
      (isFebrianStep && isFebrianUser) ||
      isTestingApprover
    if (!isAuthorized) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak otorisasi untuk menyetujui tahap ini.',
      }
    }

    const now = new Date()

    // 0. Update item estimates if submitted by Procurement
    if (itemEstimates && itemEstimates.length > 0) {
      try {
        const rawItems = JSON.parse(disposal.items || '[]')
        const updatedItems = rawItems.map((it: any) => {
          const match = itemEstimates.find(
            (e) => (e.assetNumber && e.assetNumber === it.assetNumber) || (e.assetId && e.assetId === it.assetId)
          )
          return match ? { ...it, estimatedSalePrice: Number(match.estimatedSalePrice) || 0 } : it
        })
        const newTotalEst = updatedItems.reduce(
          (acc: number, it: any) => acc + (Number(it.estimatedSalePrice) || 0),
          0
        )
        await db
          .update(assetDisposals)
          .set({
            items: JSON.stringify(updatedItems),
            totalEstimatedSalePrice: newTotalEst,
            updatedAt: now,
          })
          .where(eq(assetDisposals.id, id))
      } catch (err) {
        console.warn('[approveAssetDisposal] Failed to parse and update item estimates:', err)
      }
    }

    // 1. Mark current step as Approved
    const finalDecisionNote =
      isDirectorStep && isFreshya
        ? `${decisionNote.trim()} (Disetujui oleh Freshya Ochtovita - Board Secretary a.n. Director)`
        : decisionNote.trim()

    await db
      .update(approvals)
      .set({
        status: 'Approved',
        decisionNote: finalDecisionNote,
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

      // Notify next approver via Email & In-App Notification (routed via Testing Guardrail)
      if (nextStep.approverEmployeeId) {
        try {
          const [nextEmp] = await db
            .select({ email: employees.email, name: employees.name, jobTitle: employees.jobTitle })
            .from(employees)
            .where(eq(employees.id, nextStep.approverEmployeeId))
            .limit(1)

          if (nextEmp?.email) {
            const isNextDirectorStep =
              nextStep.approverEmployeeId === 10 ||
              Boolean(nextStep.approverRole && nextStep.approverRole.toLowerCase().includes('director')) ||
              Boolean(nextStep.decisionNote && nextStep.decisionNote.toLowerCase().includes('director')) ||
              Boolean(nextStep.approverName && nextStep.approverName.toLowerCase().includes('hidayat rahman'))

            const ccEmails = isNextDirectorStep ? ['freshya.ochtovita@chitraparatama.co.id'] : undefined

            await sendAssetDisposalSubmittedEmail({
              approverEmail: nextEmp.email,
              approverName: nextStep.approverName || nextEmp.name,
              approverJobTitle: nextStep.approverRole || nextEmp.jobTitle,
              applicantName: disposal.applicantName,
              disposalNumber: disposal.disposalNumber,
              assetName: disposal.assetName,
              assetNumber: disposal.assetNumber,
              siteName: disposal.siteName,
              departmentName: disposal.departmentName,
              notes: disposal.notes,
              disposalId: disposal.id,
              stepOrder: nextStep.level || disposal.currentStepOrder + 1,
              totalSteps: disposal.totalSteps,
              ccEmails,
            }).catch((err) => console.error('[approveAssetDisposal] Next step email notify error:', err))
          }
        } catch (notifyErr) {
          console.warn('[approveAssetDisposal] Failed to send next step email:', notifyErr)
        }
      }

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
          items: JSON.parse(disposal.items || '[]'),
          attachments,
          submittedAt: disposal.submittedAt,
          approvedAt: now,
          approvals: pdfApprovers,
        } as any)

        pdfUrl = await saveGeneratedPdfUpload(pdfBytes, 'asset-disposal', disposal.disposalNumber)
      } catch (pdfErr) {
        console.error('[approveAssetDisposal] PDF generation error:', pdfErr)
      }

      const isSale = disposal.disposalType === 'Penjualan'
      const isDeletionOrDonation = disposal.disposalType === 'Penghapusan' || disposal.disposalType === 'Donasi'

      let nextStatus = 'approved'
      if (isSale) {
        nextStatus = 'waiting_auction_docs'
      } else if (isDeletionOrDonation) {
        nextStatus = 'waiting_ba_disposal'
      }

      await db
        .update(assetDisposals)
        .set({
          status: nextStatus,
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

      if (isSale) {
        // Penjualan: Notify Procurement to submit auction documents
        await sendAssetDisposalAuctionReadyEmail({
          procurementEmails: ['abdul.rajab@chitraparatama.co.id', 'sofyan.darmawan@chitraparatama.co.id'],
          disposalNumber: disposal.disposalNumber,
          assetName: disposal.assetName,
          disposalId: disposal.id,
        }).catch((err) => console.error('[approveAssetDisposal] Auction ready notify error:', err))

        revalidatePath('/dashboard/assets/disposal')
        revalidatePath('/dashboard/approval')
        revalidatePath('/dashboard/central-service/assets')

        return {
          success: true,
          message: `Permohonan ${disposal.disposalNumber} telah disetujui Direktur. Proses berlanjut ke Tim Procurement untuk unggah lampiran hasil lelang.`,
        }
      } else if (isDeletionOrDonation) {
        // Penghapusan & Donasi: Notify Applicant to submit Berita Acara
        const baLabel = disposal.disposalType === 'Donasi' ? 'Berita Acara Donasi' : 'Berita Acara Aset Disposal'

        if (applicant?.email) {
          await sendAssetDisposalBaReadyEmail({
            applicantEmail: applicant.email,
            applicantName: applicant.name || disposal.applicantName,
            disposalNumber: disposal.disposalNumber,
            assetName: disposal.assetName,
            disposalId: disposal.id,
            disposalType: disposal.disposalType,
          }).catch((err) => console.error('[approveAssetDisposal] BA ready notify error:', err))
        }

        revalidatePath('/dashboard/assets/disposal')
        revalidatePath('/dashboard/approval')
        revalidatePath('/dashboard/central-service/assets')

        return {
          success: true,
          message: `Permohonan ${disposal.disposalNumber} telah disetujui Direktur. Proses berlanjut ke Pengaju untuk mengunggah ${baLabel}.`,
        }
      }

      // Fallback: Notify Applicant of full approval
      if (applicant?.email) {
        await sendAssetDisposalApprovedEmail({
          applicantEmail: applicant.email,
          applicantName: applicant.name || disposal.applicantName,
          disposalNumber: disposal.disposalNumber,
          assetName: disposal.assetName,
          assetNumber: disposal.assetNumber,
          disposalId: disposal.id,
          pdfUrl,
        }).catch((err) => console.error('[approveAssetDisposal] Final approved email notify error:', err))
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
 * Post-Approval Step 1 (Penghapusan & Donasi): Applicant submits Berita Acara (BA)
 */
export async function submitDisposalBaDocumentsAction(params: {
  disposalId: number
  checklist: string[]
  files: Array<{ fileName: string; fileUrl: string; fileSize?: number }>
  notes?: string
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    if (!params.checklist || params.checklist.length === 0) {
      return { success: false, message: 'Pilih minimal 1 jenis dokumen Berita Acara yang disertakan.' }
    }

    if (!params.files || params.files.length === 0) {
      return { success: false, message: 'Wajib mengunggah minimal 1 berkas scan/foto Berita Acara yang telah ditandatangani.' }
    }

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, params.disposalId))
      .limit(1)

    if (!disposal) {
      return { success: false, message: 'Permohonan disposal tidak ditemukan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const now = new Date()

    const baPayload = JSON.stringify({
      checklist: params.checklist,
      files: params.files,
      notes: params.notes || '',
    })

    await db
      .update(assetDisposals)
      .set({
        status: 'waiting_finance_docs',
        baDocuments: baPayload,
        baSubmittedAt: now,
        baSubmittedById: empContext?.employeeId || null,
        updatedAt: now,
      })
      .where(eq(assetDisposals.id, params.disposalId))

    // Notify Finance (Syamsul & Evo) to submit SAP disposal documents
    await sendAssetDisposalBaSubmittedEmail({
      financeEmails: ['syamsul.bahri@chitraparatama.co.id', 'evo.yulianti@chitraparatama.co.id'],
      disposalNumber: disposal.disposalNumber,
      assetName: disposal.assetName,
      disposalId: disposal.id,
      disposalType: disposal.disposalType,
    }).catch((err) => console.error('[submitDisposalBaDocumentsAction] Finance notify error:', err))

    revalidatePath('/dashboard/assets/disposal')

    const baLabel = disposal.disposalType === 'Donasi' ? 'Berita Acara Donasi' : 'Berita Acara Aset Disposal'

    return {
      success: true,
      message: `${baLabel} untuk ${disposal.disposalNumber} berhasil disubmit. Alur berlanjut ke Tim Finance & Accounting untuk Dokumen Disposal SAP.`,
    }
  } catch (error: any) {
    console.error('[submitDisposalBaDocumentsAction] Error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal menyimpan Berita Acara.',
    }
  }
}

/**
 * Post-Approval Step 1: Procurement submits Auction Documents
 */
export async function submitDisposalAuctionDocumentsAction(params: {
  disposalId: number
  checklist: string[]
  files: Array<{ fileName: string; fileUrl: string; fileSize?: number }>
  notes?: string
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    if (!params.checklist || params.checklist.length === 0) {
      return { success: false, message: 'Pilih minimal 1 jenis lampiran lelang yang disertakan.' }
    }

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, params.disposalId))
      .limit(1)

    if (!disposal) {
      return { success: false, message: 'Permohonan disposal tidak ditemukan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const now = new Date()

    const auctionPayload = JSON.stringify({
      checklist: params.checklist,
      files: params.files,
      notes: params.notes || '',
    })

    await db
      .update(assetDisposals)
      .set({
        status: 'waiting_finance_docs',
        auctionDocuments: auctionPayload,
        auctionSubmittedAt: now,
        auctionSubmittedById: empContext?.employeeId || null,
        updatedAt: now,
      })
      .where(eq(assetDisposals.id, params.disposalId))

    // Notify Finance (Syamsul & Evo) to submit finance documents
    await sendAssetDisposalFinanceReadyEmail({
      financeEmails: ['syamsul.bahri@chitraparatama.co.id', 'evo.yulianti@chitraparatama.co.id'],
      disposalNumber: disposal.disposalNumber,
      assetName: disposal.assetName,
      disposalId: disposal.id,
    }).catch((err) => console.error('[submitDisposalAuctionDocumentsAction] Finance notify error:', err))

    revalidatePath('/dashboard/assets/disposal')

    return {
      success: true,
      message: `Lampiran hasil lelang untuk ${disposal.disposalNumber} berhasil disubmit. Alur berlanjut ke Tim Finance & Accounting.`,
    }
  } catch (error: any) {
    console.error('[submitDisposalAuctionDocumentsAction] Error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal menyimpan lampiran lelang.',
    }
  }
}

/**
 * Post-Approval Step 2: Finance submits Finance Documents & Completes Process
 */
export async function submitDisposalFinanceDocumentsAction(params: {
  disposalId: number
  checklist: string[]
  files: Array<{ fileName: string; fileUrl: string; fileSize?: number }>
  notes?: string
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    if (!params.checklist || params.checklist.length === 0) {
      return { success: false, message: 'Pilih minimal 1 jenis dokumen keuangan yang disertakan.' }
    }

    if (!params.files || params.files.length === 0) {
      return { success: false, message: 'Wajib mengunggah minimal 1 berkas Dokumen Disposal SAP.' }
    }

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, params.disposalId))
      .limit(1)

    if (!disposal) {
      return { success: false, message: 'Permohonan disposal tidak ditemukan.' }
    }

    const [applicant] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(eq(employees.id, disposal.applicantEmployeeId || 0))
      .limit(1)

    const empContext = await getCurrentEmployeeAccessContext()
    const now = new Date()

    const financePayload = JSON.stringify({
      checklist: params.checklist,
      files: params.files,
      notes: params.notes || '',
    })

    await db
      .update(assetDisposals)
      .set({
        status: 'completed',
        financeDocuments: financePayload,
        financeSubmittedAt: now,
        financeSubmittedById: empContext?.employeeId || null,
        updatedAt: now,
      })
      .where(eq(assetDisposals.id, params.disposalId))

    // Send final completion email to Applicant (CC conditional based on disposalType)
    const isSale = disposal.disposalType === 'Penjualan'
    await sendAssetDisposalCompletedEmail({
      applicantEmail: applicant?.email || 'applicant@chitraparatama.co.id',
      applicantName: applicant?.name || disposal.applicantName,
      procurementEmails: isSale ? ['abdul.rajab@chitraparatama.co.id', 'sofyan.darmawan@chitraparatama.co.id'] : undefined,
      financeEmails: ['syamsul.bahri@chitraparatama.co.id', 'evo.yulianti@chitraparatama.co.id'],
      disposalNumber: disposal.disposalNumber,
      assetName: disposal.assetName,
      disposalId: disposal.id,
      disposalType: disposal.disposalType,
    }).catch((err) => console.error('[submitDisposalFinanceDocumentsAction] Completed notify error:', err))

    revalidatePath('/dashboard/assets/disposal')

    const successMessage = isSale
      ? `Dokumen Finance untuk ${disposal.disposalNumber} berhasil disubmit. Seluruh proses disposal & lelang telah selesai (Completed).`
      : `Dokumen Disposal SAP untuk ${disposal.disposalNumber} berhasil disubmit. Seluruh proses disposal telah selesai (Completed).`

    return {
      success: true,
      message: successMessage,
    }
  } catch (error: any) {
    console.error('[submitDisposalFinanceDocumentsAction] Error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal menyimpan dokumen Finance.',
    }
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
    const isSuperAdmin =
      isSuperAdminRole(empContext?.roleName) || isSuperAdminUser(empContext as any, session?.user)

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
    const isDirectorStep =
      currentStep?.approverEmployeeId === 10 ||
      Boolean(currentStep?.approverRole && currentStep.approverRole.toLowerCase().includes('director')) ||
      Boolean(currentStep?.decisionNote && currentStep.decisionNote.toLowerCase().includes('director')) ||
      Boolean(currentStep?.approverName && currentStep.approverName.toLowerCase().includes('hidayat rahman'))

    const isFreshya =
      empContext?.employeeId === 974 ||
      Boolean(session.user.email && session.user.email.toLowerCase().includes('freshya'))

    const isAuthorized =
      isSuperAdmin ||
      (empContext?.employeeId && currentStep?.approverEmployeeId === empContext.employeeId) ||
      (isDirectorStep && isFreshya)
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
    const isSuperAdmin =
      isSuperAdminRole(empContext?.roleName) || isSuperAdminUser(empContext as any, session?.user)

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

    if (disposal.status === 'approved') {
      return { success: false, message: 'Permohonan yang sudah disetujui penuh tidak dapat dibatalkan/dihapus.' }
    }

    // Auto-hapus data approval dan permohonan disposal dari database
    await db.transaction(async (tx) => {
      await tx.delete(approvals).where(eq(approvals.assetDisposalId, id))
      await tx.delete(assetDisposals).where(eq(assetDisposals.id, id))
    })

    revalidatePath('/dashboard/assets/disposal')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Permohonan ${disposal.disposalNumber} berhasil dibatalkan dan dihapus.`,
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
    const isSuperAdmin =
      isSuperAdminRole(empContext?.roleName) || isSuperAdminUser(empContext as any, session?.user)
    const isTestingApprover = await isAssetTestingApprover(empContext?.employeeId)
    const isDirectorStep =
      disposal.currentApproverEmployeeId === 10 ||
      Boolean(disposal.currentApproverName && disposal.currentApproverName.toLowerCase().includes('hidayat rahman')) ||
      Boolean(disposal.currentApproverName && disposal.currentApproverName.toLowerCase().includes('director'))

    const isFreshya =
      empContext?.employeeId === 974 ||
      Boolean(session.user.email && session.user.email.toLowerCase().includes('freshya'))

    const isCurrentApprover = Boolean(
      empContext?.employeeId && disposal.currentApproverEmployeeId === empContext.employeeId
    )

    if (!isSuperAdmin && !isCurrentApprover && !isTestingApprover && !(isDirectorStep && isFreshya)) {
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
  disposalType?: 'Penjualan' | 'Penghapusan' | 'Donasi'
  items?: any[]
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
    const isSuperAdmin =
      isSuperAdminRole(empContext?.roleName) || isSuperAdminUser(empContext as any, session?.user)
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

    const items = input.items && input.items.length > 0 ? input.items : undefined
    const totalBookValue = items
      ? items.reduce((acc: number, it: any) => acc + (Number(it.bookValue) || 0), 0)
      : disposal.totalBookValue
    let topAssetName = disposal.assetName
    let topAssetNumber = disposal.assetNumber
    let topPurchaseYear = disposal.purchaseYear
    if (items) {
      const firstItem = items[0]
      topAssetName = firstItem
        ? items.length > 1
          ? `${firstItem.assetName} (+${items.length - 1} aset lainnya)`
          : firstItem.assetName
        : disposal.assetName
      topAssetNumber = items.map((i: any) => i.assetNumber).filter(Boolean).join(', ') || null
      topPurchaseYear = firstItem?.purchaseYear || null
    }

    await db.transaction(async (tx) => {
      await tx
        .update(assetDisposals)
        .set({
          assetName: topAssetName,
          assetNumber: topAssetNumber,
          purchaseYear: topPurchaseYear,
          items: items ? JSON.stringify(items) : disposal.items,
          totalBookValue,
          disposalType: input.disposalType !== undefined ? input.disposalType : disposal.disposalType,
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
