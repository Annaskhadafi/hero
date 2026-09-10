'use server'

import { and, asc, desc, eq, gt, lt, inArray, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/db'
import { approvals, employees } from '@/db/schema/hero'
import { resolveApprovalRouteForActivity } from '@/lib/approval-engine'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { repairFormWo, repairWipPo } from '@/db/schema/form-wo'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import {
  sendFormWoApprovalRequestEmail,
  sendFormWoStatusApprovedEmail,
  sendFormWoStatusRejectedEmail,
  sendFormWoCompletedWithPdfEmail,
} from '@/lib/form-wo-email'
import type { FormWoPdfData } from '@/lib/form-wo-pdf'
import type { WipRepairRecord } from '@/lib/types/wip-repair'

// Form WO Workflow v2 Production Build Trigger
const FORM_WO_PATH = '/dashboard/repair-retread/form-wo'
const WIP_REPAIR_API_URL =
  process.env.WIP_REPAIR_API_URL ??
  'https://ics.chitraparatama.com/product/get_api.php?function=wo_repair'

// --- Helpers ----------------------------------------------------------------

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Ignore when called outside active request store (e.g. scripts / tests)
  }
}

function normalizeValue(value: string | null | undefined) {
  return value?.trim() || '-'
}

function isWaitingWorkOrder(value: string | null | undefined) {
  return normalizeValue(value).toLowerCase() === 'waiting wo'
}

// ponytail: singleton guard � avoids repeated DDL & concurrent race conditions
let _tableEnsured = false

async function ensureFormWoTable() {
  if (_tableEnsured) return
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "repair_form_wo" (
        "id" serial PRIMARY KEY NOT NULL,
        "id_wo" varchar(100),
        "tire_sn" varchar(100),
        "customer" varchar(255),
        "site" varchar(255),
        "store_loc" varchar(100),
        "brand" varchar(100),
        "pattern" varchar(100),
        "size" varchar(100),
        "injury" text,
        "job_type" varchar(100),
        "remark" text,
        "inspect_date" varchar(50),
        "inspector" varchar(255),
        "received_date" varchar(50),
        "receiver" varchar(255),
        "no_pengajuan" varchar(100) UNIQUE,
        "tanggal_pengajuan" timestamp DEFAULT now() NOT NULL,
        "pemohon" varchar(255),
        "catatan_pengajuan" text,
        "status_pengajuan" varchar(50) DEFAULT 'pending' NOT NULL,
        "no_wo_terbit" varchar(100),
        "tanggal_wo_terbit" timestamp,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_by" varchar(255),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "repair_wip_po" (
        "id_wo" varchar(100) PRIMARY KEY NOT NULL,
        "no_po" varchar(255) NOT NULL,
        "po_date" varchar(50),
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    _tableEnsured = true
    // Ensure new columns exist (idempotent ALTER)
    await db.execute(
      sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "jenis_pengajuan" varchar(50) DEFAULT 'repair' NOT NULL`
    )
    await db.execute(
      sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "deskripsi_pekerjaan" text`
    )
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "hari" varchar(50)`)
    await db.execute(
      sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "tanggal" varchar(50)`
    )
    await db.execute(
      sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "total_amount" varchar(100)`
    )
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "items" text`)
    await db.execute(
      sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "no_po" varchar(255)`
    )
    await db.execute(
      sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "tanggal_po" varchar(50)`
    )
    await db.execute(
      sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "submitter_signature_url" text`
    )
    await db.execute(
      sql`ALTER TABLE "repair_wip_po" ADD COLUMN IF NOT EXISTS "po_date" varchar(50)`
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('already exists') || msg.includes('duplicate key')) {
      _tableEnsured = true
      return
    }
    throw error
  }
}

async function generateNoPengajuan(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const result = await db
    .select({ id: repairFormWo.id })
    .from(repairFormWo)
    .orderBy(desc(repairFormWo.id))
    .limit(1)

  const lastId = result[0]?.id ?? 0
  const seq = String(lastId + 1).padStart(4, '0')

  return `FRMWO/${year}/${month}/${seq}`
}

// --- Schemas ----------------------------------------------------------------

const formWoCreateSchema = z.object({
  jenisPengajuan: z.enum(['repair', 'service', 'non_repair', 'retread']).optional().default('repair'),
  idWo: z.string().optional(),
  tireSn: z.string().optional(),
  customer: z.string().optional(),
  site: z.string().optional(),
  storeLoc: z.string().optional(),
  brand: z.string().optional(),
  pattern: z.string().optional(),
  size: z.string().optional(),
  injury: z.string().optional(),
  jobType: z.string().optional(),
  remark: z.string().optional(),
  deskripsiPekerjaan: z.string().optional(),
  inspectDate: z.string().optional(),
  inspector: z.string().optional(),
  receivedDate: z.string().optional(),
  receiver: z.string().optional(),
  pemohon: z.string().optional(),
  catatanPengajuan: z.string().optional(),
  createdBy: z.string().optional(),
  hari: z.string().optional(),
  tanggal: z.string().optional(),
  totalAmount: z.string().optional(),
  items: z.string().optional(),
  noPo: z.string().optional(),
  tanggalPo: z.string().optional(),
  submitterSignatureUrl: z.string().optional(),
})

const formWoUpdateSchema = z.object({
  jenisPengajuan: z.enum(['repair', 'service', 'non_repair', 'retread']).optional(),
  idWo: z.string().optional(),
  tireSn: z.string().optional(),
  customer: z.string().optional(),
  site: z.string().optional(),
  storeLoc: z.string().optional(),
  brand: z.string().optional(),
  pattern: z.string().optional(),
  size: z.string().optional(),
  injury: z.string().optional(),
  jobType: z.string().optional(),
  remark: z.string().optional(),
  deskripsiPekerjaan: z.string().optional(),
  inspectDate: z.string().optional(),
  inspector: z.string().optional(),
  receivedDate: z.string().optional(),
  receiver: z.string().optional(),
  pemohon: z.string().optional(),
  catatanPengajuan: z.string().optional(),
  statusPengajuan: z
    .enum(['pending', 'approved', 'rejected', 'diproses', 'revisi', 'needs_correction'])
    .optional(),
  noWoTerbit: z.string().optional(),
  hari: z.string().optional(),
  tanggal: z.string().optional(),
  totalAmount: z.string().optional(),
  items: z.string().optional(),
  noPo: z.string().optional(),
  tanggalPo: z.string().optional(),
  submitterSignatureUrl: z.string().optional(),
})

// --- Actions ----------------------------------------------------------------

export async function saveWipPo(idWo: string, noPo: string, poDate?: string) {
  try {
    await ensureFormWoTable()
    const cleanId = idWo.trim()
    const cleanPo = noPo.trim()
    const cleanPoDate = poDate !== undefined ? poDate.trim() : ''
    await db.execute(sql`
      INSERT INTO "repair_wip_po" ("id_wo", "no_po", "po_date", "updated_at")
      VALUES (${cleanId}, ${cleanPo}, ${cleanPoDate}, NOW())
      ON CONFLICT ("id_wo") DO UPDATE SET "no_po" = ${cleanPo}, "po_date" = ${cleanPoDate}, "updated_at" = NOW()
    `)
    safeRevalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error('Failed to save WIP PO:', error)
    return { success: false, error: 'Gagal menyimpan Nomor PO & Tanggal PO' }
  }
}

export async function getWaitingWoFromApi(): Promise<WipRepairRecord[]> {
  try {
    const response = await fetch(WIP_REPAIR_API_URL, {
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      console.error(`Failed to fetch WIP Repair API: ${response.status}`)
      return []
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      console.error('Non-JSON response from WIP Repair API')
      return []
    }

    const payload = (await response.json()) as { data: WipRepairRecord[] }

    if (!payload || !Array.isArray(payload.data)) {
      return []
    }

    // Filter hanya yang "waiting wo"
    let waitingList = payload.data.filter((item) => isWaitingWorkOrder(item.wo))

    // Merge saved PO numbers & PO dates from database repair_wip_po
    try {
      await ensureFormWoTable()
      const savedPoList = await db.select().from(repairWipPo)
      const poMap = new Map(savedPoList.map((r) => [r.idWo, { noPo: r.noPo, poDate: r.poDate }]))
      waitingList = waitingList.map((item) => {
        const saved = poMap.get(item.id_wo)
        if (saved) {
          return {
            ...item,
            po: saved.noPo ?? '',
            po_date: saved.poDate ?? '',
          }
        }
        return {
          ...item,
          po: item.po ?? '',
          po_date: item.po_date ?? item.inspect_date ?? '',
        }
      })
    } catch (e) {
      console.error('Failed to merge saved WIP PO:', e)
    }

    return waitingList
  } catch (error) {
    console.error('Failed to fetch Waiting WO data', error)
    return []
  }
}

export async function getFormWoList() {
  try {
    await ensureFormWoTable()
    const rows = await db.select().from(repairFormWo).orderBy(desc(repairFormWo.createdAt))
    if (rows.length === 0) return []

    const woIds = rows.map((r) => r.id)
    const appRows = await db
      .select({
        id: approvals.id,
        repairFormWoId: approvals.repairFormWoId,
        level: approvals.level,
        approverName: approvals.approverName,
        approverEmployeeId: approvals.approverEmployeeId,
        status: approvals.status,
        reviewedAt: approvals.reviewedAt,
        signatureUrl: approvals.signatureUrl,
        decisionNote: approvals.decisionNote,
        routeSnapshot: approvals.routeSnapshot,
      })
      .from(approvals)
      .where(inArray(approvals.repairFormWoId, woIds))
      .orderBy(asc(approvals.level))

    const stepsMap = new Map<number, any[]>()
    for (const a of appRows) {
      if (a.repairFormWoId != null) {
        let jobTitle = 'Approver'
        if (a.routeSnapshot) {
          try {
            const p = JSON.parse(a.routeSnapshot)
            jobTitle = p.label || p.nodeLabel || jobTitle
          } catch {}
        }
        const existing = stepsMap.get(a.repairFormWoId) || []
        existing.push({
          id: a.id,
          level: a.level,
          approverName: a.approverName,
          approverEmployeeId: a.approverEmployeeId,
          jobTitle,
          status: a.status,
          decision: a.status,
          reviewedAt: a.reviewedAt,
          signatureUrl: a.signatureUrl,
          decisionNote: a.decisionNote,
        })
        stepsMap.set(a.repairFormWoId, existing)
      }
    }

    return rows.map((r) => ({
      ...r,
      steps: stepsMap.get(r.id) || [],
    }))
  } catch (error) {
    console.error('Failed to load Form WO list', error)
    return []
  }
}

export async function getFormWoStats() {
  try {
    await ensureFormWoTable()
    const rows = await db
      .select({ statusPengajuan: repairFormWo.statusPengajuan })
      .from(repairFormWo)
    const total = rows.length
    const pending = rows.filter(
      (r) =>
        r.statusPengajuan === 'pending' ||
        r.statusPengajuan === 'revisi' ||
        r.statusPengajuan === 'needs_correction'
    ).length
    const approved = rows.filter((r) => r.statusPengajuan === 'approved').length
    const diproses = rows.filter((r) => r.statusPengajuan === 'diproses').length
    const rejected = rows.filter((r) => r.statusPengajuan === 'rejected').length
    return { total, pending, approved, diproses, rejected }
  } catch (error) {
    console.error('Failed to load Form WO stats', error)
    return { total: 0, pending: 0, approved: 0, diproses: 0, rejected: 0 }
  }
}

export async function createFormWo(data: z.infer<typeof formWoCreateSchema>) {
  try {
    await ensureFormWoTable()
    const parsed = formWoCreateSchema.parse(data)
    const noPengajuan = await generateNoPengajuan()

    let employee = null
    try {
      employee = await getCurrentEmployee()
    } catch {
      const annas = await db.select().from(employees).where(eq(employees.id, 5)).limit(1)
      employee = annas[0] ?? null
    }
    if (!employee) {
      const firstActive = await db.select().from(employees).where(eq(employees.isActive, true)).limit(1)
      employee = firstActive[0] ?? null
    }
    if (!employee) throw new Error('Unauthorized')

    // Wajib tanda tangan digital pemohon sebelum submit
    if (!parsed.submitterSignatureUrl || !parsed.submitterSignatureUrl.trim()) {
      return {
        success: false,
        error: 'Tanda tangan digital pemohon wajib dibubuhkan sebelum mengajukan Form WO.',
      }
    }

    const targetDate = parsed.tanggal ? new Date(parsed.tanggal) : new Date()
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const autoDay = isNaN(targetDate.getTime()) ? '-' : days[targetDate.getDay()]
    const finalHari = parsed.hari && parsed.hari !== '-' ? parsed.hari : autoDay
    const isService = parsed.jenisPengajuan === 'service'
    const finalPemohon =
      parsed.pemohon &&
      parsed.pemohon.trim() &&
      parsed.pemohon !== 'Nama Pengguna' &&
      parsed.pemohon !== 'User Logged In'
        ? parsed.pemohon.trim()
        : employee.name

    const [newFormWo] = await db
      .insert(repairFormWo)
      .values({
        ...parsed,
        pemohon: finalPemohon,
        hari: finalHari,
        noPengajuan,
        statusPengajuan: 'pending',
        sortOrder: 0,
        createdBy: String(employee.id),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: repairFormWo.id })

    const customerLower = (parsed.customer || '').toLowerCase().trim()
    const isMvc =
      customerLower.includes('trakindo') ||
      customerLower.includes('cipta krida') ||
      customerLower.includes('ciptakrida') ||
      customerLower.includes('ckb') ||
      customerLower.includes('mvc') ||
      /\bck\b/i.test(customerLower) ||
      customerLower === 'ck' ||
      customerLower.startsWith('ck ') ||
      customerLower.endsWith(' ck') ||
      customerLower.includes(' ck ') ||
      customerLower.includes('pt ck') ||
      customerLower.includes('pt. ck') ||
      customerLower.includes('pt.ck')

    const transactionType = isService
      ? isMvc
        ? 'form_wo_service_mvc'
        : 'form_wo_service_other'
      : 'form_wo_repair_retread'

    const route = await resolveApprovalRouteForActivity({
      employeeId: employee.id,
      activityType: 'Form WO',
      priority: 'normal',
      overtimeMinutes: 0,
      transactionType,
      customerName: parsed.customer || '',
      siteName: parsed.site || '',
    })

    const approvalIds: number[] = []
    if (route.steps.length > 0) {
      for (const step of route.steps) {
        const isStep1 = step.stepOrder === 1

        const stepStatus: 'pending' | 'waiting' | 'approved' = isStep1 ? 'pending' : 'waiting'
        const reviewedAt: Date | null = null
        const signatureUrl: string | null = null

        const [appr] = await db
          .insert(approvals)
          .values({
            repairFormWoId: newFormWo.id,
            level: step.stepOrder,
            approverName: step.approverName,
            approverEmployeeId: step.approverEmployeeId,
            approverNodeId: step.approverNodeId,
            approvalMatrixId: route.matrixId ?? null,
            approvalStepId: step.approvalMatrixStepId ?? null,
            status: stepStatus,
            reviewedAt,
            signatureUrl,
            submittedAt: new Date(),
            resolutionSource: step.resolutionSource,
            routeSnapshot: JSON.stringify({
              label: step.label,
              nodeLabel: step.nodeLabel,
              fallbackLabel: step.fallbackLabel,
              escalationLabel: step.escalationLabel,
            }),
          })
          .returning({ id: approvals.id })
        approvalIds.push(appr.id)
      }

      if (approvalIds.length > 0) {
        // Step 1 is the active pending step for Approver Tahap 1
        const activePendingStep =
          route.steps.find((s) => s.stepOrder === 1) || route.steps[0]

        let approverEmail: string | undefined
        if (activePendingStep && activePendingStep.approverEmployeeId) {
          const [approverEmp] = await db
            .select({ email: employees.email })
            .from(employees)
            .where(eq(employees.id, activePendingStep.approverEmployeeId))
            .limit(1)
          if (approverEmp?.email) {
            approverEmail = approverEmp.email
            notifyWorkflowBellRecipients({
              recipientEmails: [approverEmail],
              eventType: 'form_wo_review',
              category: 'approval_requests',
              title: 'Review Form WO',
              body: `${finalPemohon} mengajukan Form WO baru (${noPengajuan}) yang membutuhkan persetujuan Anda (${activePendingStep.label}).`,
              url: `/dashboard/approval`,
              tagPrefix: 'form-wo',
            }).catch(console.error)
          }
        }

        sendFormWoApprovalRequestEmail({
          approverEmail,
          approverName: activePendingStep?.approverName || 'Approver',
          pemohon: finalPemohon,
          noPengajuan,
          customer: parsed.customer,
          site: parsed.site,
          jobType: parsed.jobType,
          tireSn: parsed.tireSn,
          brand: parsed.brand,
          size: parsed.size,
          totalAmount: parsed.totalAmount,
          catatanPengajuan: parsed.catatanPengajuan,
          tier: 1,
        }).catch((error) => {
          console.error('Gagal mengirim email approval Form WO', error)
        })
      }
    }

    safeRevalidatePath(FORM_WO_PATH)
    return { success: true, noPengajuan }
  } catch (error) {
    console.error('Create Form WO Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal membuat pengajuan WO',
    }
  }
}

export async function updateFormWo(id: number, data: z.infer<typeof formWoUpdateSchema>) {
  try {
    await ensureFormWoTable()
    const parsed = formWoUpdateSchema.parse(data)

    const existing = await db
      .select()
      .from(repairFormWo)
      .where(eq(repairFormWo.id, id))
      .limit(1)
      .then((r) => r[0])

    const nextStatus =
      existing?.statusPengajuan === 'revisi' || existing?.statusPengajuan === 'needs_correction'
        ? 'pending'
        : parsed.statusPengajuan ?? existing?.statusPengajuan ?? 'pending'

    await db
      .update(repairFormWo)
      .set({
        ...parsed,
        statusPengajuan: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(repairFormWo.id, id))

    // If it was reverted/revisi, re-route directly to the step that requested revision
    if (
      existing &&
      (existing.statusPengajuan === 'revisi' ||
        existing.statusPengajuan === 'needs_correction' ||
        existing.statusPengajuan === 'pending')
    ) {
      // Find the specific step that was reverted (needs_correction)
      const revertedStep = await db
        .select()
        .from(approvals)
        .where(
          and(
            eq(approvals.repairFormWoId, id),
            eq(approvals.status, 'needs_correction')
          )
        )
        .orderBy(asc(approvals.level))
        .limit(1)
        .then((r) => r[0])

      // Target step is the reverted step (e.g. Level 2), or fallback to first non-approved step
      let targetStep = revertedStep
      if (!targetStep) {
        targetStep = await db
          .select()
          .from(approvals)
          .where(
            and(
              eq(approvals.repairFormWoId, id),
              ne(approvals.status, 'approved')
            )
          )
          .orderBy(asc(approvals.level))
          .limit(1)
          .then((r) => r[0])
      }

      const targetLevel = targetStep?.level ?? 1

      // Set ONLY the target step to 'pending' (earlier approved steps remain intact!)
      if (targetStep) {
        await db
          .update(approvals)
          .set({
            status: 'pending',
            submittedAt: new Date(),
          })
          .where(eq(approvals.id, targetStep.id))
      } else {
        await db
          .update(approvals)
          .set({
            status: 'pending',
            submittedAt: new Date(),
          })
          .where(and(eq(approvals.repairFormWoId, id), eq(approvals.level, 1)))
      }

      // Keep steps after targetLevel as 'waiting'
      await db
        .update(approvals)
        .set({
          status: 'waiting',
        })
        .where(
          and(
            eq(approvals.repairFormWoId, id),
            gt(approvals.level, targetLevel)
          )
        )

      // Update Form WO status to 'diproses' if targetLevel > 1, or 'pending' if level 1
      const effectiveFormWoStatus = targetLevel > 1 ? 'diproses' : 'pending'
      await db
        .update(repairFormWo)
        .set({ statusPengajuan: effectiveFormWoStatus, updatedAt: new Date() })
        .where(eq(repairFormWo.id, id))

      // Fetch previous approvers who already approved earlier steps to CC them
      const previousApprovedSteps = await db
        .select({
          approverEmployeeId: approvals.approverEmployeeId,
          approverName: approvals.approverName,
        })
        .from(approvals)
        .where(
          and(
            eq(approvals.repairFormWoId, id),
            lt(approvals.level, targetLevel),
            eq(approvals.status, 'approved')
          )
        )

      const prevApproverEmpIds = Array.from(
        new Set(
          previousApprovedSteps
            .map((s) => s.approverEmployeeId)
            .filter((empId): empId is number => empId != null)
        )
      )

      let previousApproverEmails: string[] = []
      if (prevApproverEmpIds.length > 0) {
        const prevEmps = await db
          .select({ email: employees.email })
          .from(employees)
          .where(inArray(employees.id, prevApproverEmpIds))
        previousApproverEmails = prevEmps
          .map((e) => e.email)
          .filter(Boolean) as string[]
      }

      // Notify the specific approver of targetLevel
      const approverToNotify = targetStep
      let approverEmail: string | undefined
      if (approverToNotify?.approverEmployeeId) {
        const [approverEmp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, approverToNotify.approverEmployeeId))
          .limit(1)

        if (approverEmp?.email) {
          approverEmail = approverEmp.email
          notifyWorkflowBellRecipients({
            recipientEmails: [approverEmp.email, ...previousApproverEmails],
            eventType: 'form_wo_review',
            category: 'approval_requests',
            title: `Form WO Telah Direvisi (Step ${targetLevel})`,
            body: `${parsed.pemohon || existing.pemohon || 'Pemohon'} telah merevisi Form WO (${existing.noPengajuan}) yang Anda minta revisi. Silakan review kembali.`,
            url: `/dashboard/approval`,
            tagPrefix: 'form-wo',
          }).catch(console.error)
        }
      }

      sendFormWoApprovalRequestEmail({
        approverEmail,
        approverName: approverToNotify?.approverName || 'Approver',
        pemohon: parsed.pemohon || existing.pemohon || 'Pemohon',
        noPengajuan: existing.noPengajuan || '',
        customer: parsed.customer || existing.customer || '-',
        site: parsed.site || existing.site || '-',
        jobType: parsed.jobType || existing.jobType || '-',
        tireSn: parsed.tireSn || existing.tireSn || '-',
        brand: parsed.brand || existing.brand || '-',
        size: parsed.size || existing.size || '-',
        totalAmount: parsed.totalAmount || existing.totalAmount || '-',
        catatanPengajuan: parsed.catatanPengajuan || existing.catatanPengajuan || '-',
        tier: targetLevel as any,
        ccEmails: previousApproverEmails,
      }).catch(console.error)
    }

    // If Nomor WO is filled/updated, generate complete PDF & send email with PDF to Admin CP Site & QC/Leader
    if (parsed.noWoTerbit && parsed.noWoTerbit.trim()) {
      triggerFormWoCompletedPdfNotification(id, parsed.noWoTerbit.trim()).catch(console.error)
    }

    safeRevalidatePath(FORM_WO_PATH)
    safeRevalidatePath('/dashboard/approval')
    return { success: true, noPengajuan: existing.noPengajuan }
  } catch (error) {
    console.error('Update Form WO Error:', error)
    return { success: false, error: 'Gagal memperbarui pengajuan WO' }
  }
}

async function triggerFormWoCompletedPdfNotification(formWoId: number, noWoTerbit: string) {
  try {
    const existing = await db
      .select()
      .from(repairFormWo)
      .where(eq(repairFormWo.id, formWoId))
      .limit(1)
      .then((r) => r[0])

    if (!existing) return

    // Fetch all approval steps
    const stepRows = await db
      .select({
        id: approvals.id,
        level: approvals.level,
        approverName: approvals.approverName,
        approverEmployeeId: approvals.approverEmployeeId,
        status: approvals.status,
        reviewedAt: approvals.reviewedAt,
        signatureUrl: approvals.signatureUrl,
        decisionNote: approvals.decisionNote,
        routeSnapshot: approvals.routeSnapshot,
      })
      .from(approvals)
      .where(eq(approvals.repairFormWoId, formWoId))
      .orderBy(asc(approvals.level))

    let creatorEmail: string | undefined
    if (existing.createdBy) {
      const creator = await db
        .select({ email: employees.email })
        .from(employees)
        .where(eq(employees.id, Number(existing.createdBy)))
        .limit(1)
        .then((r) => r[0])
      creatorEmail = creator?.email
    }

    const isService = existing.jenisPengajuan === 'service'
    const dynamicRecipients: Array<{ email: string; roleName: string }> = []
    if (creatorEmail) {
      dynamicRecipients.push({ email: creatorEmail, roleName: 'Pemohon' })
    }

    if (isService) {
      // Untuk WO Service: kirim HANYA ke Service Operation SPV (Step 1: MVC untuk CK/CKB/Trakindo atau Others untuk yang lain)
      const serviceSpvStep = stepRows.find((s) => s.level === 1)
      if (serviceSpvStep?.approverEmployeeId) {
        const emp = await db
          .select({ email: employees.email, name: employees.name })
          .from(employees)
          .where(eq(employees.id, serviceSpvStep.approverEmployeeId))
          .limit(1)
          .then((r) => r[0])
        if (emp?.email && !dynamicRecipients.some((r) => r.email.toLowerCase() === emp.email.toLowerCase())) {
          let roleName = 'Service Operation Coord. SPV'
          if (serviceSpvStep.routeSnapshot) {
            try {
              const snap = JSON.parse(serviceSpvStep.routeSnapshot)
              roleName = snap.label || snap.nodeLabel || roleName
            } catch {}
          }
          dynamicRecipients.push({ email: emp.email, roleName })
        }
      }
    } else {
      // Untuk WO Repair: kirim HANYA ke QC / Leader (Step 1)
      const qcStep = stepRows.find(
        (s) =>
          (s.routeSnapshot && s.routeSnapshot.toLowerCase().includes('qc')) ||
          (s.approverName && s.approverName.toLowerCase().includes('qc')) ||
          s.level === 1
      )
      if (qcStep?.approverEmployeeId) {
        const emp = await db
          .select({ email: employees.email, name: employees.name })
          .from(employees)
          .where(eq(employees.id, qcStep.approverEmployeeId))
          .limit(1)
          .then((r) => r[0])
        if (emp?.email && !dynamicRecipients.some((r) => r.email.toLowerCase() === emp.email.toLowerCase())) {
          let roleName = 'QC / Leader'
          if (qcStep.routeSnapshot) {
            try {
              const snap = JSON.parse(qcStep.routeSnapshot)
              roleName = snap.label || snap.nodeLabel || roleName
            } catch {}
          }
          dynamicRecipients.push({ email: emp.email, roleName })
        }
      }
    }

    const pdfSteps = stepRows.map((s) => {
      let jobTitle = 'Approver'
      if (s.routeSnapshot) {
        try {
          const snap = JSON.parse(s.routeSnapshot)
          jobTitle = snap.label || snap.nodeLabel || jobTitle
        } catch {}
      }
      return {
        level: s.level,
        approverName: s.approverName,
        jobTitle,
        signatureUrl: s.signatureUrl,
        status: s.status,
        reviewedAt: s.reviewedAt,
        decisionNote: s.decisionNote,
      }
    })

    const pdfData: FormWoPdfData = {
      id: existing.id,
      noPengajuan: existing.noPengajuan || '',
      jenisPengajuan: existing.jenisPengajuan,
      noWoTerbit,
      noPo: existing.noPo,
      tanggalPo: existing.tanggalPo ? String(existing.tanggalPo) : null,
      hari: existing.hari,
      tanggal: existing.tanggal ? String(existing.tanggal) : null,
      tanggalPengajuan: existing.createdAt,
      customer: existing.customer,
      site: existing.site,
      pemohon: existing.pemohon,
      submitterSignatureUrl: existing.submitterSignatureUrl,
      catatanPengajuan: existing.catatanPengajuan,
      totalAmount: existing.totalAmount,
      items: existing.items,
      steps: pdfSteps,
    }

    await sendFormWoCompletedWithPdfEmail({
      recipients: dynamicRecipients,
      pemohon: existing.pemohon || 'Pemohon',
      noPengajuan: existing.noPengajuan || '',
      noWoTerbit,
      noPo: existing.noPo || undefined,
      customer: existing.customer || undefined,
      site: existing.site || undefined,
      jobType: existing.jobType || undefined,
      totalAmount: existing.totalAmount || undefined,
      pdfData,
    })

    const { notifyWorkflowBellRecipients } = await import('@/lib/workflow-notification-center')
    const finalRecipients = dynamicRecipients.map((r) => r.email).filter(Boolean)
    if (finalRecipients.length > 0) {
      notifyWorkflowBellRecipients({
        recipientEmails: finalRecipients,
        eventType: 'form_wo_approved',
        category: 'approval_requests',
        title: 'Form WO Resmi Terbit (PDF Dilampirkan)',
        body: `Nomor WO resmi (${noWoTerbit}) telah diterbitkan untuk ${existing.noPengajuan}. File PDF Form WO dapat diunduh melalui sistem atau email Anda.`,
        url: `/dashboard/repair-retread/form-wo`,
        tagPrefix: 'form-wo',
      }).catch(console.error)
    }
  } catch (err) {
    console.error('triggerFormWoCompletedPdfNotification error:', err)
  }
}

export async function updateFormWoStatus(
  id: number,
  status: 'pending' | 'approved' | 'rejected' | 'diproses',
  noWoTerbit?: string
) {
  try {
    await ensureFormWoTable()
    const values: Partial<typeof repairFormWo.$inferInsert> = {
      statusPengajuan: status,
      updatedAt: new Date(),
    }
    if (noWoTerbit) {
      values.noWoTerbit = noWoTerbit
      values.tanggalWoTerbit = new Date()
    }

    // Fetch record details before update for email context
    const existing = await db.select().from(repairFormWo).where(eq(repairFormWo.id, id))
    const record = existing[0]

    await db.update(repairFormWo).set(values).where(eq(repairFormWo.id, id))

    if (noWoTerbit && noWoTerbit.trim()) {
      triggerFormWoCompletedPdfNotification(id, noWoTerbit.trim()).catch(console.error)
    }

    // Trigger Status Update Email
    if (record) {
      void (async () => {
        try {
          let requesterEmail: string | undefined
          if (record.createdBy) {
            const emp = await db
              .select({ email: employees.email })
              .from(employees)
              .where(eq(employees.id, Number(record.createdBy)))
              .limit(1)
              .then((r) => r[0])
            requesterEmail = emp?.email
          }
          if (requesterEmail) {
            if (status === 'approved' || status === 'diproses') {
              await sendFormWoStatusApprovedEmail({
                requesterEmail,
                pemohon: record.pemohon || 'Pemohon',
                noPengajuan: record.noPengajuan || '-',
                noWoTerbit: noWoTerbit || record.noWoTerbit || '-',
                customer: record.customer || '-',
                site: record.site || '-',
                jobType: record.jobType || '-',
                totalAmount: record.totalAmount || '-',
              })
            } else if (status === 'rejected') {
              await sendFormWoStatusRejectedEmail({
                requesterEmail,
                pemohon: record.pemohon || 'Pemohon',
                noPengajuan: record.noPengajuan || '-',
                catatanPengajuan: record.catatanPengajuan || 'Pengajuan tidak memenuhi syarat.',
              })
            }
          }
        } catch (e) {
          console.error('Form WO Status Email notification error:', e)
        }
      })()
    }

    safeRevalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error('Update Form WO Status Error:', error)
    return { success: false, error: 'Gagal memperbarui status pengajuan' }
  }
}

export async function deleteFormWo(id: number) {
  try {
    await ensureFormWoTable()
    await db.delete(repairFormWo).where(eq(repairFormWo.id, id))
    safeRevalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error('Delete Form WO Error:', error)
    return { success: false, error: 'Gagal menghapus pengajuan WO' }
  }
}

export async function updateWoCpNumber(id: number, noWoCp: string) {
  try {
    const employee = await getCurrentEmployee()
    if (!employee) throw new Error('Unauthorized')
    const [updated] = await db
      .update(repairFormWo)
      .set({ noWoTerbit: noWoCp, statusPengajuan: 'approved', tanggalWoTerbit: new Date() })
      .where(eq(repairFormWo.id, id))
      .returning({
        id: repairFormWo.id,
        noPengajuan: repairFormWo.noPengajuan,
        pemohon: repairFormWo.pemohon,
        customer: repairFormWo.customer,
        site: repairFormWo.site,
        jobType: repairFormWo.jobType,
        totalAmount: repairFormWo.totalAmount,
        createdBy: repairFormWo.createdBy,
      })

    if (!updated) {
      return { success: false, error: 'Form WO tidak ditemukan' }
    }

    if (noWoCp && noWoCp.trim()) {
      triggerFormWoCompletedPdfNotification(id, noWoCp.trim()).catch(console.error)
    }

    safeRevalidatePath('/dashboard/repair-retread/form-wo')
    safeRevalidatePath('/dashboard/approval')
    return { success: true }
  } catch (error) {
    console.error('Gagal mengupdate No WO CP:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Terjadi kesalahan' }
  }
}
