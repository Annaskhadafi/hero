'use server'

import { desc, eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { employees, hsePtwPermits } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'

async function requirePtwPermission(action: 'view' | 'edit' | 'delete') {
  const permission = await getCurrentMenuPermission('hse_izin_kerja_ptw')
  const allowed = action === 'view' ? permission.canView : action === 'delete' ? permission.canDelete : permission.canEdit
  if (!allowed) throw new Error('Role Anda tidak punya akses PTW.')
  return permission
}

async function ensurePtwTable() {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS hero_hse_ptw_permits (
      id serial PRIMARY KEY,
      permit_number text NOT NULL UNIQUE,
      project_name text NOT NULL,
      permit_type text NOT NULL DEFAULT 'Hot Work',
      location text NOT NULL DEFAULT '',
      area text NOT NULL DEFAULT '',
      start_at timestamp,
      end_at timestamp,
      applicant_name text NOT NULL DEFAULT '',
      field_pic_name text NOT NULL DEFAULT '',
      authorized_by_name text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'Draft',
      risk_level text NOT NULL DEFAULT 'Medium',
      description text NOT NULL DEFAULT '',
      control_steps text NOT NULL DEFAULT '',
      ppe jsonb NOT NULL DEFAULT '[]'::jsonb,
      gas_test_required boolean NOT NULL DEFAULT false,
      isolation_required boolean NOT NULL DEFAULT false,
      hiradc_entry_id integer REFERENCES hero_hiradc_entries(id) ON DELETE SET NULL,
      attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_by_employee_id integer REFERENCES hero_employees(id) ON DELETE SET NULL,
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

function generatePermitNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `PTW-${stamp}-${suffix}`
}

export async function getMobilePtwPermits() {
  await requirePtwPermission('view')
  await ensurePtwTable()
  return db.select().from(hsePtwPermits).orderBy(desc(hsePtwPermits.createdAt))
}

export async function saveMobilePtwPermit(params: {
  id?: number
  projectName: string
  permitType: string
  location: string
  area?: string
  status?: string
  riskLevel: string
  description: string
  controlSteps: string
  applicantName?: string
  fieldPicName?: string
  authorizedByName?: string
  gasTestRequired?: boolean
  isolationRequired?: boolean
  hiradcEntryId?: number | null
}) {
  await requirePtwPermission('edit')
  await ensurePtwTable()
  const actorId = await getActorEmployeeId()
  const payload = {
    projectName: params.projectName.trim(),
    permitType: params.permitType || 'Hot Work',
    location: params.location || '',
    area: params.area || '',
    status: params.status || 'Draft',
    riskLevel: params.riskLevel || 'Medium',
    description: params.description || '',
    controlSteps: params.controlSteps || '',
    applicantName: params.applicantName || '',
    fieldPicName: params.fieldPicName || '',
    authorizedByName: params.authorizedByName || '',
    gasTestRequired: params.gasTestRequired ?? false,
    isolationRequired: params.isolationRequired ?? false,
    hiradcEntryId: params.hiradcEntryId ?? null,
    updatedAt: new Date(),
  }
  if (!payload.projectName) throw new Error('Nama pekerjaan wajib diisi.')

  if (params.id) {
    const [updated] = await db.update(hsePtwPermits).set(payload).where(eq(hsePtwPermits.id, params.id)).returning()
    revalidatePath('/mobile/hse/ptw')
    return updated
  }

  const [created] = await db.insert(hsePtwPermits).values({ ...payload, permitNumber: generatePermitNumber(), createdByEmployeeId: actorId }).returning()
  revalidatePath('/mobile/hse/ptw')
  return created
}

export async function deleteMobilePtwPermit(id: number) {
  await requirePtwPermission('delete')
  await ensurePtwTable()
  await db.delete(hsePtwPermits).where(eq(hsePtwPermits.id, id))
  revalidatePath('/mobile/hse/ptw')
  return { success: true }
}
