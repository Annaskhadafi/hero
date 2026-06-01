'use server'

import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import {
  auditLogs,
  checklistTemplateRevisionItems,
  checklistTemplateRevisions,
  checklistTemplates,
  dailyChecklistAnswers,
  dailyChecklists,
  employees,
} from '@/db/schema/hero'
import { logAuditEvent } from '@/lib/audit-logger'
import { getServerSession } from '@/lib/auth-session'

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect
export type ChecklistTemplateRevision = typeof checklistTemplateRevisions.$inferSelect
export type ChecklistTemplateRevisionItem = typeof checklistTemplateRevisionItems.$inferSelect
export type DailyChecklist = typeof dailyChecklists.$inferSelect
export type DailyChecklistAnswer = typeof dailyChecklistAnswers.$inferSelect

export type ChecklistInputType = 'yes_no_na' | 'scale_1_5' | 'free_text'

type Actor = {
  employeeId: number | null
  name: string
  email: string | null
}

async function getActor(): Promise<Actor> {
  const session = await getServerSession()
  const email = session?.user?.email?.toLowerCase().trim() ?? null
  const name = session?.user?.name ?? 'System'

  if (!email) {
    return { employeeId: null, name, email: null }
  }

  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.email, email))
    .limit(1)

  return { employeeId: employee?.id ?? null, name, email }
}

function normalizeChecklistInputType(value: string): ChecklistInputType | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')
  if (normalized === 'yes_no_na' || normalized === 'yes/no/na' || normalized === 'yes-no-na')
    return 'yes_no_na'
  if (
    normalized === 'scale_1_5' ||
    normalized === 'scale1_5' ||
    normalized === 'scale_1-5' ||
    normalized === 'scale 1-5'
  )
    return 'scale_1_5'
  if (
    normalized === 'free_text' ||
    normalized === 'freetext' ||
    normalized === 'text' ||
    normalized === 'textarea'
  )
    return 'free_text'
  return null
}

export async function getChecklistTemplatesWithLatestRevision() {
  const latest = db
    .select({
      templateId: checklistTemplateRevisions.templateId,
      maxRevision: sql<number>`max(${checklistTemplateRevisions.revisionNumber})`.as(
        'max_revision'
      ),
    })
    .from(checklistTemplateRevisions)
    .groupBy(checklistTemplateRevisions.templateId)
    .as('latest_template_revision')

  const rows = await db
    .select({
      templateId: checklistTemplates.id,
      templateTitle: checklistTemplates.title,
      templateDescription: checklistTemplates.description,
      templateCreatedAt: checklistTemplates.createdAt,
      templateUpdatedAt: checklistTemplates.updatedAt,
      latestRevisionId: checklistTemplateRevisions.id,
      latestRevisionNumber: checklistTemplateRevisions.revisionNumber,
      latestRevisionCreatedAt: checklistTemplateRevisions.createdAt,
      itemCount: sql<number>`count(${checklistTemplateRevisionItems.id})`.as('item_count'),
    })
    .from(checklistTemplates)
    .innerJoin(latest, eq(latest.templateId, checklistTemplates.id))
    .innerJoin(
      checklistTemplateRevisions,
      and(
        eq(checklistTemplateRevisions.templateId, checklistTemplates.id),
        eq(checklistTemplateRevisions.revisionNumber, latest.maxRevision)
      )
    )
    .leftJoin(
      checklistTemplateRevisionItems,
      eq(checklistTemplateRevisionItems.revisionId, checklistTemplateRevisions.id)
    )
    .where(eq(checklistTemplates.isActive, true))
    .groupBy(
      checklistTemplates.id,
      checklistTemplateRevisions.id,
      checklistTemplateRevisions.revisionNumber,
      checklistTemplateRevisions.createdAt
    )
    .orderBy(desc(checklistTemplates.updatedAt))

  return rows
}

export async function getChecklistTemplateRevisionDetail(revisionId: number) {
  const [revision] = await db
    .select({
      id: checklistTemplateRevisions.id,
      templateId: checklistTemplateRevisions.templateId,
      revisionNumber: checklistTemplateRevisions.revisionNumber,
      title: checklistTemplateRevisions.title,
      description: checklistTemplateRevisions.description,
      createdAt: checklistTemplateRevisions.createdAt,
    })
    .from(checklistTemplateRevisions)
    .where(eq(checklistTemplateRevisions.id, revisionId))
    .limit(1)

  if (!revision) {
    throw new Error('Template tidak ditemukan.')
  }

  const items = await db
    .select({
      id: checklistTemplateRevisionItems.id,
      revisionId: checklistTemplateRevisionItems.revisionId,
      orderIndex: checklistTemplateRevisionItems.orderIndex,
      prompt: checklistTemplateRevisionItems.prompt,
      inputType: checklistTemplateRevisionItems.inputType,
      options: checklistTemplateRevisionItems.options,
      isRequired: checklistTemplateRevisionItems.isRequired,
    })
    .from(checklistTemplateRevisionItems)
    .where(eq(checklistTemplateRevisionItems.revisionId, revisionId))
    .orderBy(checklistTemplateRevisionItems.orderIndex)

  return { revision, items }
}

export async function createChecklistTemplate(params: {
  title: string
  description?: string
  items: Array<{ prompt: string; inputType: ChecklistInputType; isRequired?: boolean }>
}) {
  const actor = await getActor()

  const title = params.title.trim()
  if (!title) {
    throw new Error('Nama checklist wajib diisi.')
  }

  const items = params.items
    .map((item, index) => ({
      orderIndex: index,
      prompt: item.prompt.trim(),
      inputType: item.inputType,
      isRequired: item.isRequired ?? true,
      options:
        item.inputType === 'scale_1_5'
          ? { choices: [1, 2, 3, 4, 5] }
          : item.inputType === 'yes_no_na'
            ? { choices: ['yes', 'no', 'na'] }
            : null,
    }))
    .filter((item) => item.prompt.length > 0)

  if (items.length === 0) {
    throw new Error('Minimal 1 poin pemeriksaan wajib dibuat.')
  }

  const record = await db.transaction(async (tx) => {
    const [template] = await tx
      .insert(checklistTemplates)
      .values({
        title,
        description: params.description?.trim() ?? '',
        createdByEmployeeId: actor.employeeId,
        updatedAt: new Date(),
      })
      .returning()

    const [revision] = await tx
      .insert(checklistTemplateRevisions)
      .values({
        templateId: template.id,
        revisionNumber: 1,
        title,
        description: params.description?.trim() ?? '',
        createdByEmployeeId: actor.employeeId,
      })
      .returning()

    await tx.insert(checklistTemplateRevisionItems).values(
      items.map((item) => ({
        revisionId: revision.id,
        orderIndex: item.orderIndex,
        prompt: item.prompt,
        inputType: item.inputType,
        options: item.options ?? undefined,
        isRequired: item.isRequired,
        updatedAt: new Date(),
      }))
    )

    return { template, revision }
  })

  await logAuditEvent({
    actorEmail: actor.email ?? undefined,
    action: 'checklist_template.created',
    entityType: 'checklist_template',
    entityLabel: `template:${record.template.id}`,
    description: `Membuat template checklist "${title}" (rev 1).`,
    severity: 'info',
  })

  revalidatePath('/dashboard/hse/checklist-generator')
  return record
}

export async function updateChecklistTemplate(params: {
  templateId: number
  title: string
  description?: string
  items: Array<{ prompt: string; inputType: ChecklistInputType; isRequired?: boolean }>
}) {
  const actor = await getActor()

  const title = params.title.trim()
  if (!title) {
    throw new Error('Nama checklist wajib diisi.')
  }

  const items = params.items
    .map((item, index) => ({
      orderIndex: index,
      prompt: item.prompt.trim(),
      inputType: item.inputType,
      isRequired: item.isRequired ?? true,
      options:
        item.inputType === 'scale_1_5'
          ? { choices: [1, 2, 3, 4, 5] }
          : item.inputType === 'yes_no_na'
            ? { choices: ['yes', 'no', 'na'] }
            : null,
    }))
    .filter((item) => item.prompt.length > 0)

  if (items.length === 0) {
    throw new Error('Minimal 1 poin pemeriksaan wajib dibuat.')
  }

  const record = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: checklistTemplates.id,
      })
      .from(checklistTemplates)
      .where(
        and(eq(checklistTemplates.id, params.templateId), eq(checklistTemplates.isActive, true))
      )
      .limit(1)

    if (!existing) {
      throw new Error('Template tidak ditemukan.')
    }

    const [latestRevision] = await tx
      .select({ revisionNumber: checklistTemplateRevisions.revisionNumber })
      .from(checklistTemplateRevisions)
      .where(eq(checklistTemplateRevisions.templateId, params.templateId))
      .orderBy(desc(checklistTemplateRevisions.revisionNumber))
      .limit(1)

    const nextRevisionNumber = (latestRevision?.revisionNumber ?? 0) + 1

    await tx
      .update(checklistTemplates)
      .set({
        title,
        description: params.description?.trim() ?? '',
        updatedAt: new Date(),
      })
      .where(eq(checklistTemplates.id, params.templateId))

    const [revision] = await tx
      .insert(checklistTemplateRevisions)
      .values({
        templateId: params.templateId,
        revisionNumber: nextRevisionNumber,
        title,
        description: params.description?.trim() ?? '',
        createdByEmployeeId: actor.employeeId,
      })
      .returning()

    await tx.insert(checklistTemplateRevisionItems).values(
      items.map((item) => ({
        revisionId: revision.id,
        orderIndex: item.orderIndex,
        prompt: item.prompt,
        inputType: item.inputType,
        options: item.options ?? undefined,
        isRequired: item.isRequired,
        updatedAt: new Date(),
      }))
    )

    return { revision }
  })

  await logAuditEvent({
    actorEmail: actor.email ?? undefined,
    action: 'checklist_template.updated',
    entityType: 'checklist_template',
    entityLabel: `template:${params.templateId}`,
    description: `Update template checklist "${title}" (rev ${record.revision.revisionNumber}).`,
    severity: 'info',
  })

  revalidatePath('/dashboard/hse/checklist-generator')
  return record
}

export async function deleteChecklistTemplate(templateId: number) {
  const actor = await getActor()

  await db
    .update(checklistTemplates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(checklistTemplates.id, templateId))

  await logAuditEvent({
    actorEmail: actor.email ?? undefined,
    action: 'checklist_template.deleted',
    entityType: 'checklist_template',
    entityLabel: `template:${templateId}`,
    description: 'Menonaktifkan template checklist.',
    severity: 'warning',
  })

  revalidatePath('/dashboard/hse/checklist-generator')
  return { success: true }
}

export async function getDailyChecklistHistory() {
  return db
    .select({
      id: dailyChecklists.id,
      titleSnapshot: dailyChecklists.titleSnapshot,
      area: dailyChecklists.area,
      status: dailyChecklists.status,
      scorePercent: dailyChecklists.scorePercent,
      createdAt: dailyChecklists.createdAt,
      completedAt: dailyChecklists.completedAt,
      responsibleName: employees.name,
    })
    .from(dailyChecklists)
    .leftJoin(employees, eq(dailyChecklists.responsibleEmployeeId, employees.id))
    .where(eq(dailyChecklists.isActive, true))
    .orderBy(desc(dailyChecklists.createdAt))
}

export async function getChecklistAuditLogs() {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityLabel: auditLogs.entityLabel,
      description: auditLogs.description,
      severity: auditLogs.severity,
      createdAt: auditLogs.createdAt,
      actorName: employees.name,
    })
    .from(auditLogs)
    .leftJoin(employees, eq(auditLogs.actorEmployeeId, employees.id))
    .where(inArray(auditLogs.entityType, ['checklist_template', 'daily_checklist']))
    .orderBy(desc(auditLogs.createdAt))
    .limit(500)
}

export async function createDailyChecklistFromTemplate(params: {
  templateId: number
  templateRevisionId: number
  area: string
}) {
  const actor = await getActor()

  const area = params.area.trim()
  if (!area) {
    throw new Error('Lokasi/area wajib diisi.')
  }

  const [revision] = await db
    .select({
      id: checklistTemplateRevisions.id,
      templateId: checklistTemplateRevisions.templateId,
      title: checklistTemplateRevisions.title,
      description: checklistTemplateRevisions.description,
    })
    .from(checklistTemplateRevisions)
    .where(
      and(
        eq(checklistTemplateRevisions.id, params.templateRevisionId),
        eq(checklistTemplateRevisions.templateId, params.templateId)
      )
    )
    .limit(1)

  if (!revision) {
    throw new Error('Template revision tidak ditemukan.')
  }

  const [created] = await db
    .insert(dailyChecklists)
    .values({
      templateId: revision.templateId,
      templateRevisionId: revision.id,
      titleSnapshot: revision.title,
      descriptionSnapshot: revision.description ?? '',
      area,
      responsibleEmployeeId: actor.employeeId,
      status: 'in_progress',
      updatedAt: new Date(),
    })
    .returning()

  await logAuditEvent({
    actorEmail: actor.email ?? undefined,
    action: 'checklist.created',
    entityType: 'daily_checklist',
    entityLabel: `checklist:${created.id}`,
    description: `Membuat checklist harian dari template "${revision.title}" untuk area "${area}".`,
    severity: 'info',
  })

  revalidatePath('/dashboard/hse/checklist-generator')
  return created
}

function computeChecklistScore(params: {
  items: Array<{ id: number; inputType: string; isRequired: boolean }>
  answersByItemId: Map<
    number,
    { inputType: string; valueChoice: string; valueText: string; valueNumber: number | null }
  >
}) {
  let numerator = 0
  let denominator = 0

  for (const item of params.items) {
    const inputType = item.inputType as ChecklistInputType
    const answer = params.answersByItemId.get(item.id)

    if (inputType === 'free_text') {
      continue
    }

    if (inputType === 'yes_no_na') {
      const choice = (answer?.valueChoice ?? '').toLowerCase()
      if (choice === 'na') {
        continue
      }
      denominator += 1
      if (choice === 'yes') {
        numerator += 1
      }
      continue
    }

    if (inputType === 'scale_1_5') {
      denominator += 1
      const value = answer?.valueNumber
      if (value != null && value >= 1 && value <= 5) {
        numerator += value / 5
      }
      continue
    }
  }

  if (denominator <= 0) {
    return null
  }

  return Math.round((numerator / denominator) * 100)
}

function validateChecklistCompletion(params: {
  items: Array<{ id: number; inputType: string; isRequired: boolean }>
  answersByItemId: Map<
    number,
    { valueChoice: string; valueText: string; valueNumber: number | null }
  >
}) {
  const missing: number[] = []

  for (const item of params.items) {
    if (!item.isRequired) continue

    const inputType = item.inputType as ChecklistInputType
    const answer = params.answersByItemId.get(item.id)

    if (inputType === 'free_text') {
      if (!answer?.valueText?.trim()) missing.push(item.id)
      continue
    }

    if (inputType === 'yes_no_na') {
      if (!answer?.valueChoice?.trim()) missing.push(item.id)
      continue
    }

    if (inputType === 'scale_1_5') {
      const value = answer?.valueNumber
      if (value == null || value < 1 || value > 5) missing.push(item.id)
      continue
    }
  }

  if (missing.length > 0) {
    throw new Error(
      'Checklist belum lengkap. Pastikan semua poin wajib sudah terisi sebelum diselesaikan.'
    )
  }
}

export async function saveDailyChecklistAnswers(params: {
  checklistId: number
  status?: 'in_progress' | 'completed'
  area?: string
  answers: Array<
    | { revisionItemId: number; inputType: 'yes_no_na'; valueChoice: 'yes' | 'no' | 'na' | ''; attachments?: string[] }
    | { revisionItemId: number; inputType: 'scale_1_5'; valueNumber: number | null; attachments?: string[] }
    | { revisionItemId: number; inputType: 'free_text'; valueText: string; attachments?: string[] }
  >
}) {
  const actor = await getActor()

  const [checklist] = await db
    .select({
      id: dailyChecklists.id,
      templateRevisionId: dailyChecklists.templateRevisionId,
      status: dailyChecklists.status,
      isActive: dailyChecklists.isActive,
      titleSnapshot: dailyChecklists.titleSnapshot,
      area: dailyChecklists.area,
      completedAt: dailyChecklists.completedAt,
    })
    .from(dailyChecklists)
    .where(and(eq(dailyChecklists.id, params.checklistId), eq(dailyChecklists.isActive, true)))
    .limit(1)

  if (!checklist) {
    throw new Error('Checklist tidak ditemukan.')
  }

  if (!checklist.templateRevisionId) {
    throw new Error('Checklist tidak memiliki template revision.')
  }

  const revisionItemIds = params.answers.map((answer) => answer.revisionItemId)
  const allowedItems = await db
    .select({
      id: checklistTemplateRevisionItems.id,
      inputType: checklistTemplateRevisionItems.inputType,
      isRequired: checklistTemplateRevisionItems.isRequired,
    })
    .from(checklistTemplateRevisionItems)
    .where(
      and(
        eq(checklistTemplateRevisionItems.revisionId, checklist.templateRevisionId),
        inArray(checklistTemplateRevisionItems.id, revisionItemIds)
      )
    )

  const allowedItemIdSet = new Set(allowedItems.map((item) => item.id))
  const invalid = revisionItemIds.filter((id) => !allowedItemIdSet.has(id))
  if (invalid.length > 0) {
    throw new Error('Ada poin checklist yang tidak valid untuk template ini.')
  }

  await db.transaction(async (tx) => {
    for (const answer of params.answers) {
      const base = {
        checklistId: params.checklistId,
        revisionItemId: answer.revisionItemId,
        inputType: answer.inputType,
        updatedAt: new Date(),
      }

      const values =
        answer.inputType === 'yes_no_na'
          ? {
              ...base,
              valueChoice: answer.valueChoice ?? '',
              valueText: '',
              valueNumber: null,
              attachments: answer.attachments ?? [],
            }
          : answer.inputType === 'scale_1_5'
            ? {
                ...base,
                valueChoice: '',
                valueText: '',
                valueNumber: answer.valueNumber ?? null,
                attachments: answer.attachments ?? [],
              }
            : {
                ...base,
                valueChoice: '',
                valueText: answer.valueText ?? '',
                valueNumber: null,
                attachments: answer.attachments ?? [],
              }

      const [existing] = await tx
        .select({ id: dailyChecklistAnswers.id })
        .from(dailyChecklistAnswers)
        .where(
          and(
            eq(dailyChecklistAnswers.checklistId, params.checklistId),
            eq(dailyChecklistAnswers.revisionItemId, answer.revisionItemId)
          )
        )
        .limit(1)

      if (existing) {
        await tx
          .update(dailyChecklistAnswers)
          .set(values)
          .where(eq(dailyChecklistAnswers.id, existing.id))
      } else {
        await tx.insert(dailyChecklistAnswers).values({ ...values, createdAt: new Date() })
      }
    }
  })

  const allItems = await db
    .select({
      id: checklistTemplateRevisionItems.id,
      inputType: checklistTemplateRevisionItems.inputType,
      isRequired: checklistTemplateRevisionItems.isRequired,
      orderIndex: checklistTemplateRevisionItems.orderIndex,
    })
    .from(checklistTemplateRevisionItems)
    .where(eq(checklistTemplateRevisionItems.revisionId, checklist.templateRevisionId))
    .orderBy(checklistTemplateRevisionItems.orderIndex)

  const answers = await db
    .select({
      revisionItemId: dailyChecklistAnswers.revisionItemId,
      inputType: dailyChecklistAnswers.inputType,
      valueChoice: dailyChecklistAnswers.valueChoice,
      valueText: dailyChecklistAnswers.valueText,
      valueNumber: dailyChecklistAnswers.valueNumber,
      attachments: dailyChecklistAnswers.attachments,
    })
    .from(dailyChecklistAnswers)
    .where(eq(dailyChecklistAnswers.checklistId, params.checklistId))

  const answersByItemId = new Map(
    answers.map((answer) => [
      answer.revisionItemId,
      {
        inputType: answer.inputType,
        valueChoice: answer.valueChoice,
        valueText: answer.valueText,
        valueNumber: answer.valueNumber ?? null,
        attachments: (answer.attachments as string[]) ?? [],
      },
    ])
  )

  const scorePercent = computeChecklistScore({
    items: allItems.map((item) => ({
      id: item.id,
      inputType: item.inputType,
      isRequired: item.isRequired,
    })),
    answersByItemId,
  })

  if (params.status === 'completed') {
    validateChecklistCompletion({
      items: allItems.map((item) => ({
        id: item.id,
        inputType: item.inputType,
        isRequired: item.isRequired,
      })),
      answersByItemId,
    })
  }

  await db
    .update(dailyChecklists)
    .set({
      status: params.status ?? 'in_progress',
      scorePercent,
      area: typeof params.area === 'string' ? params.area.trim() : checklist.area,
      responsibleEmployeeId: actor.employeeId,
      completedAt: params.status === 'completed' ? new Date() : checklist.completedAt,
      updatedAt: new Date(),
    })
    .where(eq(dailyChecklists.id, params.checklistId))

  await logAuditEvent({
    actorEmail: actor.email ?? undefined,
    action: params.status === 'completed' ? 'checklist.completed' : 'checklist.updated',
    entityType: 'daily_checklist',
    entityLabel: `checklist:${params.checklistId}`,
    description:
      params.status === 'completed'
        ? `Checklist "${checklist.titleSnapshot}" diselesaikan.`
        : `Update jawaban checklist "${checklist.titleSnapshot}".`,
    severity: 'info',
  })

  revalidatePath('/dashboard/hse/checklist-generator')
  return { success: true, scorePercent }
}

export async function deleteDailyChecklist(checklistId: number) {
  const actor = await getActor()

  await db
    .update(dailyChecklists)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(dailyChecklists.id, checklistId))

  await logAuditEvent({
    actorEmail: actor.email ?? undefined,
    action: 'checklist.deleted',
    entityType: 'daily_checklist',
    entityLabel: `checklist:${checklistId}`,
    description: 'Menonaktifkan checklist harian.',
    severity: 'warning',
  })

  revalidatePath('/dashboard/hse/checklist-generator')
  return { success: true }
}

export async function getDailyChecklistReportData(checklistId: number) {
  const [header] = await db
    .select({
      id: dailyChecklists.id,
      titleSnapshot: dailyChecklists.titleSnapshot,
      descriptionSnapshot: dailyChecklists.descriptionSnapshot,
      area: dailyChecklists.area,
      status: dailyChecklists.status,
      scorePercent: dailyChecklists.scorePercent,
      createdAt: dailyChecklists.createdAt,
      completedAt: dailyChecklists.completedAt,
      templateRevisionId: dailyChecklists.templateRevisionId,
      responsibleName: employees.name,
      responsibleEmail: employees.email,
      responsibleRole: employees.accessRole,
    })
    .from(dailyChecklists)
    .leftJoin(employees, eq(dailyChecklists.responsibleEmployeeId, employees.id))
    .where(and(eq(dailyChecklists.id, checklistId), eq(dailyChecklists.isActive, true)))
    .limit(1)

  if (!header) {
    throw new Error('Checklist tidak ditemukan.')
  }

  if (!header.templateRevisionId) {
    throw new Error('Template revision tidak ditemukan.')
  }

  const items = await db
    .select({
      id: checklistTemplateRevisionItems.id,
      orderIndex: checklistTemplateRevisionItems.orderIndex,
      prompt: checklistTemplateRevisionItems.prompt,
      inputType: checklistTemplateRevisionItems.inputType,
      options: checklistTemplateRevisionItems.options,
      isRequired: checklistTemplateRevisionItems.isRequired,
    })
    .from(checklistTemplateRevisionItems)
    .where(eq(checklistTemplateRevisionItems.revisionId, header.templateRevisionId))
    .orderBy(checklistTemplateRevisionItems.orderIndex)

  const answers = await db
    .select({
      revisionItemId: dailyChecklistAnswers.revisionItemId,
      inputType: dailyChecklistAnswers.inputType,
      valueChoice: dailyChecklistAnswers.valueChoice,
      valueText: dailyChecklistAnswers.valueText,
      valueNumber: dailyChecklistAnswers.valueNumber,
      attachments: dailyChecklistAnswers.attachments,
    })
    .from(dailyChecklistAnswers)
    .where(eq(dailyChecklistAnswers.checklistId, checklistId))

  const answersByItemId = new Map(answers.map((answer) => [
    answer.revisionItemId, 
    {
      ...answer,
      attachments: (answer.attachments as string[]) ?? []
    }
  ]))

  return {
    header,
    items: items.map((item) => ({
      ...item,
      answer: answersByItemId.get(item.id) ?? null,
    })),
  }
}

export async function logDailyChecklistAccess(params: {
  checklistId: number
  event: 'viewed' | 'pdf_downloaded' | 'printed'
}) {
  const actor = await getActor()
  const action =
    params.event === 'viewed'
      ? 'checklist.viewed'
      : params.event === 'printed'
        ? 'checklist.printed'
        : 'checklist.pdf_downloaded'

  await logAuditEvent({
    actorEmail: actor.email ?? undefined,
    action,
    entityType: 'daily_checklist',
    entityLabel: `checklist:${params.checklistId}`,
    description: `Akses checklist event: ${params.event}.`,
    severity: 'info',
  })

  return { success: true }
}

export async function importChecklistTemplates(params: {
  rows: Array<{
    templateTitle: string
    templateDescription?: string
    itemPrompt: string
    itemType: string
    itemOrder?: number | null
  }>
}) {
  const actor = await getActor()

  const grouped = new Map<
    string,
    {
      title: string
      description: string
      items: Array<{ prompt: string; inputType: ChecklistInputType; orderIndex: number }>
    }
  >()

  for (const row of params.rows) {
    const title = row.templateTitle.trim()
    if (!title) {
      continue
    }

    const inputType = normalizeChecklistInputType(row.itemType ?? '')
    if (!inputType) {
      throw new Error(`Tipe item tidak valid untuk template "${title}".`)
    }

    const prompt = row.itemPrompt.trim()
    if (!prompt) {
      continue
    }

    const entry = grouped.get(title) ?? {
      title,
      description: row.templateDescription?.trim() ?? '',
      items: [],
    }

    entry.items.push({
      prompt,
      inputType,
      orderIndex:
        row.itemOrder != null && Number.isFinite(row.itemOrder)
          ? Number(row.itemOrder)
          : entry.items.length,
    })

    grouped.set(title, entry)
  }

  if (grouped.size === 0) {
    throw new Error('Tidak ada data import yang valid.')
  }

  const imported: Array<{ templateTitle: string; mode: 'created' | 'revised' }> = []

  await db.transaction(async (tx) => {
    for (const entry of grouped.values()) {
      const [existing] = await tx
        .select({ id: checklistTemplates.id })
        .from(checklistTemplates)
        .where(
          and(eq(checklistTemplates.title, entry.title), eq(checklistTemplates.isActive, true))
        )
        .limit(1)

      const items = entry.items
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item, index) => ({
          orderIndex: index,
          prompt: item.prompt,
          inputType: item.inputType,
          options:
            item.inputType === 'scale_1_5'
              ? { choices: [1, 2, 3, 4, 5] }
              : item.inputType === 'yes_no_na'
                ? { choices: ['yes', 'no', 'na'] }
                : undefined,
          isRequired: true,
        }))

      if (!existing) {
        const [template] = await tx
          .insert(checklistTemplates)
          .values({
            title: entry.title,
            description: entry.description,
            createdByEmployeeId: actor.employeeId,
            updatedAt: new Date(),
          })
          .returning()

        const [revision] = await tx
          .insert(checklistTemplateRevisions)
          .values({
            templateId: template.id,
            revisionNumber: 1,
            title: entry.title,
            description: entry.description,
            createdByEmployeeId: actor.employeeId,
          })
          .returning()

        await tx.insert(checklistTemplateRevisionItems).values(
          items.map((item) => ({
            revisionId: revision.id,
            orderIndex: item.orderIndex,
            prompt: item.prompt,
            inputType: item.inputType,
            options: item.options,
            isRequired: item.isRequired,
            updatedAt: new Date(),
          }))
        )

        imported.push({ templateTitle: entry.title, mode: 'created' })
        continue
      }

      const [latestRevision] = await tx
        .select({ revisionNumber: checklistTemplateRevisions.revisionNumber })
        .from(checklistTemplateRevisions)
        .where(eq(checklistTemplateRevisions.templateId, existing.id))
        .orderBy(desc(checklistTemplateRevisions.revisionNumber))
        .limit(1)

      const nextRevisionNumber = (latestRevision?.revisionNumber ?? 0) + 1

      await tx
        .update(checklistTemplates)
        .set({
          description: entry.description,
          updatedAt: new Date(),
        })
        .where(eq(checklistTemplates.id, existing.id))

      const [revision] = await tx
        .insert(checklistTemplateRevisions)
        .values({
          templateId: existing.id,
          revisionNumber: nextRevisionNumber,
          title: entry.title,
          description: entry.description,
          createdByEmployeeId: actor.employeeId,
        })
        .returning()

      await tx.insert(checklistTemplateRevisionItems).values(
        items.map((item) => ({
          revisionId: revision.id,
          orderIndex: item.orderIndex,
          prompt: item.prompt,
          inputType: item.inputType,
          options: item.options,
          isRequired: item.isRequired,
          updatedAt: new Date(),
        }))
      )

      imported.push({ templateTitle: entry.title, mode: 'revised' })
    }
  })

  await logAuditEvent({
    actorEmail: actor.email ?? undefined,
    action: 'checklist_template.updated',
    entityType: 'checklist_template',
    entityLabel: 'import',
    description: `Import template checklist: ${imported.length} template diproses.`,
    severity: 'info',
  })

  revalidatePath('/dashboard/hse/checklist-generator')
  return { success: true, importedCount: imported.length }
}
