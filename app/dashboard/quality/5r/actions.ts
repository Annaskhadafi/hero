'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  approvals,
  employees,
  fiveRApprovalLogs,
  fiveRFindings,
  fiveRMasterAreaPicHistory,
  fiveRMasterAreas,
  fiveRReports,
  notificationDeliveries,
  notificationEvents,
  sites,
} from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import {
  initializeFiveRApprovals,
  resolveFiveRApprovalRoute,
  resolveMasterAreaEffectivePic,
  sendFiveREmailNotification,
  syncInFlightFiveRApprovalsForMasterArea,
} from '@/lib/five-r-approval'
import { getAppUrl } from '@/lib/workflow-email'

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {}
}

// Schema Validasi Master Area
const masterAreaSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, 'Nama area wajib diisi'),
  areaScale: z.enum(['small', 'medium', 'large']).default('medium'),
  siteId: z.coerce.number().int().positive('Site wajib dipilih'),
  picEmployeeId: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().trim().default(''),
  isActive: z.boolean().default(true),
})

// Schema Validasi Finding Row
const findingRowSchema = z.object({
  category5r: z.enum(['Rapi', 'Ringkas', 'Resik', 'Rawat', 'Rajin']).default('Rapi'),
  area: z.string().trim().min(1, 'Area wajib diisi'),
  findingDescription: z.string().trim().optional().default(''),
  findingPhotoUrl: z.string().trim().optional().default(''),
  actionDescription: z.string().trim().optional().default(''),
  actionPhotoUrl: z.string().trim().optional().default(''),
  noFindingPhotoUrl: z.string().trim().optional().default(''),
})

// Schema Validasi Laporan 5R
const createFiveRReportSchema = z.object({
  masterAreaId: z.coerce.number().int().positive().nullable().optional(),
  picAreaName: z.string().trim().min(1, 'PIC - Area 5R wajib diisi'),
  siteId: z.coerce.number().int().positive().nullable().optional(),
  auditorId: z.coerce.number().int().positive().nullable().optional(),
  auditorName: z.string().trim().min(1, 'Nama Auditor wajib diisi'),
  auditorEmail: z.string().trim().email('Email auditor tidak valid').optional().default(''),
  auditPeriod: z.string().trim().min(1, 'Periode Audit wajib dipilih'),
  auditDate: z.string().trim().min(1, 'Tanggal audit wajib diisi'),
  reportType: z.enum(['ada_temuan', 'after_temuan_sebelumnya', 'tidak_ada_temuan']),
  previousReportId: z.coerce.number().int().positive().nullable().optional(),
  scoreRapi: z.coerce.number().int().min(20).max(100).default(100),
  scoreRingkas: z.coerce.number().int().min(20).max(100).default(100),
  scoreResik: z.coerce.number().int().min(20).max(100).default(100),
  scoreRawat: z.coerce.number().int().min(20).max(100).default(100),
  scoreRajin: z.coerce.number().int().min(20).max(100).default(100),
  auditorSignatureUrl: z.string().trim().optional(),
  findings: z.array(findingRowSchema).default([]),
})

/**
 * Buat Laporan 5R Baru
 */
export async function createFiveRReportAction(payload: z.infer<typeof createFiveRReportSchema>) {
  try {
    let session = null
    try {
      session = await getServerSession()
    } catch {}
    const parsed = createFiveRReportSchema.safeParse(payload)

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Validasi gagal.',
      }
    }

    const data = parsed.data

    // Hitung rata-rata skor 5 pilar (0 - 100)
    const avgScore = (
      (data.scoreRapi + data.scoreRingkas + data.scoreResik + data.scoreRawat + data.scoreRajin) /
      5
    ).toFixed(2)

    // Generate Nomor Laporan: 5R-YYYYMM-XXXX
    const dateObj = new Date(data.auditDate)
    const yearMonth = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}`

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(fiveRReports)
      .where(sql`to_char(${fiveRReports.createdAt}, 'YYYYMM') = ${yearMonth}`)

    const seq = (countResult[0]?.count ?? 0) + 1
    const reportNumber = `5R-${yearMonth}-${String(seq).padStart(4, '0')}`

    // Insert Header Laporan
    const [newReport] = await db
      .insert(fiveRReports)
      .values({
        reportNumber,
        masterAreaId: data.masterAreaId ?? null,
        picAreaName: data.picAreaName,
        siteId: data.siteId ?? null,
        auditorId: data.auditorId ?? null,
        auditorName: data.auditorName,
        auditorEmail: data.auditorEmail || (session?.user?.email ?? ''),
        auditPeriod: data.auditPeriod,
        auditDate: data.auditDate,
        reportType: data.reportType,
        previousReportId: data.previousReportId ?? null,
        scoreRapi: data.scoreRapi,
        scoreRingkas: data.scoreRingkas,
        scoreResik: data.scoreResik,
        scoreRawat: data.scoreRawat,
        scoreRajin: data.scoreRajin,
        totalScore: avgScore,
        auditorSignatureUrl: data.auditorSignatureUrl || null,
        status: 'pending_approval',
        currentApprovalLevel: 1, // Step 1: Ria Annisa Putri
      })
      .returning()

    // Insert Findings Rows jika ada
    if (data.findings.length > 0) {
      const findingInserts = data.findings.map((f, idx) => ({
        reportId: newReport.id,
        rowOrder: idx + 1,
        category5r: f.category5r,
        area: f.area,
        findingDescription: f.findingDescription || '',
        findingPhotoUrl: f.findingPhotoUrl || '',
        actionDescription: f.actionDescription || '',
        actionPhotoUrl: f.actionPhotoUrl || '',
        noFindingPhotoUrl: f.noFindingPhotoUrl || '',
        isResolved: data.reportType === 'after_temuan_sebelumnya' || data.reportType === 'tidak_ada_temuan',
      }))

      await db.insert(fiveRFindings).values(findingInserts)
    }

    // Initialize central hero_approvals rows and dispatch Level 1 notification
    await initializeFiveRApprovals(newReport)

    safeRevalidatePath('/dashboard/quality/5r')
    safeRevalidatePath('/dashboard/quality/5r/create')
    safeRevalidatePath('/mobile/quality/5r')
    safeRevalidatePath('/mobile/quality/5r/create')
    safeRevalidatePath('/dashboard/approval')

    const step1 = (await resolveFiveRApprovalRoute({ auditorId: data.auditorId, siteId: data.siteId, areaId: data.masterAreaId })).steps[0]

    return {
      success: true,
      message: `Laporan 5R ${reportNumber} berhasil diajukan dan dikirim ke ${step1?.approverName ?? 'Verifikator'}.`,
      reportId: newReport.id,
      reportNumber,
    }
  } catch (error: any) {
    console.error('[5R] Create report error:', error)
    return {
      success: false,
      message: error?.message ?? 'Terjadi kesalahan saat menyimpan laporan 5R.',
    }
  }
}

/**
 * Get Daftar Laporan 5R
 */
export async function getFiveRReportsAction(params: {
  period?: string
  reportType?: string
  status?: string
  siteId?: number
  search?: string
  page?: number
  pageSize?: number
}) {
  try {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20))
    const offset = (page - 1) * pageSize

    const conditions = []

    if (params.period && params.period !== 'all') {
      conditions.push(eq(fiveRReports.auditPeriod, params.period))
    }
    if (params.reportType && params.reportType !== 'all') {
      conditions.push(eq(fiveRReports.reportType, params.reportType))
    }
    if (params.status && params.status !== 'all') {
      conditions.push(eq(fiveRReports.status, params.status))
    }
    if (params.siteId) {
      conditions.push(eq(fiveRReports.siteId, params.siteId))
    }
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`
      conditions.push(
        or(
          ilike(fiveRReports.reportNumber, q),
          ilike(fiveRReports.picAreaName, q),
          ilike(fiveRReports.auditorName, q)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(fiveRReports)
      .where(whereClause)

    const total = countRow?.count ?? 0

    const rows = await db
      .select({
        id: fiveRReports.id,
        reportNumber: fiveRReports.reportNumber,
        masterAreaId: fiveRReports.masterAreaId,
        picAreaName: fiveRReports.picAreaName,
        siteId: fiveRReports.siteId,
        siteName: sites.name,
        auditorId: fiveRReports.auditorId,
        auditorName: fiveRReports.auditorName,
        auditorEmail: fiveRReports.auditorEmail,
        auditPeriod: fiveRReports.auditPeriod,
        auditDate: fiveRReports.auditDate,
        reportType: fiveRReports.reportType,
        scoreRapi: fiveRReports.scoreRapi,
        scoreRingkas: fiveRReports.scoreRingkas,
        scoreResik: fiveRReports.scoreResik,
        scoreRawat: fiveRReports.scoreRawat,
        scoreRajin: fiveRReports.scoreRajin,
        totalScore: fiveRReports.totalScore,
        status: fiveRReports.status,
        currentApprovalLevel: fiveRReports.currentApprovalLevel,
        createdAt: fiveRReports.createdAt,
      })
      .from(fiveRReports)
      .leftJoin(sites, eq(fiveRReports.siteId, sites.id))
      .where(whereClause)
      .orderBy(desc(fiveRReports.createdAt))
      .limit(pageSize)
      .offset(offset)

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error: any) {
    console.error('[5R] Get reports error:', error)
    return {
      success: false,
      data: [],
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      message: error?.message ?? 'Gagal memuat daftar laporan 5R.',
    }
  }
}

/**
 * Get Detail Laporan 5R Lengkap (Mendukung ID maupun Nomor Laporan)
 */
export async function getFiveRReportDetailAction(reportIdentifier: number | string) {
  try {
    const isNum = typeof reportIdentifier === 'number' || (!isNaN(Number(reportIdentifier)) && Number(reportIdentifier) > 0 && !String(reportIdentifier).startsWith('5R-'))
    const condition = isNum
      ? eq(fiveRReports.id, Number(reportIdentifier))
      : eq(fiveRReports.reportNumber, String(reportIdentifier))

    const [report] = await db
      .select({
        id: fiveRReports.id,
        reportNumber: fiveRReports.reportNumber,
        masterAreaId: fiveRReports.masterAreaId,
        picAreaName: fiveRReports.picAreaName,
        siteId: fiveRReports.siteId,
        siteName: sites.name,
        auditorId: fiveRReports.auditorId,
        auditorName: fiveRReports.auditorName,
        auditorEmail: fiveRReports.auditorEmail,
        auditPeriod: fiveRReports.auditPeriod,
        auditDate: fiveRReports.auditDate,
        reportType: fiveRReports.reportType,
        previousReportId: fiveRReports.previousReportId,
        scoreRapi: fiveRReports.scoreRapi,
        scoreRingkas: fiveRReports.scoreRingkas,
        scoreResik: fiveRReports.scoreResik,
        scoreRawat: fiveRReports.scoreRawat,
        scoreRajin: fiveRReports.scoreRajin,
        totalScore: fiveRReports.totalScore,
        status: fiveRReports.status,
        currentApprovalLevel: fiveRReports.currentApprovalLevel,
        revertedFromLevel: fiveRReports.revertedFromLevel,
        approvalNotes: fiveRReports.approvalNotes,
        auditorSignatureUrl: fiveRReports.auditorSignatureUrl,
        createdAt: fiveRReports.createdAt,
      })
      .from(fiveRReports)
      .leftJoin(sites, eq(fiveRReports.siteId, sites.id))
      .where(condition)
      .limit(1)

    if (!report) {
      return { success: false, message: 'Laporan 5R tidak ditemukan.' }
    }

    const findings = await db
      .select()
      .from(fiveRFindings)
      .where(eq(fiveRFindings.reportId, report.id))
      .orderBy(fiveRFindings.rowOrder)

    const approvalLogs = await db
      .select()
      .from(fiveRApprovalLogs)
      .where(eq(fiveRApprovalLogs.reportId, report.id))
      .orderBy(fiveRApprovalLogs.actedAt)

    const approvalRows = await db
      .select({
        id: approvals.id,
        level: approvals.level,
        status: approvals.status,
        approverEmployeeId: approvals.approverEmployeeId,
        approverName: approvals.approverName,
        signatureUrl: approvals.signatureUrl,
        decisionNote: approvals.decisionNote,
        reviewedAt: approvals.reviewedAt,
      })
      .from(approvals)
      .where(eq(approvals.fiveRReportId, report.id))
      .orderBy(approvals.level)

    const route = await resolveFiveRApprovalRoute({
      auditorId: report.auditorId,
      siteId: report.siteId,
      areaId: report.masterAreaId,
    })

    const mappedRoute = route.steps.map((step) => {
      const dbAppr = approvalRows.find((a) => a.level === step.level)
      return {
        ...step,
        status: dbAppr?.status || (step.level < report.currentApprovalLevel ? 'approved' : 'waiting'),
        signatureUrl: dbAppr?.signatureUrl || null,
        decisionNote: dbAppr?.decisionNote || null,
        reviewedAt: dbAppr?.reviewedAt || null,
      }
    })

    return {
      success: true,
      report,
      findings,
      approvalLogs,
      approvals: approvalRows,
      approvalRoute: mappedRoute,
    }
  } catch (error: any) {
    console.error('[5R] Get detail error:', error)
    return { success: false, message: error?.message ?? 'Gagal memuat detail laporan 5R.' }
  }
}

/**
 * Ambil Temuan Open Bulan Sebelumnya (Untuk Form Mode After)
 */
export async function getPreviousOpenFindingsAction(params?: {
  siteId?: number
  masterAreaId?: number
}) {
  try {
    const conditions = [
      eq(fiveRReports.reportType, 'ada_temuan'),
      eq(fiveRFindings.isResolved, false),
    ]

    if (params?.siteId) {
      conditions.push(eq(fiveRReports.siteId, params.siteId))
    }
    if (params?.masterAreaId) {
      conditions.push(eq(fiveRReports.masterAreaId, params.masterAreaId))
    }

    const rows = await db
      .select({
        findingId: fiveRFindings.id,
        reportId: fiveRReports.id,
        reportNumber: fiveRReports.reportNumber,
        auditPeriod: fiveRReports.auditPeriod,
        category5r: fiveRFindings.category5r,
        area: fiveRFindings.area,
        findingDescription: fiveRFindings.findingDescription,
        findingPhotoUrl: fiveRFindings.findingPhotoUrl,
        actionDescription: fiveRFindings.actionDescription,
      })
      .from(fiveRFindings)
      .innerJoin(fiveRReports, eq(fiveRFindings.reportId, fiveRReports.id))
      .where(and(...conditions))
      .orderBy(desc(fiveRReports.createdAt))
      .limit(50)

    return { success: true, data: rows }
  } catch (error: any) {
    console.error('[5R] Get open findings error:', error)
    return { success: false, data: [], message: error?.message ?? 'Gagal memuat temuan sebelumnya.' }
  }
}

/**
 * Approve Laporan 5R (3-Step Lifecycle)
 */
export async function approveFiveRReportAction(reportId: number, notes?: string, signatureUrl?: string) {
  try {
    let session = null
    try {
      session = await getServerSession()
    } catch {}
    const [report] = await db
      .select()
      .from(fiveRReports)
      .where(eq(fiveRReports.id, reportId))
      .limit(1)

    if (!report) return { success: false, message: 'Laporan tidak ditemukan.' }

    const route = await resolveFiveRApprovalRoute({
      auditorId: report.auditorId,
      siteId: report.siteId,
      areaId: report.masterAreaId,
    })

    const currentLevel = report.currentApprovalLevel
    const currentStepConfig = route.steps.find((s) => s.level === currentLevel)

    // Catat log approval level saat ini
    await db.insert(fiveRApprovalLogs).values({
      reportId: report.id,
      level: currentLevel,
      roleLabel: currentStepConfig?.roleLabel ?? `Step ${currentLevel}`,
      approverEmployeeId: currentStepConfig?.approverEmployeeId ?? null,
      approverName: session?.user?.name || currentStepConfig?.approverName || 'Approver',
      action: 'approved',
      notes: notes ?? '',
    })

    // Update central hero_approvals table for current step
    await db
      .update(approvals)
      .set({
        status: 'approved',
        signatureUrl: signatureUrl || undefined,
        reviewedAt: new Date(),
        decisionNote: notes ?? '',
      })
      .where(and(eq(approvals.fiveRReportId, reportId), eq(approvals.level, currentLevel)))

    let nextStatus = 'pending_approval'
    let nextLevel = currentLevel + 1

    const maxLevel = route.steps.length > 0 ? route.steps.length : 2

    if (currentLevel >= maxLevel) {
      // Final Step (Bardinia Susi Ekawaty) selesai -> Final Approved
      nextStatus = 'approved'
      nextLevel = maxLevel
    }

    await db
      .update(fiveRReports)
      .set({
        status: nextStatus,
        currentApprovalLevel: nextLevel,
        approvalNotes: notes ?? '',
        updatedAt: new Date(),
      })
      .where(eq(fiveRReports.id, reportId))

    // If advancing to next step, activate that step in approvals
    if (nextStatus === 'pending_approval') {
      await db
        .update(approvals)
        .set({ status: 'pending', submittedAt: new Date() })
        .where(and(eq(approvals.fiveRReportId, reportId), eq(approvals.level, nextLevel)))
    } else if (nextStatus === 'approved') {
      await db
        .update(approvals)
        .set({ status: 'approved', reviewedAt: new Date() })
        .where(and(eq(approvals.fiveRReportId, reportId), eq(approvals.status, 'waiting')))
    }

    // Notifikasi ke approver berikutnya jika masih ada step lanjutan
    if (nextStatus === 'pending_approval') {
      const nextStepConfig = route.steps.find((s) => s.level === nextLevel)
      if (nextStepConfig?.approverEmail) {
        const appUrl = getAppUrl()
        const approvalLink = `${appUrl}/dashboard/approval`

        await sendFiveREmailNotification({
          templateCode: 'five_r_approval_request',
          recipientEmail: nextStepConfig.approverEmail,
          variables: {
            approverName: nextStepConfig.approverName,
            approvalLevel: `Level ${nextLevel}: ${nextStepConfig.roleLabel}`,
            reportNumber: report.reportNumber,
            picAreaName: report.picAreaName,
            auditorName: report.auditorName,
            auditPeriod: report.auditPeriod,
            auditDate: String(report.auditDate),
            reportType:
              report.reportType === 'ada_temuan'
                ? 'Ada Temuan'
                : report.reportType === 'after_temuan_sebelumnya'
                ? 'After (Temuan Sebelumnya)'
                : 'Tidak Ada Temuan',
            totalScore: String(report.totalScore),
            approvalLink,
          },
        })
      }
    } else if (nextStatus === 'approved') {
      // 1. Dapatkan email Pemohon / Auditor
      let auditorEmail = report.auditorEmail
      if (!auditorEmail && report.auditorId) {
        const [auditorEmp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, report.auditorId))
          .limit(1)
        auditorEmail = auditorEmp?.email ?? ''
      }

      // 2. Cari email PIC Area jika ada
      let picEmail: string | null = null
      if (report.masterAreaId) {
        const [areaRow] = await db
          .select({ picEmployeeId: fiveRMasterAreas.picEmployeeId })
          .from(fiveRMasterAreas)
          .where(eq(fiveRMasterAreas.id, report.masterAreaId))
          .limit(1)

        if (areaRow?.picEmployeeId) {
          const [picEmp] = await db
            .select({ email: employees.email })
            .from(employees)
            .where(eq(employees.id, areaRow.picEmployeeId))
            .limit(1)
          picEmail = picEmp?.email ?? null
        }
      }

      const appUrl = getAppUrl()
      const primaryEmail = auditorEmail || picEmail || ''
      const ccList = [auditorEmail, picEmail].filter(
        (e): e is string => !!e && e.includes('@') && e !== primaryEmail
      )

      if (primaryEmail) {
        await sendFiveREmailNotification({
          templateCode: 'workflow_five_r_report_approved',
          recipientEmail: primaryEmail,
          ccEmails: ccList.length > 0 ? ccList : null,
          variables: {
            requestNumber: report.reportNumber,
            reportNumber: report.reportNumber,
            recipientName: report.auditorName,
            requesterName: report.auditorName,
            auditorName: report.auditorName,
            picAreaName: report.picAreaName,
            status: 'Approved (Disetujui Final)',
            approvedBy: session?.user?.name || currentStepConfig?.approverName || 'Bardinia Susi Ekawaty',
            notes: notes || 'Laporan 5R telah disetujui sepenuhnya oleh seluruh jajaran approver.',
            totalScore: String(report.totalScore),
            actionUrl: `${appUrl}/dashboard/quality/5r`,
            viewLink: `${appUrl}/dashboard/quality/5r`,
          },
        })
      }
    }

    safeRevalidatePath('/dashboard/quality/5r')
    safeRevalidatePath('/mobile/quality/5r')
    safeRevalidatePath('/dashboard/approval')

    return {
      success: true,
      message:
        nextStatus === 'approved'
          ? `Laporan ${report.reportNumber} telah disetujui sepenuhnya (Level 3 Selesai).`
          : `Laporan ${report.reportNumber} disetujui di Level ${currentLevel}, lanjut ke Level ${nextLevel}.`,
    }
  } catch (error: any) {
    console.error('[5R] Approve error:', error)
    return { success: false, message: error?.message ?? 'Gagal memproses approval.' }
  }
}

/**
 * Reject / Return Laporan 5R
 */
export async function rejectFiveRReportAction(reportId: number, notes: string) {
  try {
    let session = null
    try {
      session = await getServerSession()
    } catch {}
    const [report] = await db
      .select()
      .from(fiveRReports)
      .where(eq(fiveRReports.id, reportId))
      .limit(1)

    if (!report) return { success: false, message: 'Laporan tidak ditemukan.' }

    await db.insert(fiveRApprovalLogs).values({
      reportId: report.id,
      level: report.currentApprovalLevel,
      roleLabel: `Step ${report.currentApprovalLevel}`,
      approverEmployeeId: null,
      approverName: session?.user?.name || 'Approver',
      action: 'rejected',
      notes: notes || 'Ditolak / perlu revisi',
    })

    // Update all central hero_approvals table rows for this report to rejected
    await db
      .update(approvals)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        decisionNote: notes,
        rejectionReason: notes,
      })
      .where(eq(approvals.fiveRReportId, reportId))

    await db
      .update(fiveRReports)
      .set({
        status: 'rejected',
        approvalNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(fiveRReports.id, reportId))

    // Cari email PIC Area jika ada
    let picEmail: string | null = null
    if (report.masterAreaId) {
      const [areaRow] = await db
        .select({ picEmployeeId: fiveRMasterAreas.picEmployeeId })
        .from(fiveRMasterAreas)
        .where(eq(fiveRMasterAreas.id, report.masterAreaId))
        .limit(1)

      if (areaRow?.picEmployeeId) {
        const [picEmp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, areaRow.picEmployeeId))
          .limit(1)
        picEmail = picEmp?.email ?? null
      }
    }

    const recipients = [report.auditorEmail, picEmail].filter(
      (e): e is string => !!e && e.includes('@')
    )
    const appUrl = getAppUrl()

    for (const recEmail of recipients) {
      await sendFiveREmailNotification({
        templateCode: 'workflow_five_r_report_rejected',
        recipientEmail: recEmail,
        variables: {
          requestNumber: report.reportNumber,
          reportNumber: report.reportNumber,
          recipientName: report.auditorName,
          requesterName: report.auditorName,
          auditorName: report.auditorName,
          picAreaName: report.picAreaName,
          status: 'Rejected (Ditolak Permanen)',
          rejectedBy: session?.user?.name || 'Approver',
          decisionNote: notes || 'Laporan ditolak permanen oleh approver.',
          rejectionReason: notes || 'Laporan ditolak permanen oleh approver.',
          notes: notes || 'Laporan ditolak permanen oleh approver.',
          actionUrl: `${appUrl}/dashboard/quality/5r`,
          viewLink: `${appUrl}/dashboard/quality/5r`,
        },
      })
    }

    safeRevalidatePath('/dashboard/quality/5r')
    safeRevalidatePath('/mobile/quality/5r')
    safeRevalidatePath('/dashboard/approval')

    return { success: true, message: `Laporan ${report.reportNumber} ditolak / dikembalikan.` }
  } catch (error: any) {
    console.error('[5R] Reject error:', error)
    return { success: false, message: error?.message ?? 'Gagal menolak laporan.' }
  }
}

/**
 * Revert / Kembalikan Laporan 5R untuk Revisi
 */
export async function revertFiveRReportAction(reportId: number, notes: string) {
  try {
    let session = null
    try {
      session = await getServerSession()
    } catch {}
    const [report] = await db
      .select()
      .from(fiveRReports)
      .where(eq(fiveRReports.id, reportId))
      .limit(1)

    if (!report) return { success: false, message: 'Laporan tidak ditemukan.' }

    await db.insert(fiveRApprovalLogs).values({
      reportId: report.id,
      level: report.currentApprovalLevel,
      roleLabel: `Step ${report.currentApprovalLevel}`,
      approverEmployeeId: null,
      approverName: session?.user?.name || 'Approver',
      action: 'reverted',
      notes: notes || 'Dikembalikan untuk revisi / perbaikan',
    })

    // Update ONLY the reverting level in hero_approvals:
    // PENTING: Jangan ubah status approval tahap sebelumnya (tanda tangan tahap sebelumnya tetap utuh!)
    await db
      .update(approvals)
      .set({
        status: 'needs_revision',
        reviewedAt: new Date(),
        decisionNote: notes,
        rejectionReason: notes,
      })
      .where(
        and(
          eq(approvals.fiveRReportId, reportId),
          eq(approvals.level, report.currentApprovalLevel)
        )
      )

    await db
      .update(fiveRReports)
      .set({
        status: 'needs_revision',
        revertedFromLevel: report.currentApprovalLevel,
        approvalNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(fiveRReports.id, reportId))

    // 1. Dapatkan rute approval 5R
    const route = await resolveFiveRApprovalRoute({
      auditorId: report.auditorId,
      siteId: report.siteId,
      areaId: report.masterAreaId,
    })

    // 2. Cari email approver tahap-tahap sebelumnya (misal: Tahap 1 yang sudah approve)
    const previousStepApprovers = route.steps
      .filter((s) => s.level < report.currentApprovalLevel)
      .map((s) => s.approverEmail)
      .filter((e): e is string => !!e && e.includes('@'))

    // 3. Cari email Pemohon / Auditor
    let auditorEmail = report.auditorEmail
    if (!auditorEmail && report.auditorId) {
      const [auditorEmp] = await db
        .select({ email: employees.email })
        .from(employees)
        .where(eq(employees.id, report.auditorId))
        .limit(1)
      auditorEmail = auditorEmp?.email ?? ''
    }

    // 4. Cari email PIC Area jika ada
    let picEmail: string | null = null
    if (report.masterAreaId) {
      const [areaRow] = await db
        .select({ picEmployeeId: fiveRMasterAreas.picEmployeeId })
        .from(fiveRMasterAreas)
        .where(eq(fiveRMasterAreas.id, report.masterAreaId))
        .limit(1)

      if (areaRow?.picEmployeeId) {
        const [picEmp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, areaRow.picEmployeeId))
          .limit(1)
        picEmail = picEmp?.email ?? null
      }
    }

    const appUrl = getAppUrl()
    const ccList = Array.from(
      new Set(
        [...previousStepApprovers, picEmail].filter(
          (e): e is string => !!e && e.includes('@') && e !== auditorEmail
        )
      )
    )

    if (auditorEmail) {
      await sendFiveREmailNotification({
        templateCode: 'workflow_five_r_report_returned_rejected',
        recipientEmail: auditorEmail,
        ccEmails: ccList.length > 0 ? ccList : null,
        variables: {
          requestNumber: report.reportNumber,
          reportNumber: report.reportNumber,
          recipientName: report.auditorName,
          requesterName: report.auditorName,
          auditorName: report.auditorName,
          picAreaName: report.picAreaName,
          status: 'Needs Revision (Dikembalikan untuk Perbaikan)',
          rejectedBy: session?.user?.name || `Approver Tahap ${report.currentApprovalLevel}`,
          decisionNote: notes || 'Laporan dikembalikan dan memerlukan perbaikan.',
          rejectionReason: notes || 'Laporan dikembalikan dan memerlukan perbaikan.',
          notes: notes || 'Laporan dikembalikan dan memerlukan perbaikan.',
          actionUrl: `${appUrl}/dashboard/quality/5r`,
          viewLink: `${appUrl}/dashboard/quality/5r`,
        },
      })
    }

    safeRevalidatePath('/dashboard/quality/5r')
    safeRevalidatePath('/mobile/quality/5r')
    safeRevalidatePath('/dashboard/approval')

    return { success: true, message: `Laporan ${report.reportNumber} berhasil dikembalikan untuk revisi.` }
  } catch (error: any) {
    console.error('[5R] Revert error:', error)
    return { success: false, message: error?.message ?? 'Gagal mengembalikan laporan.' }
  }
}

/**
 * Resubmit / Ajukan Ulang Laporan 5R yang Telah Direvisi
 */
export async function resubmitFiveRReportAction(reportId: number, notes?: string) {
  try {
    let session = null
    try {
      session = await getServerSession()
    } catch {}

    const [report] = await db
      .select()
      .from(fiveRReports)
      .where(eq(fiveRReports.id, reportId))
      .limit(1)

    if (!report) return { success: false, message: 'Laporan tidak ditemukan.' }

    // Tentukan level tujuan: langsung ke level yang meminta revisi!
    const targetLevel = report.revertedFromLevel || report.currentApprovalLevel || 1

    // Aktifkan kembali status pending HANYA untuk tahap yang memberi revisi
    await db
      .update(approvals)
      .set({
        status: 'pending',
        submittedAt: new Date(),
        decisionNote: notes ? `Diajukan ulang: ${notes}` : '',
      })
      .where(
        and(
          eq(approvals.fiveRReportId, reportId),
          eq(approvals.level, targetLevel)
        )
      )

    // Update status report kembali ke pending_approval pada level target
    await db
      .update(fiveRReports)
      .set({
        status: 'pending_approval',
        currentApprovalLevel: targetLevel,
        approvalNotes: notes || `Telah direvisi oleh ${report.auditorName}. Menunggu review ulang Tahap ${targetLevel}.`,
        updatedAt: new Date(),
      })
      .where(eq(fiveRReports.id, reportId))

    // Catat ke log
    await db.insert(fiveRApprovalLogs).values({
      reportId: report.id,
      level: targetLevel,
      roleLabel: `Step ${targetLevel}`,
      approverEmployeeId: null,
      approverName: session?.user?.name || report.auditorName,
      action: 'resubmitted',
      notes: notes || 'Laporan telah direvisi dan diajukan ulang langsung ke tahap yang meminta revisi.',
    })

    // Kirim notifikasi email ke approver tahap target dengan CC ke approver tahap sebelumnya
    const route = await resolveFiveRApprovalRoute({
      auditorId: report.auditorId,
      siteId: report.siteId,
      areaId: report.masterAreaId,
    })

    const targetStep = route.steps.find((s) => s.level === targetLevel)
    const previousStepApprovers = route.steps
      .filter((s) => s.level < targetLevel)
      .map((s) => s.approverEmail)
      .filter((e): e is string => !!e && e.includes('@'))

    if (targetStep?.approverEmail) {
      const appUrl = getAppUrl()
      const ccList = Array.from(
        new Set(
          [...previousStepApprovers, report.auditorEmail].filter(
            (e): e is string => !!e && e.includes('@') && e !== targetStep.approverEmail
          )
        )
      )

      await sendFiveREmailNotification({
        templateCode: 'five_r_approval_request',
        recipientEmail: targetStep.approverEmail,
        ccEmails: ccList.length > 0 ? ccList : null,
        variables: {
          approverName: targetStep.approverName,
          recipientName: targetStep.approverName,
          reportNumber: report.reportNumber,
          requestNumber: report.reportNumber,
          approvalLevel: `Tahap ${targetLevel} (Review Hasil Revisi)`,
          stepName: targetStep.roleLabel,
          picAreaName: report.picAreaName,
          auditorName: report.auditorName,
          requesterName: report.auditorName,
          auditPeriod: report.auditPeriod,
          auditDate: String(report.auditDate),
          reportType: report.reportType,
          totalScore: String(report.totalScore),
          approvalLink: `${appUrl}/dashboard/approval`,
          actionUrl: `${appUrl}/dashboard/approval`,
        },
      })
    }

    safeRevalidatePath('/dashboard/quality/5r')
    safeRevalidatePath('/mobile/quality/5r')
    safeRevalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Laporan ${report.reportNumber} berhasil diajukan ulang langsung ke Tahap ${targetLevel} (${targetStep?.approverName || 'Approver'}). Tanda tangan tahap sebelumnya tetap terjaga.`,
    }
  } catch (error: any) {
    console.error('[5R] Resubmit error:', error)
    return { success: false, message: error?.message ?? 'Gagal mengajukan ulang laporan.' }
  }
}

/**
 * Master Area 5R CRUD
 */
/**
 * Master Area 5R CRUD with Dynamic Fallback & History
 */
export async function getMasterAreasAction() {
  try {
    const rows = await db
      .select({
        id: fiveRMasterAreas.id,
        name: fiveRMasterAreas.name,
        areaScale: fiveRMasterAreas.areaScale,
        siteId: fiveRMasterAreas.siteId,
        siteName: sites.name,
        picEmployeeId: fiveRMasterAreas.picEmployeeId,
        picName: employees.name,
        description: fiveRMasterAreas.description,
        isActive: fiveRMasterAreas.isActive,
        createdAt: fiveRMasterAreas.createdAt,
      })
      .from(fiveRMasterAreas)
      .leftJoin(sites, eq(fiveRMasterAreas.siteId, sites.id))
      .leftJoin(employees, eq(fiveRMasterAreas.picEmployeeId, employees.id))
      .where(eq(fiveRMasterAreas.isActive, true))
      .orderBy(fiveRMasterAreas.name)

    // Enrich each area with dynamic supervisor fallback if PIC is not set
    const enriched = await Promise.all(
      rows.map(async (area) => {
        const effective = await resolveMasterAreaEffectivePic({
          areaId: area.id,
          siteId: area.siteId,
          picEmployeeId: area.picEmployeeId,
        })
        return {
          ...area,
          effectivePicId: effective.picEmployeeId,
          effectivePicName: effective.picName,
          isFallback: effective.isFallback,
          fallbackReason: effective.fallbackReason,
        }
      })
    )

    return { success: true, data: enriched }
  } catch (error: any) {
    console.error('[5R] Get master areas error:', error)
    return { success: false, data: [], message: error?.message ?? 'Gagal memuat master area.' }
  }
}

export async function saveMasterAreaAction(payload: z.infer<typeof masterAreaSchema>) {
  try {
    let session = null
    try {
      session = await getServerSession()
    } catch {}

    const parsed = masterAreaSchema.safeParse(payload)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? 'Validasi gagal.' }
    }

    const { id, ...data } = parsed.data
    const currentUserName = session?.user?.name || 'Admin Quality'

    let currentEmpId: number | null = null
    if (session?.user?.email) {
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      if (emp) currentEmpId = emp.id
    }

    if (id) {
      // 1. Get existing area state to track PIC changes
      const [oldArea] = await db
        .select({
          id: fiveRMasterAreas.id,
          name: fiveRMasterAreas.name,
          siteId: fiveRMasterAreas.siteId,
          picEmployeeId: fiveRMasterAreas.picEmployeeId,
          picName: employees.name,
        })
        .from(fiveRMasterAreas)
        .leftJoin(employees, eq(fiveRMasterAreas.picEmployeeId, employees.id))
        .where(eq(fiveRMasterAreas.id, id))
        .limit(1)

      const oldPicId = oldArea?.picEmployeeId ?? null
      const newPicId = data.picEmployeeId !== undefined ? data.picEmployeeId : null

      // Resolve old and new names
      let newPicName: string | null = null
      if (newPicId) {
        const [newEmp] = await db
          .select({ name: employees.name })
          .from(employees)
          .where(eq(employees.id, newPicId))
          .limit(1)
        newPicName = newEmp?.name ?? null
      }

      // Update area
      await db
        .update(fiveRMasterAreas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(fiveRMasterAreas.id, id))

      // 2. If PIC changed, insert into history and sync live/in-flight approvals
      if (oldPicId !== newPicId) {
        let actionType = 'updated'
        let notes = ''
        if (!oldPicId && newPicId) {
          actionType = 'assigned'
          notes = `PIC Area ditetapkan menjadi ${newPicName}. Status fallback atasan langsung digantikan.`
        } else if (oldPicId && !newPicId) {
          actionType = 'cleared'
          const effectiveFallback = await resolveMasterAreaEffectivePic({
            areaId: id,
            siteId: data.siteId,
            picEmployeeId: null,
          })
          notes = `PIC Area dihapus/dikosongkan. Otomatis beralih ke fallback ${effectiveFallback.picName} (${effectiveFallback.fallbackReason}).`
        } else {
          actionType = 'updated'
          notes = `Pergantian PIC Area dari ${oldArea?.picName || 'PIC Lama'} ke ${newPicName}.`
        }

        await db.insert(fiveRMasterAreaPicHistory).values({
          masterAreaId: id,
          previousPicEmployeeId: oldPicId,
          previousPicName: oldArea?.picName ?? null,
          newPicEmployeeId: newPicId,
          newPicName,
          actionType,
          changedByEmployeeId: currentEmpId,
          changedByName: currentUserName,
          notes,
        })

        // Synchronize in-flight / pending approvals immediately
        await syncInFlightFiveRApprovalsForMasterArea(id)
      }

      safeRevalidatePath('/dashboard/quality/5r/master-area')
      safeRevalidatePath('/dashboard/quality/5r')
      safeRevalidatePath('/mobile/quality/5r')

      return {
        success: true,
        message:
          oldPicId !== newPicId
            ? `Master area berhasil diperbarui. PIC baru diterapkan ke seluruh approval berjalan.`
            : 'Master area berhasil diperbarui.',
      }
    } else {
      const [created] = await db.insert(fiveRMasterAreas).values(data).returning()

      if (created && data.picEmployeeId) {
        const [emp] = await db
          .select({ name: employees.name })
          .from(employees)
          .where(eq(employees.id, data.picEmployeeId))
          .limit(1)

        await db.insert(fiveRMasterAreaPicHistory).values({
          masterAreaId: created.id,
          previousPicEmployeeId: null,
          previousPicName: null,
          newPicEmployeeId: data.picEmployeeId,
          newPicName: emp?.name ?? null,
          actionType: 'assigned',
          changedByEmployeeId: currentEmpId,
          changedByName: currentUserName,
          notes: `PIC Awal Area ditetapkan saat pembuatan master area.`,
        })
      }

      safeRevalidatePath('/dashboard/quality/5r/master-area')
      safeRevalidatePath('/dashboard/quality/5r')
      safeRevalidatePath('/mobile/quality/5r')

      return { success: true, message: 'Master area baru berhasil ditambahkan.' }
    }
  } catch (error: any) {
    console.error('[5R] Save master area error:', error)
    return { success: false, message: error?.message ?? 'Gagal menyimpan master area.' }
  }
}

/**
 * Get PIC History for Master Area
 */
export async function getMasterAreaPicHistoryAction(masterAreaId: number) {
  try {
    const rows = await db
      .select({
        id: fiveRMasterAreaPicHistory.id,
        masterAreaId: fiveRMasterAreaPicHistory.masterAreaId,
        previousPicEmployeeId: fiveRMasterAreaPicHistory.previousPicEmployeeId,
        previousPicName: fiveRMasterAreaPicHistory.previousPicName,
        newPicEmployeeId: fiveRMasterAreaPicHistory.newPicEmployeeId,
        newPicName: fiveRMasterAreaPicHistory.newPicName,
        actionType: fiveRMasterAreaPicHistory.actionType,
        changedByEmployeeId: fiveRMasterAreaPicHistory.changedByEmployeeId,
        changedByName: fiveRMasterAreaPicHistory.changedByName,
        notes: fiveRMasterAreaPicHistory.notes,
        createdAt: fiveRMasterAreaPicHistory.createdAt,
      })
      .from(fiveRMasterAreaPicHistory)
      .where(eq(fiveRMasterAreaPicHistory.masterAreaId, masterAreaId))
      .orderBy(desc(fiveRMasterAreaPicHistory.createdAt))

    return { success: true, data: rows }
  } catch (error: any) {
    console.error('[5R] Get master area PIC history error:', error)
    return { success: false, data: [], message: error?.message ?? 'Gagal memuat histori PIC.' }
  }
}

/**
 * Delete Master Area
 */
export async function deleteMasterAreaAction(masterAreaId: number) {
  try {
    const [area] = await db
      .select({ id: fiveRMasterAreas.id, name: fiveRMasterAreas.name })
      .from(fiveRMasterAreas)
      .where(eq(fiveRMasterAreas.id, masterAreaId))
      .limit(1)

    if (!area) {
      return { success: false, message: 'Master Area tidak ditemukan.' }
    }

    // Delete PIC history entries first
    await db
      .delete(fiveRMasterAreaPicHistory)
      .where(eq(fiveRMasterAreaPicHistory.masterAreaId, masterAreaId))

    // Set masterAreaId in existing reports to null
    await db
      .update(fiveRReports)
      .set({ masterAreaId: null })
      .where(eq(fiveRReports.masterAreaId, masterAreaId))

    // Delete Master Area
    await db
      .delete(fiveRMasterAreas)
      .where(eq(fiveRMasterAreas.id, masterAreaId))

    safeRevalidatePath('/dashboard/quality/5r/master-area')
    safeRevalidatePath('/dashboard/quality/5r')
    safeRevalidatePath('/mobile/quality/5r')

    return { success: true, message: `Master Area "${area.name}" berhasil dihapus.` }
  } catch (error: any) {
    console.error('[5R] Delete master area error:', error)
    return { success: false, message: error?.message ?? 'Gagal menghapus master area.' }
  }
}

export async function deleteFiveRReportAction(reportId: number) {
  try {
    const [report] = await db
      .select({ id: fiveRReports.id, reportNumber: fiveRReports.reportNumber, status: fiveRReports.status })
      .from(fiveRReports)
      .where(eq(fiveRReports.id, reportId))
      .limit(1)

    if (!report) return { success: false, message: 'Laporan 5R tidak ditemukan.' }

    await db.delete(fiveRFindings).where(eq(fiveRFindings.reportId, reportId))
    await db.delete(fiveRApprovalLogs).where(eq(fiveRApprovalLogs.reportId, reportId))
    await db.delete(approvals).where(eq(approvals.fiveRReportId, reportId))
    await db.delete(fiveRReports).where(eq(fiveRReports.id, reportId))

    safeRevalidatePath('/dashboard/quality/5r')
    safeRevalidatePath('/mobile/quality/5r')
    safeRevalidatePath('/dashboard/approval')

    return { success: true, message: `Laporan 5R ${report.reportNumber || ''} berhasil dihapus.` }
  } catch (error: any) {
    console.error('[5R] Delete report error:', error)
    return { success: false, message: error?.message ?? 'Gagal menghapus laporan 5R.' }
  }
}

/**
 * Get 5R Analytics Data & Matrix
 */
export async function getFiveRAnalyticsAction(params?: {
  year?: number
  siteId?: number
  approvedOnly?: boolean
}) {
  try {
    const currentYear = new Date().getFullYear()
    const targetYear = params?.year || currentYear
    const siteId = params?.siteId && params.siteId > 0 ? params.siteId : undefined
    const approvedOnly = Boolean(params?.approvedOnly)

    // 1. Get all active Master Areas with site and PIC
    const allSites = await db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .orderBy(asc(sites.name))

    const masterAreasQuery = db
      .select({
        id: fiveRMasterAreas.id,
        name: fiveRMasterAreas.name,
        areaScale: fiveRMasterAreas.areaScale,
        siteId: fiveRMasterAreas.siteId,
        siteName: sites.name,
        picName: employees.name,
        isActive: fiveRMasterAreas.isActive,
      })
      .from(fiveRMasterAreas)
      .leftJoin(sites, eq(fiveRMasterAreas.siteId, sites.id))
      .leftJoin(employees, eq(fiveRMasterAreas.picEmployeeId, employees.id))

    const masterAreaRows = await (siteId
      ? masterAreasQuery.where(and(eq(fiveRMasterAreas.isActive, true), eq(fiveRMasterAreas.siteId, siteId)))
      : masterAreasQuery.where(eq(fiveRMasterAreas.isActive, true)))

    // 2. Build report query with year, site, and status filters
    const conditions = [
      sql`EXTRACT(YEAR FROM ${fiveRReports.auditDate}::date) = ${targetYear}`,
    ]

    if (siteId) {
      conditions.push(eq(fiveRReports.siteId, siteId))
    }

    if (approvedOnly) {
      conditions.push(eq(fiveRReports.status, 'approved'))
    }

    const reportRows = await db
      .select({
        id: fiveRReports.id,
        reportNumber: fiveRReports.reportNumber,
        masterAreaId: fiveRReports.masterAreaId,
        picAreaName: fiveRReports.picAreaName,
        siteId: fiveRReports.siteId,
        auditPeriod: fiveRReports.auditPeriod,
        auditDate: fiveRReports.auditDate,
        reportType: fiveRReports.reportType,
        scoreRapi: fiveRReports.scoreRapi,
        scoreRingkas: fiveRReports.scoreRingkas,
        scoreResik: fiveRReports.scoreResik,
        scoreRawat: fiveRReports.scoreRawat,
        scoreRajin: fiveRReports.scoreRajin,
        totalScore: fiveRReports.totalScore,
        status: fiveRReports.status,
      })
      .from(fiveRReports)
      .where(and(...conditions))
      .orderBy(asc(fiveRReports.auditDate))

    // 3. Get findings stats
    const reportIds = reportRows.map((r) => r.id)
    let findingsRows: Array<{ id: number; reportId: number; category5r: string; isResolved: boolean }> = []
    if (reportIds.length > 0) {
      findingsRows = await db
        .select({
          id: fiveRFindings.id,
          reportId: fiveRFindings.reportId,
          category5r: fiveRFindings.category5r,
          isResolved: fiveRFindings.isResolved,
        })
        .from(fiveRFindings)
        .where(inArray(fiveRFindings.reportId, reportIds))
    }

    // Aggregate monthly trends
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

    const monthlyTrends = monthNames.map((mName, idx) => {
      const monthReports = reportRows.filter((r) => {
        const d = new Date(r.auditDate)
        const dMonth = d.getMonth()
        return dMonth === idx || r.auditPeriod?.toLowerCase() === mName.toLowerCase()
      })
      const mAvgScore =
        monthReports.length > 0
          ? Number(
              (
                monthReports.reduce((sum, r) => sum + (parseFloat(r.totalScore) || 0), 0) /
                monthReports.length
              ).toFixed(2)
            )
          : 0

      return {
        monthIndex: idx,
        monthName: mName,
        shortName: shortMonthNames[idx],
        reportCount: monthReports.length,
        avgScore: mAvgScore,
      }
    })

    // 5 Pillars averages
    const totalReports = reportRows.length
    const approvedReports = reportRows.filter((r) => r.status === 'approved').length
    const overallAvgScore =
      totalReports > 0
        ? Number(
            (
              reportRows.reduce((sum, r) => sum + (parseFloat(r.totalScore) || 0), 0) / totalReports
            ).toFixed(2)
          )
        : 0

    const pillarsAvg = {
      ringkas: totalReports > 0 ? Math.round(reportRows.reduce((sum, r) => sum + r.scoreRingkas, 0) / totalReports) : 0,
      rapi: totalReports > 0 ? Math.round(reportRows.reduce((sum, r) => sum + r.scoreRapi, 0) / totalReports) : 0,
      resik: totalReports > 0 ? Math.round(reportRows.reduce((sum, r) => sum + r.scoreResik, 0) / totalReports) : 0,
      rawat: totalReports > 0 ? Math.round(reportRows.reduce((sum, r) => sum + r.scoreRawat, 0) / totalReports) : 0,
      rajin: totalReports > 0 ? Math.round(reportRows.reduce((sum, r) => sum + r.scoreRajin, 0) / totalReports) : 0,
    }

    // Build Area Matrix
    const areaMatrix = masterAreaRows.map((ma) => {
      const areaReports = reportRows.filter(
        (r) => r.masterAreaId === ma.id || r.picAreaName?.toLowerCase() === ma.name?.toLowerCase()
      )
      const monthlyScores: Record<string, { score: number; count: number; reportIds: number[] }> = {}

      for (let i = 0; i < 12; i++) {
        const mName = monthNames[i]
        const mReports = areaReports.filter((r) => {
          const d = new Date(r.auditDate)
          return d.getMonth() === i || r.auditPeriod?.toLowerCase() === mName.toLowerCase()
        })

        if (mReports.length > 0) {
          const mAvg = Number(
            (
              mReports.reduce((s, r) => s + (parseFloat(r.totalScore) || 0), 0) / mReports.length
            ).toFixed(2)
          )
          monthlyScores[mName] = {
            score: mAvg,
            count: mReports.length,
            reportIds: mReports.map((r) => r.id),
          }
        } else {
          monthlyScores[mName] = { score: 0, count: 0, reportIds: [] }
        }
      }

      const auditedMonths = Object.values(monthlyScores).filter((m) => m.count > 0)
      const annualAvg =
        auditedMonths.length > 0
          ? Number(
              (auditedMonths.reduce((s, m) => s + m.score, 0) / auditedMonths.length).toFixed(2)
            )
          : 0

      return {
        areaId: ma.id,
        areaName: ma.name,
        areaScale: ma.areaScale,
        siteId: ma.siteId,
        siteName: ma.siteName || 'Global',
        picName: ma.picName || '-',
        monthlyScores,
        annualAvg,
        auditCount: areaReports.length,
        compliancePercent: Math.round((auditedMonths.length / 12) * 100),
      }
    })

    // Compliance Rate: audited areas this year / total master areas
    const activeAuditedAreas = areaMatrix.filter((a) => a.auditCount > 0).length
    const complianceRate = masterAreaRows.length > 0 ? Math.round((activeAuditedAreas / masterAreaRows.length) * 100) : 0

    // Grade Helper
    const getGrade = (score: number) => {
      if (score >= 90) return 'A'
      if (score >= 80) return 'B'
      if (score >= 70) return 'C'
      return 'D'
    }

    // Top Areas & Needs Attention
    const auditedAreaList = areaMatrix
      .filter((a) => a.auditCount > 0)
      .sort((a, b) => b.annualAvg - a.annualAvg)

    const topAreas = auditedAreaList.slice(0, 5).map((a) => ({
      areaId: a.areaId,
      areaName: a.areaName,
      siteName: a.siteName,
      avgScore: a.annualAvg,
      auditCount: a.auditCount,
      grade: getGrade(a.annualAvg),
    }))

    const needsAttentionAreas = [...auditedAreaList]
      .reverse()
      .slice(0, 5)
      .map((a) => ({
        areaId: a.areaId,
        areaName: a.areaName,
        siteName: a.siteName,
        avgScore: a.annualAvg,
        auditCount: a.auditCount,
        grade: getGrade(a.annualAvg),
      }))

    // Findings Stats
    const totalFindings = findingsRows.length
    const resolvedFindings = findingsRows.filter((f) => f.isResolved).length
    const openFindings = totalFindings - resolvedFindings
    const byPillar: Record<string, number> = {
      Ringkas: 0,
      Rapi: 0,
      Resik: 0,
      Rawat: 0,
      Rajin: 0,
    }
    for (const f of findingsRows) {
      if (byPillar[f.category5r] !== undefined) {
        byPillar[f.category5r]++
      }
    }

    // Available Years
    const availableYears = [currentYear, currentYear - 1, currentYear - 2]

    return {
      success: true,
      data: {
        year: targetYear,
        selectedSiteId: siteId || null,
        totalMasterAreas: masterAreaRows.length,
        totalReports,
        approvedReports,
        avgScore: overallAvgScore,
        complianceRate,
        pillarsAvg,
        monthlyTrends,
        areaMatrix,
        topAreas,
        needsAttentionAreas,
        findingsStats: {
          totalFindings,
          resolvedFindings,
          openFindings,
          byPillar,
        },
        availableSites: allSites,
        availableYears,
      },
    }
  } catch (error: any) {
    console.error('[5R Analytics] Error:', error)
    return { success: false, message: error?.message || 'Gagal memuat data analitik 5R.' }
  }
}

