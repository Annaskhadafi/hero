'use server'

import { desc, eq, or } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { employees, hsePtwPermits } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission, hasGlobalDataAccess } from '@/lib/hero-access'
import {
  buildHseSafetyEmail,
  resolveHseSafetyRecipients,
  sendHseSafetyEmail,
} from '@/lib/hse-safety-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getAppUrl } from '@/lib/workflow-email'
import { ensurePtwApprovalsExist, syncPtwApproverNames } from '@/app/dashboard/hse/izin-kerja-ptw/actions'

async function requirePtwPermission(action: 'view' | 'edit' | 'delete') {
  const permission = await getCurrentMenuPermission('hse_izin_kerja_ptw')
  const allowed =
    action === 'view'
      ? permission.canView
      : action === 'delete'
        ? permission.canDelete
        : permission.canEdit
  if (!allowed) throw new Error('Role Anda tidak punya akses PTW.')
  return {
    permission,
    hasGlobalScope: hasGlobalDataAccess(permission),
  }
}

type PtwAccess = Awaited<ReturnType<typeof requirePtwPermission>>

async function ensurePtwTable() {
  await db.execute(
    sql.raw(`
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

async function getScopedPtwActorId(access: PtwAccess) {
  const actorId = await getActorEmployeeId()
  if (!access.hasGlobalScope && !actorId) {
    throw new Error('Role Anda hanya bisa mengakses PTW sendiri.')
  }
  return actorId
}

async function assertPtwScope(id: number, access: PtwAccess, actorId: number | null) {
  if (access.hasGlobalScope) return
  const [record] = await db
    .select({ createdByEmployeeId: hsePtwPermits.createdByEmployeeId })
    .from(hsePtwPermits)
    .where(eq(hsePtwPermits.id, id))
    .limit(1)

  if (!record) throw new Error('PTW tidak ditemukan.')
  if (record.createdByEmployeeId !== actorId) {
    throw new Error('Role Anda hanya bisa mengakses PTW sendiri.')
  }
}

function generatePermitNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `PTW-${stamp}-${suffix}`
}

export async function getMobilePtwPermits() {
  const access = await requirePtwPermission('view')
  await ensurePtwTable()
  const actorId = await getScopedPtwActorId(access)
  return db
    .select()
    .from(hsePtwPermits)
    .where(access.hasGlobalScope ? undefined : eq(hsePtwPermits.createdByEmployeeId, actorId ?? -1))
    .orderBy(desc(hsePtwPermits.createdAt))
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
  ppe?: string[]
  subTypes?: Record<string, string[]> | string[]
  additionalNotes?: string
  gasTestRequired?: boolean
  isolationRequired?: boolean
  hiradcEntryId?: number | null
}) {
  const access = await requirePtwPermission('edit')
  await ensurePtwTable()
  const actorId = await getScopedPtwActorId(access)
  const payload: Record<string, any> = {
    projectName: params.projectName.trim(),
    permitType: params.permitType || 'Hot Work',
    location: params.location || '',
    area: params.area || '',
    status: params.status || 'Draft',
    riskLevel: params.riskLevel || 'Medium',
    description: params.description || '',
    controlSteps: params.controlSteps || '',
    additionalNotes: params.additionalNotes || '',
    applicantName: params.applicantName || '',
    fieldPicName: params.fieldPicName || '',
    authorizedByName: params.authorizedByName || '',
    gasTestRequired: params.gasTestRequired ?? false,
    isolationRequired: params.isolationRequired ?? false,
    hiradcEntryId: params.hiradcEntryId ?? null,
    updatedAt: new Date(),
  }
  if (params.ppe !== undefined) payload.ppe = params.ppe
  if (params.subTypes !== undefined) payload.subTypes = params.subTypes
  if (params.additionalNotes !== undefined) payload.additionalNotes = params.additionalNotes
  if (!payload.projectName) throw new Error('Nama pekerjaan wajib diisi.')

  if (params.id) {
    await assertPtwScope(params.id, access, actorId)
    const [updated] = await db
      .update(hsePtwPermits)
      .set(payload)
      .where(eq(hsePtwPermits.id, params.id))
      .returning()
    await ensurePtwApprovalsExist(updated.id)
    await syncPtwApproverNames(
      updated.id,
      updated.applicantName || undefined,
      updated.fieldPicName || undefined,
      updated.authorizedByName || undefined
    )

    try {
      const emailContent = buildHseSafetyEmail({
        title: `PTW diperbarui: ${updated.permitNumber}`,
        intro: `${updated.projectName} telah diperbarui di sistem Permit To Work.`,
        details: [
          `Tipe permit: ${updated.permitType}`,
          `Lokasi: ${updated.location}`,
          `Status: ${updated.status}`,
          `Risk level: ${updated.riskLevel}`,
        ],
        ctaLabel: 'Buka PTW',
        ctaUrl: getAppUrl('/dashboard/hse/izin-kerja-ptw'),
      })
      await sendHseSafetyEmail({
        templateCode: 'hse_ptw_updated',
        templateName: 'HSE PTW Updated',
        variables: {
          permitNumber: updated.permitNumber,
          projectName: updated.projectName,
          status: updated.status,
          riskLevel: updated.riskLevel,
        },
        fallbackSubject: `Update PTW: ${updated.permitNumber}`,
        fallbackHtml: emailContent.html,
        fallbackText: emailContent.text,
      })
      const recipients = await resolveHseSafetyRecipients()
      await notifyWorkflowBellRecipients({
        recipientEmails: recipients.to,
        eventType: 'hse_ptw_updated',
        category: 'hse_alerts',
        title: `Update PTW: ${updated.permitNumber}`,
        body: `${updated.projectName} diperbarui dengan status ${updated.status}.`,
        url: '/dashboard/hse/izin-kerja-ptw',
        tagPrefix: 'hse-ptw',
        metadata: {
          permitId: updated.id,
          permitNumber: updated.permitNumber,
        },
      })
    } catch (notificationError) {
      console.error('PTW update notification error:', notificationError)
    }
    revalidatePath('/mobile/hse/ptw')
    return updated
  }

  const [created] = await db
    .insert(hsePtwPermits)
    .values({ ...payload, permitNumber: generatePermitNumber(), createdByEmployeeId: actorId } as any)
    .returning()

  await ensurePtwApprovalsExist(created.id)
  await syncPtwApproverNames(
    created.id,
    created.applicantName || undefined,
    created.fieldPicName || undefined,
    created.authorizedByName || undefined
  )

    try {
    const emailContent = buildHseSafetyEmail({
      title: `PTW baru: ${created.permitNumber}`,
      intro: `${created.projectName} telah dibuat di sistem Permit To Work.`,
      details: [
        `Tipe permit: ${created.permitType}`,
        `Lokasi: ${created.location}`,
        `Risk level: ${created.riskLevel}`,
      ],
      ctaLabel: 'Buka PTW',
      ctaUrl: getAppUrl('/dashboard/hse/izin-kerja-ptw'),
    })
    await sendHseSafetyEmail({
      templateCode: 'hse_ptw_created',
      templateName: 'HSE PTW Created',
      variables: {
        permitNumber: created.permitNumber,
        projectName: created.projectName,
        permitType: created.permitType,
        location: created.location,
        riskLevel: created.riskLevel,
      },
      fallbackSubject: `PTW baru: ${created.permitNumber}`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    })
    const recipients = await resolveHseSafetyRecipients()
    await notifyWorkflowBellRecipients({
      recipientEmails: recipients.to,
      eventType: 'hse_ptw_created',
      category: 'hse_alerts',
      title: `PTW baru: ${created.permitNumber}`,
      body: `${created.projectName} dibuat untuk ${created.location}.`,
      url: '/dashboard/hse/izin-kerja-ptw',
      tagPrefix: 'hse-ptw',
      metadata: {
        permitId: created.id,
        permitNumber: created.permitNumber,
      },
    })
  } catch (notificationError) {
    console.error('PTW create notification error:', notificationError)
  }
  revalidatePath('/mobile/hse/ptw')
  return created
}

export async function deleteMobilePtwPermit(id: number) {
  const access = await requirePtwPermission('delete')
  await ensurePtwTable()
  const actorId = await getScopedPtwActorId(access)
  await assertPtwScope(id, access, actorId)
  await db.delete(hsePtwPermits).where(eq(hsePtwPermits.id, id))
  revalidatePath('/mobile/hse/ptw')
  return { success: true }
}
