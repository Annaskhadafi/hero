'use server'

import { desc, eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { employees, hseCorrectiveActions } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'

async function requireCorrectivePermission(action: 'view' | 'edit' | 'delete') {
  const permission = await getCurrentMenuPermission('hse_incident_report')
  const allowed = action === 'view' ? permission.canView : action === 'delete' ? permission.canDelete : permission.canEdit
  if (!allowed) throw new Error('Role Anda tidak punya akses Corrective Action.')
  return permission
}

async function ensureCorrectiveTable() {
  await db.execute(sql.raw(`
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
  `))
}

async function getActorEmployeeId() {
  const session = await getServerSession()
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email) return null
  const [employee] = await db.select({ id: employees.id }).from(employees).where(eq(employees.email, email)).limit(1)
  return employee?.id ?? null
}

export async function getMobileCorrectiveActions() {
  await requireCorrectivePermission('view')
  await ensureCorrectiveTable()
  return db.select().from(hseCorrectiveActions).orderBy(desc(hseCorrectiveActions.createdAt))
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
  await requireCorrectivePermission('edit')
  await ensureCorrectiveTable()
  const actorId = await getActorEmployeeId()
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
    const [updated] = await db.update(hseCorrectiveActions).set(payload).where(eq(hseCorrectiveActions.id, params.id)).returning()
    revalidatePath('/mobile/hse/corrective-action')
    return updated
  }

  const [created] = await db.insert(hseCorrectiveActions).values({ ...payload, createdByEmployeeId: actorId }).returning()
  revalidatePath('/mobile/hse/corrective-action')
  return created
}

export async function deleteMobileCorrectiveAction(id: number) {
  await requireCorrectivePermission('delete')
  await ensureCorrectiveTable()
  await db.delete(hseCorrectiveActions).where(eq(hseCorrectiveActions.id, id))
  revalidatePath('/mobile/hse/corrective-action')
  return { success: true }
}
