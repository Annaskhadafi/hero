'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  approvals,
  employees,
  fiveRApprovalLogs,
  fiveRFindings,
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
  sendFiveREmailNotification,
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
        approvalNotes: fiveRReports.approvalNotes,
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

    const route = await resolveFiveRApprovalRoute({
      auditorId: report.auditorId,
      siteId: report.siteId,
      areaId: report.masterAreaId,
    })

    return {
      success: true,
      report,
      findings,
      approvalLogs,
      approvalRoute: route.steps,
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

    if (currentLevel >= 3) {
      // Step 3 (Bardinia Susi) selesai -> Final Approved
      nextStatus = 'approved'
      nextLevel = 3
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
    } else if (nextStatus === 'approved' && report.auditorEmail) {
      // Notifikasi email final ke Auditor
      const appUrl = getAppUrl()
      await sendFiveREmailNotification({
        templateCode: 'five_r_status_update',
        recipientEmail: report.auditorEmail,
        variables: {
          auditorName: report.auditorName,
          reportNumber: report.reportNumber,
          picAreaName: report.picAreaName,
          status: 'Approved (Disetujui Final)',
          approvedBy: session?.user?.name || currentStepConfig?.approverName || 'Bardinia Susi Ekawaty',
          notes: notes || 'Laporan 5R telah disetujui sepenuhnya oleh seluruh jajaran approver.',
          viewLink: `${appUrl}/dashboard/quality/5r`,
        },
      })
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

    if (report.auditorEmail) {
      const appUrl = getAppUrl()
      await sendFiveREmailNotification({
        templateCode: 'five_r_status_update',
        recipientEmail: report.auditorEmail,
        variables: {
          auditorName: report.auditorName,
          reportNumber: report.reportNumber,
          picAreaName: report.picAreaName,
          status: 'Rejected / Perlu Revisi',
          approvedBy: session?.user?.name || 'Approver',
          notes: notes || 'Laporan memerlukan perbaikan/revisi.',
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

    // Update all central hero_approvals table rows for this report to needs_revision
    await db
      .update(approvals)
      .set({
        status: 'needs_revision',
        reviewedAt: new Date(),
        decisionNote: notes,
        rejectionReason: notes,
      })
      .where(eq(approvals.fiveRReportId, reportId))

    await db
      .update(fiveRReports)
      .set({
        status: 'needs_revision',
        currentApprovalLevel: 1, // Revert to Step 1
        approvalNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(fiveRReports.id, reportId))

    if (report.auditorEmail) {
      const appUrl = getAppUrl()
      await sendFiveREmailNotification({
        templateCode: 'five_r_status_update',
        recipientEmail: report.auditorEmail,
        variables: {
          auditorName: report.auditorName,
          reportNumber: report.reportNumber,
          picAreaName: report.picAreaName,
          status: 'Needs Revision (Dikembalikan untuk Perbaikan)',
          approvedBy: session?.user?.name || 'Approver',
          notes: notes || 'Laporan dikembalikan dan memerlukan perbaikan.',
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
 * Master Area 5R CRUD
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

    return { success: true, data: rows }
  } catch (error: any) {
    console.error('[5R] Get master areas error:', error)
    return { success: false, data: [], message: error?.message ?? 'Gagal memuat master area.' }
  }
}

export async function saveMasterAreaAction(payload: z.infer<typeof masterAreaSchema>) {
  try {
    const parsed = masterAreaSchema.safeParse(payload)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? 'Validasi gagal.' }
    }

    const { id, ...data } = parsed.data

    if (id) {
      await db
        .update(fiveRMasterAreas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(fiveRMasterAreas.id, id))
      return { success: true, message: 'Master area berhasil diperbarui.' }
    } else {
      await db.insert(fiveRMasterAreas).values(data)
      return { success: true, message: 'Master area baru berhasil ditambahkan.' }
    }
  } catch (error: any) {
    console.error('[5R] Save master area error:', error)
    return { success: false, message: error?.message ?? 'Gagal menyimpan master area.' }
  }
}

export async function deleteFiveRReportAction(reportId: number) {
  try {
    const [report] = await db
      .select({ id: fiveRReports.id, status: fiveRReports.status })
      .from(fiveRReports)
      .where(eq(fiveRReports.id, reportId))
      .limit(1)

    if (!report) return { success: false, message: 'Laporan tidak ditemukan.' }

    // Only allow draft or rejected deletion
    if (report.status !== 'draft' && report.status !== 'rejected') {
      return { success: false, message: 'Hanya laporan draft atau rejected yang dapat dihapus.' }
    }

    await db.delete(fiveRFindings).where(eq(fiveRFindings.reportId, reportId))
    await db.delete(fiveRApprovalLogs).where(eq(fiveRApprovalLogs.reportId, reportId))
    await db.delete(approvals).where(eq(approvals.fiveRReportId, reportId))
    await db.delete(fiveRReports).where(eq(fiveRReports.id, reportId))

    safeRevalidatePath('/dashboard/quality/5r')
    safeRevalidatePath('/mobile/quality/5r')
    safeRevalidatePath('/dashboard/approval')

    return { success: true, message: 'Laporan 5R berhasil dihapus.' }
  } catch (error: any) {
    console.error('[5R] Delete report error:', error)
    return { success: false, message: error?.message ?? 'Gagal menghapus laporan 5R.' }
  }
}

