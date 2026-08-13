'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import {
  approvalMatrices,
  approvalMatrixSteps,
  approvals,
  emailTemplates,
  employees,
  formSubmissions,
  formTemplates,
  inboxItems,
  notificationDeliveries,
  notificationEvents,
  orgChartNodes,
  orgChartStructures,
  reminderJobs,
  sites,
  workflowBranches,
  workflowNotificationRules,
  workflowReminderRules,
  workflowStepRules,
  workflowTemplateVersions,
  workflowTemplates,
} from '@/db/schema/hero'
import { ensureApprovalBlueprintSeedData } from '@/lib/approval-blueprint'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { logAuditEvent } from '@/lib/audit-logger'

type WorkflowStudioActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
  existingMatrixId?: number
}

const approvalStepSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1),
})

const siteApprovalEntrySchema = z.object({
  siteId: z.coerce.number().int().positive(),
  // Nilai kolom yang belum diisi dikirim sebagai string kosong ("") dari form —
  // ubah jadi undefined supaya baris site dengan kolom kosong tetap valid,
  // dan kolom yang terisi tetap ter-coerce ke number.
  values: z.record(
    z.string(),
    z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive().optional())
  ),
})

const globalStepSchema = z.object({
  label: z.string().trim().min(1),
  employeeId: z.coerce.number().int().positive(),
})

const approvalBuilderSchema = z.object({
  matrixId: z.coerce.number().int().positive().optional(),
  menuKey: z.string().trim().min(1),
  templateKey: z.string().trim().min(1).max(100),
  transactionType: z.string().trim().min(1).max(100),
  activityName: z.string().trim().min(1).max(160),
  mode: z.string().trim().min(1).max(80).default('sequential'),
  approvalSteps: z.string().trim().min(1),
  siteApprovals: z.string().trim().min(1),
  effectiveFrom: z.string().trim().optional(),
  effectiveTo: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
  isActive: z.enum(['true', 'false']).default('true'),
  beforeDueHours: z.coerce.number().int().min(1).max(240).default(2),
  overdueHours: z.coerce.number().int().min(0).max(240).default(0),
})

const reminderSchema = z.object({
  reminderJobId: z.coerce.number().int().positive(),
})

const investigateSchema = z.object({
  submissionId: z.coerce.number().int().positive(),
  requestId: z.string().trim().min(1).max(100),
})

function parseOptionalDate(value?: string) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

async function requireWorkflowStudioEdit() {
  const permission = await getCurrentMenuPermission('workflow_studio')
  if (!permission.canEdit) {
    throw new Error('Akses edit Workflow Studio tidak tersedia.')
  }
}

async function ensureEmailTemplate(templateCode: string, name: string, subject: string) {
  await db
    .insert(emailTemplates)
    .values({
      name,
      templateCode,
      templateType: 'Approval',
      deliveryChannel: 'email',
      recipientScope: 'approval',
      subject,
      htmlContent:
        '<p>Halo {{recipientName}},</p><p>{{message}}</p><p><a href="{{approvalUrl}}">Buka Approval</a></p>',
      textContent: 'Halo {{recipientName}}, {{message}} Buka Approval: {{approvalUrl}}',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: emailTemplates.templateCode,
      set: { name, subject, updatedAt: new Date(), isActive: true },
    })
}

export async function saveWorkflowStudioApprovalAction(
  _state: WorkflowStudioActionState,
  formData: FormData
): Promise<WorkflowStudioActionState> {
  try {
    await requireWorkflowStudioEdit()
    await ensureApprovalBlueprintSeedData()

    const parsed = approvalBuilderSchema.safeParse(Object.fromEntries(formData.entries()))
    if (!parsed.success) {
      return { status: 'error', message: 'Payload workflow belum lengkap.' }
    }

    const payload = parsed.data

    let parsedSteps: z.infer<typeof approvalStepSchema>[] = []
    let parsedSiteEntries: z.infer<typeof siteApprovalEntrySchema>[] = []

    try {
      const rawSteps = JSON.parse(payload.approvalSteps)
      const stepsResult = approvalStepSchema.array().safeParse(rawSteps)
      if (stepsResult.success) parsedSteps = stepsResult.data
    } catch { /* ignore */ }

    try {
      const rawSites = JSON.parse(payload.siteApprovals)
      const sitesResult = siteApprovalEntrySchema.array().safeParse(rawSites)
      if (sitesResult.success) parsedSiteEntries = sitesResult.data
    } catch { /* ignore */ }

    if (parsedSteps.length === 0 || parsedSiteEntries.length === 0) {
      return { status: 'error', message: 'Minimal satu langkah approval dan satu site wajib diisi.' }
    }

    // Langkah bertipe Section menyimpan id section (bukan id karyawan) di values,
    // jadi harus dikeluarkan dari validasi & pembuatan approver.
    const sectionStepIds = new Set(
      parsedSteps
        .filter((s) => s.label.toLowerCase().replace(/[^a-z]/g, '') === 'section')
        .map((s) => s.id)
    )

    const allEmployeeIds = parsedSiteEntries.flatMap((entry) =>
      Object.entries(entry.values)
        .filter(([stepId, id]) => !sectionStepIds.has(stepId) && id != null && id > 0)
        .map(([, id]) => id as number)
    )
    if (allEmployeeIds.length === 0) {
      return { status: 'error', message: 'Minimal satu approver wajib dipilih.' }
    }

    // Approver disimpan apa adanya (aktif maupun nonaktif) sesuai permintaan user.
    const employeeLookup = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
    const employeeNameById = new Map(employeeLookup.map((employee) => [employee.id, employee.name]))

    if (payload.isActive === 'true') {
      const siteRows = await db.select({ id: sites.id, name: sites.name }).from(sites)
      const siteMap = new Map(siteRows.map((s) => [s.id, s.name]))

      for (const entry of parsedSiteEntries) {
        const duplicates = await db
          .select({ id: approvalMatrices.id, name: approvalMatrices.name })
          .from(approvalMatrices)
          .where(
            and(
              eq(approvalMatrices.isActive, true),
              eq(approvalMatrices.transactionType, payload.transactionType),
              eq(approvalMatrices.siteId, entry.siteId),
              eq(approvalMatrices.activityType, '')
            )
          )
        const duplicate = duplicates.find((row) => row.id !== payload.matrixId)

        if (duplicate) {
          const siteName = siteMap.get(entry.siteId) ?? `Site ${entry.siteId}`
          return {
            status: 'error',
            message: `Workflow aktif sudah ada untuk site ${siteName}: ${duplicate.name}. Edit existing, jangan buat duplikat.`,
            existingMatrixId: duplicate.id,
          }
        }
      }
    }

    const session = await getServerSession()
    const now = new Date()
    const formEffectiveFrom = parseOptionalDate(payload.effectiveFrom)
    const effectiveTo = parseOptionalDate(payload.effectiveTo)
    const templateCodeBase = slug(payload.templateKey || payload.menuKey)

    let existingMatrixEffectiveFrom: Date | null = null
    if (payload.matrixId) {
      const [existing] = await db
        .select({ effectiveFrom: approvalMatrices.effectiveFrom })
        .from(approvalMatrices)
        .where(eq(approvalMatrices.id, payload.matrixId))
        .limit(1)
      existingMatrixEffectiveFrom = existing?.effectiveFrom ?? null
    }

    const effectiveFrom = formEffectiveFrom ?? existingMatrixEffectiveFrom ?? now

    await db.transaction(async (tx) => {
      const [workflow] = await tx
        .insert(workflowTemplates)
        .values({
          templateKey: payload.templateKey,
          name: payload.activityName,
          mode: payload.mode,
          description: payload.notes ?? '',
          isActive: payload.isActive === 'true',
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: workflowTemplates.templateKey,
          set: {
            name: payload.activityName,
            mode: payload.mode,
            description: payload.notes ?? '',
            isActive: payload.isActive === 'true',
            updatedAt: now,
          },
        })
        .returning()

      const [latestVersion] = await tx
        .select({ versionNumber: workflowTemplateVersions.versionNumber })
        .from(workflowTemplateVersions)
        .where(eq(workflowTemplateVersions.workflowTemplateId, workflow.id))
        .orderBy(desc(workflowTemplateVersions.versionNumber))
        .limit(1)

      const [version] = await tx
        .insert(workflowTemplateVersions)
        .values({
          workflowTemplateId: workflow.id,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          publishStatus: payload.isActive === 'true' ? 'published' : 'draft',
          effectiveFrom,
          effectiveTo,
          notes: payload.notes ?? '',
          updatedAt: now,
        })
        .returning()

      const [branch] = await tx
        .insert(workflowBranches)
        .values({
          workflowVersionId: version.id,
          branchKey: 'default',
          label: 'Default Approval Route',
          outcomeType: 'route',
          routeMode: payload.mode,
          sortOrder: 1,
        })
        .returning()

      const [structure] = await tx
        .insert(orgChartStructures)
        .values({
          name: `Workflow Studio - ${payload.activityName}`,
          scopeType: 'workflow',
          scopeValue: payload.templateKey,
          description: payload.notes ?? '',
          isDefault: false,
          isActive: true,
          effectiveFrom,
          effectiveTo,
          updatedAt: now,
        })
        .returning()

      if (payload.matrixId) {
        await tx.delete(approvalMatrixSteps).where(eq(approvalMatrixSteps.matrixId, payload.matrixId))
        await tx.delete(approvalMatrices).where(eq(approvalMatrices.id, payload.matrixId))
      }

      for (const entry of parsedSiteEntries) {
        const allApprovers = parsedSteps
          .filter((step) => !sectionStepIds.has(step.id))
          .map((step) => ({ role: step.label, employeeId: entry.values[step.id] }))
          .filter((a): a is { role: string; employeeId: number } => a.employeeId != null && a.employeeId > 0)

        if (allApprovers.length === 0) continue

        const sectionStep = parsedSteps.find((s) => s.label.toLowerCase().replace(/[^a-z]/g, '') === 'section')
        const sectionId = sectionStep ? entry.values[sectionStep.id] ?? null : null

        const [matrix] = await tx
          .insert(approvalMatrices)
          .values({
            name: payload.activityName,
            structureId: structure.id,
            transactionType: payload.transactionType,
            siteId: entry.siteId,
            sectionId: sectionId,
            activityType: '',
            priority: 'any',
            description: payload.notes ?? '',
            effectiveFrom,
            effectiveTo,
            isActive: payload.isActive === 'true',
            updatedAt: now,
          })
          .returning()

        if (!matrix) continue

        for (const [index, approver] of allApprovers.entries()) {
          const employeeName = employeeNameById.get(approver.employeeId) ?? approver.role
          const [node] = await tx
            .insert(orgChartNodes)
            .values({
              structureId: structure.id,
              employeeId: approver.employeeId,
              nodeCode: `${payload.templateKey}-${slug(approver.role)}-${approver.employeeId}-${entry.siteId}`,
              nodeType: 'employee',
              approvalRole: approver.role,
              canApprove: true,
              canDelegate: true,
              slaHours: 24,
              label: `${approver.role} - ${employeeName}`,
              sortOrder: index + 1,
              isActive: true,
              updatedAt: now,
            })
            .returning()

          const [step] = await tx
            .insert(approvalMatrixSteps)
            .values({
              matrixId: matrix.id,
              stepOrder: index + 1,
              label: approver.role,
              nodeId: node.id,
              approvalMode: payload.mode,
              slaHours: 24,
              canDelegate: true,
              isRequired: true,
              updatedAt: now,
            })
            .returning()

          await tx.insert(workflowStepRules).values({
            workflowVersionId: version.id,
            branchId: branch.id,
            approvalMatrixStepId: step.id,
            stepOrder: index + 1,
            label: approver.role,
            approvalMode: payload.mode,
            assignmentSource: 'matrix',
            isRequired: true,
            updatedAt: now,
          })
        }
      }

      const emailEvents = ['submitted', 'approved', 'returned_rejected', 'reminder', 'overdue']
      for (const eventType of emailEvents) {
        await tx.insert(workflowNotificationRules).values({
          workflowVersionId: version.id,
          branchId: branch.id,
          eventType,
          channel: eventType === 'submitted' ? 'in_app' : 'email',
          recipientMode: eventType === 'submitted' ? 'approver' : 'requester',
          ccMode: '',
          isActive: true,
          updatedAt: now,
        })
      }

      await tx.insert(workflowReminderRules).values([
        {
          workflowVersionId: version.id,
          stepRuleId: null,
          reminderType: 'before_due',
          offsetHours: payload.beforeDueHours,
          channel: 'email',
          isActive: true,
          updatedAt: now,
        },
        {
          workflowVersionId: version.id,
          stepRuleId: null,
          reminderType: 'overdue',
          offsetHours: payload.overdueHours,
          channel: 'email',
          isActive: true,
          updatedAt: now,
        },
      ])
    })

    await Promise.all([
      ensureEmailTemplate(
        `workflow_${templateCodeBase}_submitted`,
        `${payload.activityName} Submitted`,
        `[HERO] Approval baru {{requestNumber}}`
      ),
      ensureEmailTemplate(
        `workflow_${templateCodeBase}_approved`,
        `${payload.activityName} Approved`,
        `[HERO] Approval disetujui {{requestNumber}}`
      ),
      ensureEmailTemplate(
        `workflow_${templateCodeBase}_returned_rejected`,
        `${payload.activityName} Returned / Rejected`,
        `[HERO] Approval perlu tindak lanjut {{requestNumber}}`
      ),
      ensureEmailTemplate(
        `workflow_${templateCodeBase}_reminder`,
        `${payload.activityName} Reminder`,
        `[HERO] Reminder approval {{requestNumber}}`
      ),
      ensureEmailTemplate(
        `workflow_${templateCodeBase}_overdue`,
        `${payload.activityName} Overdue`,
        `[HERO] Approval overdue {{requestNumber}}`
      ),
    ])

    await logAuditEvent({
      actorEmail: session?.user?.email ?? undefined,
      action: 'workflow_studio.investigated',
      entityType: 'workflow_studio',
      entityLabel: payload.activityName,
      description: `Workflow approval ${payload.activityName} disimpan dari Workflow Studio.`,
    })

    revalidatePath('/dashboard/workflow-studio')
    revalidatePath('/dashboard/settings/email')
    return { status: 'success', message: 'Workflow approval berhasil disimpan.' }
  } catch (error) {
    console.error('[workflow-studio] save failed:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Workflow approval gagal disimpan.',
    }
  }
}

export async function toggleWorkflowStatusAction(
  _state: WorkflowStudioActionState,
  formData: FormData
): Promise<WorkflowStudioActionState> {
  try {
    await requireWorkflowStudioEdit()

    const templateKey = String(formData.get('templateKey') ?? '').trim()
    const transactionType = String(formData.get('transactionType') ?? '').trim()
    const newStatus = String(formData.get('newStatus') ?? '').trim()
    if (!templateKey || !transactionType || (newStatus !== 'true' && newStatus !== 'false')) {
      return { status: 'error', message: 'Parameter tidak valid.' }
    }

    const isActive = newStatus === 'true'

    const [workflow] = await db
      .select({ id: workflowTemplates.id })
      .from(workflowTemplates)
      .where(eq(workflowTemplates.templateKey, templateKey))
      .limit(1)

    if (!workflow) {
      return { status: 'error', message: 'Workflow tidak ditemukan.' }
    }

    const now = new Date()
    const effectiveFrom = isActive ? now : undefined

    await db.update(workflowTemplates).set({ isActive, updatedAt: now }).where(eq(workflowTemplates.id, workflow.id))

    const versions = await db
      .select({ id: workflowTemplateVersions.id })
      .from(workflowTemplateVersions)
      .where(eq(workflowTemplateVersions.workflowTemplateId, workflow.id))

    for (const version of versions) {
      await db
        .update(workflowTemplateVersions)
        .set({
          publishStatus: isActive ? 'published' : 'draft',
          ...(effectiveFrom ? { effectiveFrom } : {}),
        })
        .where(eq(workflowTemplateVersions.id, version.id))
    }

    await db
      .update(approvalMatrices)
      .set({
        isActive,
        updatedAt: now,
        ...(effectiveFrom ? { effectiveFrom } : {}),
      })
      .where(eq(approvalMatrices.transactionType, transactionType))

    const session = await getServerSession()
    await logAuditEvent({
      actorEmail: session?.user?.email ?? undefined,
      action: 'workflow_studio.saved',
      entityType: 'workflow_studio',
      entityLabel: templateKey,
      description: `Workflow ${templateKey} diubah ke ${isActive ? 'Active' : 'Nonactive'}.`,
    })

    revalidatePath('/dashboard/workflow-studio')
    return { status: 'success', message: `Workflow berhasil diubah ke ${isActive ? 'Active' : 'Nonactive'}.` }
  } catch (error) {
    console.error('[workflow-studio] toggle status failed:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal mengubah status workflow.',
    }
  }
}

export async function deleteWorkflowStudioWorkflowAction(
  _state: WorkflowStudioActionState,
  formData: FormData
): Promise<WorkflowStudioActionState> {
  try {
    await requireWorkflowStudioEdit()

    const templateKey = String(formData.get('templateKey') ?? '').trim()
    const transactionType = String(formData.get('transactionType') ?? '').trim()
    if (!templateKey || !transactionType) {
      return { status: 'error', message: 'Parameter tidak valid.' }
    }

    // Matrices milik workflow ini = transactionType + activityType kosong (dibuat lewat dialog).
    const matrixRows = await db
      .select({ id: approvalMatrices.id, name: approvalMatrices.name })
      .from(approvalMatrices)
      .where(
        and(
          eq(approvalMatrices.transactionType, transactionType),
          eq(approvalMatrices.activityType, '')
        )
      )
    const matrixIds = matrixRows.map((matrix) => matrix.id)

    const [workflow] = await db
      .select({ id: workflowTemplates.id, name: workflowTemplates.name })
      .from(workflowTemplates)
      .where(eq(workflowTemplates.templateKey, templateKey))
      .limit(1)

    // Jangan hapus kalau workflow sudah terpakai request approval (FK restrict).
    if (matrixIds.length > 0) {
      const usedApprovals = await db
        .select({ id: approvals.id })
        .from(approvals)
        .where(inArray(approvals.approvalMatrixId, matrixIds))
        .limit(1)
      if (usedApprovals.length > 0) {
        return {
          status: 'error',
          message:
            'Workflow ini sudah terpakai oleh request approval — tidak bisa dihapus. Nonaktifkan via kolom Status jika sudah tidak dipakai.',
        }
      }
    }

    // Jangan hapus kalau masih ada request yang sedang berjalan untuk aktivitas ini.
    const pendingSubmissions = await db
      .select({ id: formSubmissions.id })
      .from(formSubmissions)
      .innerJoin(formTemplates, eq(formSubmissions.templateId, formTemplates.id))
      .where(
        and(
          eq(formTemplates.templateKey, templateKey),
          inArray(formSubmissions.requestStatus, ['submitted', 'in_review'])
        )
      )
      .limit(1)
    if (pendingSubmissions.length > 0) {
      return {
        status: 'error',
        message:
          'Masih ada request approval yang sedang berjalan untuk aktivitas ini — tidak bisa dihapus. Tunggu sampai selesai atau nonaktifkan via kolom Status.',
      }
    }

    await db.transaction(async (tx) => {
      // Matrices (cascade menghapus approvalMatrixSteps; workflowStepRules.approvalMatrixStepId
      // otomatis set null).
      if (matrixIds.length > 0) {
        await tx.delete(approvalMatrices).where(inArray(approvalMatrices.id, matrixIds))
      }

      // Struktur org milik workflow ini (cascade menghapus orgChartNodes + assignments).
      const structures = await tx
        .select({ id: orgChartStructures.id })
        .from(orgChartStructures)
        .where(and(eq(orgChartStructures.scopeType, 'workflow'), eq(orgChartStructures.scopeValue, templateKey)))
      const structureIds = structures.map((structure) => structure.id)
      if (structureIds.length > 0) {
        await tx.delete(orgChartStructures).where(inArray(orgChartStructures.id, structureIds))
      }

      // Workflow template (cascade menghapus versi, branch, notification & reminder rules).
      if (workflow) {
        await tx.delete(workflowTemplates).where(eq(workflowTemplates.id, workflow.id))
      }
    })

    const session = await getServerSession()
    await logAuditEvent({
      actorEmail: session?.user?.email ?? undefined,
      action: 'workflow_studio.deleted',
      entityType: 'workflow_studio',
      entityLabel: templateKey,
      description: `Workflow ${workflow?.name ?? templateKey} dihapus (${matrixIds.length} konfigurasi matrix).`,
    })

    revalidatePath('/dashboard/workflow-studio')
    return {
      status: 'success',
      message: `Workflow ${workflow?.name ?? templateKey} berhasil dihapus (${matrixIds.length} konfigurasi matrix).`,
    }
  } catch (error) {
    console.error('[workflow-studio] delete workflow failed:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal menghapus workflow.',
    }
  }
}

export async function resendWorkflowStudioReminderAction(formData: FormData) {
  try {
    await requireWorkflowStudioEdit()
    const parsed = reminderSchema.safeParse({ reminderJobId: formData.get('reminderJobId') })
    if (!parsed.success) return { status: 'error' as const, message: 'Reminder tidak valid.' }

    const [job] = await db
      .select({
        id: reminderJobs.id,
        reminderType: reminderJobs.reminderType,
        inboxItemId: reminderJobs.inboxItemId,
        submissionId: inboxItems.submissionId,
        approvalId: inboxItems.approvalId,
        assigneeEmployeeId: inboxItems.assigneeEmployeeId,
        assigneeName: employees.name,
        assigneeEmail: employees.email,
      })
      .from(reminderJobs)
      .innerJoin(inboxItems, eq(reminderJobs.inboxItemId, inboxItems.id))
      .leftJoin(employees, eq(inboxItems.assigneeEmployeeId, employees.id))
      .where(eq(reminderJobs.id, parsed.data.reminderJobId))
      .limit(1)

    if (!job) return { status: 'error' as const, message: 'Reminder tidak ditemukan.' }

    const recipient = job.assigneeEmail || job.assigneeName || `employee:${job.assigneeEmployeeId ?? 'unknown'}`
    const now = new Date()
    const [event] = await db
      .insert(notificationEvents)
      .values({
        submissionId: job.submissionId,
        inboxItemId: job.inboxItemId,
        approvalId: job.approvalId,
        channel: 'in_app',
        eventType: `manual_${job.reminderType}`,
        recipient,
        payloadSnapshot: JSON.stringify({
          title: 'Manual approval reminder',
          body: 'Approval masih pending dan perlu ditindaklanjuti.',
          url: '/dashboard/approval',
        }),
        deliveryStatus: 'delivered',
        deliveredAt: now,
      })
      .returning()

    await db.insert(notificationDeliveries).values({
      notificationEventId: event.id,
      deliveryChannel: 'in_app',
      recipient,
      status: 'delivered',
      sentAt: now,
    })

    await db
      .update(reminderJobs)
      .set({
        executionLog: `Manual reminder resent at ${now.toISOString()}.`,
        updatedAt: now,
      })
      .where(eq(reminderJobs.id, job.id))

    const session = await getServerSession()
    await logAuditEvent({
      actorEmail: session?.user?.email ?? undefined,
      action: 'workflow_studio.reminder_resent',
      entityType: 'workflow_studio_reminder',
      entityLabel: `Reminder ${job.id}`,
      description: `Manual reminder dikirim ulang untuk inbox ${job.inboxItemId}.`,
    })

    revalidatePath('/dashboard/workflow-studio')
    return { status: 'success' as const, message: 'Reminder dikirim ulang ke notification bell.' }
  } catch (error) {
    console.error('[workflow-studio] resend reminder failed:', error)
    return { status: 'error' as const, message: 'Reminder gagal dikirim ulang.' }
  }
}

export async function markWorkflowStudioInvestigatedAction(formData: FormData) {
  try {
    await requireWorkflowStudioEdit()
    const parsed = investigateSchema.safeParse({
      submissionId: formData.get('submissionId'),
      requestId: formData.get('requestId'),
    })
    if (!parsed.success) return { status: 'error' as const, message: 'Request tidak valid.' }

    const session = await getServerSession()
    await logAuditEvent({
      actorEmail: session?.user?.email ?? undefined,
      action: 'workflow_studio.saved',
      entityType: 'workflow_studio_monitoring',
      entityLabel: parsed.data.requestId,
      description: `Approval request ${parsed.data.requestId} ditandai sudah diinvestigasi dari Workflow Studio.`,
    })

    revalidatePath('/dashboard/workflow-studio')
    return { status: 'success' as const, message: 'Request ditandai investigated.' }
  } catch (error) {
    console.error('[workflow-studio] investigate failed:', error)
    return { status: 'error' as const, message: 'Gagal menandai investigated.' }
  }
}
