'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  approvalMatrices,
  approvalMatrixSteps,
  emailTemplates,
  employees,
  inboxItems,
  notificationDeliveries,
  notificationEvents,
  orgChartNodes,
  orgChartStructures,
  reminderJobs,
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

const approvalBuilderSchema = z.object({
  matrixId: z.coerce.number().int().positive().optional(),
  menuKey: z.string().trim().min(1),
  templateKey: z.string().trim().min(1).max(100),
  transactionType: z.string().trim().min(1).max(100),
  activityName: z.string().trim().min(1).max(160),
  mode: z.string().trim().min(1).max(80).default('sequential'),
  siteId: z.coerce.number().int().positive(),
  effectiveFrom: z.string().trim().optional(),
  effectiveTo: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
  isActive: z.enum(['true', 'false']).default('true'),
  leaderId: z.coerce.number().int().positive().optional(),
  pjoId: z.coerce.number().int().positive().optional(),
  sectionHeadId: z.coerce.number().int().positive().optional(),
  departmentHeadId: z.coerce.number().int().positive().optional(),
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
    const selectedApprovers = [
      { role: 'Leader', employeeId: payload.leaderId },
      { role: 'PJO', employeeId: payload.pjoId },
      { role: 'Section Head', employeeId: payload.sectionHeadId },
      { role: 'Department Head', employeeId: payload.departmentHeadId },
    ].filter((item): item is { role: string; employeeId: number } => Boolean(item.employeeId))

    if (selectedApprovers.length === 0) {
      return { status: 'error', message: 'Minimal satu approver wajib dipilih.' }
    }

    const activeApprovers = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(eq(employees.isActive, true))
    const activeApproverIds = new Set(activeApprovers.map((employee) => employee.id))
    if (selectedApprovers.some((approver) => !activeApproverIds.has(approver.employeeId))) {
      return { status: 'error', message: 'Approver harus karyawan aktif.' }
    }

    if (payload.isActive === 'true') {
      const duplicates = await db
        .select({ id: approvalMatrices.id, name: approvalMatrices.name })
        .from(approvalMatrices)
        .where(
          and(
            eq(approvalMatrices.isActive, true),
            eq(approvalMatrices.transactionType, payload.transactionType),
            eq(approvalMatrices.siteId, payload.siteId),
            eq(approvalMatrices.activityType, '')
          )
        )
      const duplicate = duplicates.find((row) => row.id !== payload.matrixId)

      if (duplicate) {
        return {
          status: 'error',
          message: `Workflow aktif sudah ada: ${duplicate.name}. Edit existing, jangan buat duplikat.`,
          existingMatrixId: duplicate.id,
        }
      }
    }

    const session = await getServerSession()
    const now = new Date()
    const effectiveFrom = parseOptionalDate(payload.effectiveFrom) ?? now
    const effectiveTo = parseOptionalDate(payload.effectiveTo)
    const templateCodeBase = slug(payload.templateKey || payload.menuKey)

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

      const [matrix] = payload.matrixId
        ? await tx
            .update(approvalMatrices)
            .set({
              name: payload.activityName,
              structureId: structure.id,
              transactionType: payload.transactionType,
              siteId: payload.siteId,
              activityType: '',
              priority: 'any',
              description: payload.notes ?? '',
              effectiveFrom,
              effectiveTo,
              isActive: payload.isActive === 'true',
              updatedAt: now,
            })
            .where(eq(approvalMatrices.id, payload.matrixId))
            .returning()
        : await tx
            .insert(approvalMatrices)
            .values({
              name: payload.activityName,
              structureId: structure.id,
              transactionType: payload.transactionType,
              siteId: payload.siteId,
              activityType: '',
              priority: 'any',
              description: payload.notes ?? '',
              effectiveFrom,
              effectiveTo,
              isActive: payload.isActive === 'true',
              updatedAt: now,
            })
            .returning()

      if (!matrix) {
        throw new Error('Approval matrix tidak ditemukan untuk diedit.')
      }

      if (payload.matrixId) {
        await tx.delete(approvalMatrixSteps).where(eq(approvalMatrixSteps.matrixId, payload.matrixId))
      }

      for (const [index, approver] of selectedApprovers.entries()) {
        const employeeName =
          activeApprovers.find((employee) => employee.id === approver.employeeId)?.name ?? approver.role
        const [node] = await tx
          .insert(orgChartNodes)
          .values({
            structureId: structure.id,
            employeeId: approver.employeeId,
            nodeCode: `${payload.templateKey}-${slug(approver.role)}-${approver.employeeId}`,
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
