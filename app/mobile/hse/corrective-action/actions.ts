'use server'

import { desc, eq, or } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { employees, hseCorrectiveActions } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission, hasGlobalDataAccess } from '@/lib/hero-access'

async function requireCorrectivePermission(action: 'view' | 'edit' | 'delete') {
  const permission = await getCurrentMenuPermission('hse_incident_report')
  const allowed =
    action === 'view'
      ? permission.canView
      : action === 'delete'
        ? permission.canDelete
        : permission.canEdit
  if (!allowed) throw new Error('Role Anda tidak punya akses Corrective Action.')
  return {
    permission,
    hasGlobalScope: hasGlobalDataAccess(permission),
  }
}

type CorrectiveAccess = Awaited<ReturnType<typeof requireCorrectivePermission>>

async function ensureCorrectiveTable() {
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS hero_hse_corrective_actions (
      id serial PRIMARY KEY,
      source_type text NOT NULL,
      source_id text NOT NULL DEFAULT '',
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      action_plan text NOT NULL DEFAULT '',
      assignee_name text NOT NULL DEFAULT '',
      due_date timestamp,
      priority text NOT NULL DEFAULT 'Medium',
      status text NOT NULL DEFAULT 'Open',
      close_out_note text NOT NULL DEFAULT '',
      evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_by_employee_id integer REFERENCES hero_employees(id) ON DELETE SET NULL,
      closed_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `)
  )
}

async function getActorEmployeeId() {
  const session = await getServerSession()
  const userId = session?.user?.id
  const email = session?.user?.email?.toLowerCase().trim()
  if (!userId && !email) return null
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      or(
        userId ? eq(employees.authUserId, userId) : undefined,
        email ? eq(employees.email, email) : undefined
      )
    )
    .limit(1)
  return employee?.id ?? null
}

async function getScopedCorrectiveActorId(access: CorrectiveAccess) {
  const actorId = await getActorEmployeeId()
  if (!access.hasGlobalScope && !actorId) {
    throw new Error('Role Anda hanya bisa mengakses corrective action sendiri.')
  }
  return actorId
}

async function assertCorrectiveScope(id: number, access: CorrectiveAccess, actorId: number | null) {
  if (access.hasGlobalScope) return
  const [record] = await db
    .select({ createdByEmployeeId: hseCorrectiveActions.createdByEmployeeId })
    .from(hseCorrectiveActions)
    .where(eq(hseCorrectiveActions.id, id))
    .limit(1)

  if (!record) throw new Error('Corrective action tidak ditemukan.')
  if (record.createdByEmployeeId !== actorId) {
    throw new Error('Role Anda hanya bisa mengakses corrective action sendiri.')
  }
}

export async function getMobileCorrectiveActions() {
  const access = await requireCorrectivePermission('view')
  await ensureCorrectiveTable()
  const actorId = await getScopedCorrectiveActorId(access)
  return db
    .select()
    .from(hseCorrectiveActions)
    .where(
      access.hasGlobalScope
        ? undefined
        : eq(hseCorrectiveActions.createdByEmployeeId, actorId ?? -1)
    )
    .orderBy(desc(hseCorrectiveActions.createdAt))
}

export async function saveMobileCorrectiveAction(params: {
  id?: number
  sourceType: string
  sourceId?: string
  title: string
  description?: string
  actionPlan: string
  assigneeName?: string
  priority?: string
  status?: string
  closeOutNote?: string
}) {
  const access = await requireCorrectivePermission('edit')
  await ensureCorrectiveTable()
  const actorId = await getScopedCorrectiveActorId(access)
  const payload = {
    sourceType: params.sourceType || 'manual',
    sourceId: params.sourceId || '',
    title: params.title.trim(),
    description: params.description || '',
    actionPlan: params.actionPlan || '',
    assigneeName: params.assigneeName || '',
    priority: params.priority || 'Medium',
    status: params.status || 'Open',
    closeOutNote: params.closeOutNote || '',
    closedAt: params.status === 'Closed' ? new Date() : null,
    updatedAt: new Date(),
  }
  if (!payload.title) throw new Error('Judul corrective action wajib diisi.')

  if (params.id) {
    await assertCorrectiveScope(params.id, access, actorId)
    const [updated] = await db
      .update(hseCorrectiveActions)
      .set(payload)
      .where(eq(hseCorrectiveActions.id, params.id))
      .returning()
    revalidatePath('/mobile/hse/corrective-action')
    return updated
  }

  const [created] = await db
    .insert(hseCorrectiveActions)
    .values({ ...payload, createdByEmployeeId: actorId })
    .returning()
  revalidatePath('/mobile/hse/corrective-action')
  return created
}

export async function deleteMobileCorrectiveAction(id: number) {
  const access = await requireCorrectivePermission('delete')
  await ensureCorrectiveTable()
  const actorId = await getScopedCorrectiveActorId(access)
  await assertCorrectiveScope(id, access, actorId)
  await db.delete(hseCorrectiveActions).where(eq(hseCorrectiveActions.id, id))
  revalidatePath('/mobile/hse/corrective-action')
  return { success: true }
}
