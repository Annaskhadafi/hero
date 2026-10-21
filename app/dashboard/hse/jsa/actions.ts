'use server'

import { revalidatePath } from 'next/cache'
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/db'
import { heroJsas, heroJsaSettings, heroJsaSteps, type NewJsa, type NewJsaStep } from '@/db/schema/jsa'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { buildHseSafetyEmail, resolveHseSafetyRecipients, sendHseSafetyEmail } from '@/lib/hse-safety-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getAppUrl } from '@/lib/workflow-email'

async function checkJsaPermission(action: 'view' | 'edit' | 'delete'): Promise<boolean> {
  try {
    const permission = await getCurrentMenuPermission('hse_jsa')
    return action === 'view' ? Boolean(permission.canView) : action === 'delete' ? Boolean(permission.canDelete) : Boolean(permission.canEdit)
  } catch {
    return false
  }
}

export type JsaSettings = {
  notificationRecipients: string
  defaultSignerName: string
  defaultSignerTitle: string
  defaultSignerEmail: string
}

const DEFAULT_JSA_SETTINGS: JsaSettings = {
  notificationRecipients: '',
  defaultSignerName: '',
  defaultSignerTitle: '',
  defaultSignerEmail: '',
}

let jsaTablesPromise: Promise<void> | null = null

async function ensureJsaTables() {
  if (!jsaTablesPromise) {
    jsaTablesPromise = (async () => {
      await db.execute(sql`
        create table if not exists hero_jsas (
          id uuid primary key default gen_random_uuid(),
          jsa_number varchar(255) not null,
          job_description text not null,
          equipment_number varchar(255) not null,
          team_members text not null,
          equipment_used jsonb not null default '[]'::jsonb,
          requirements jsonb not null default '[]'::jsonb,
          permits jsonb not null default '[]'::jsonb,
          ppe_requirements jsonb not null default '[]'::jsonb,
          risk_level varchar(50) not null,
          signatures jsonb not null default '{}'::jsonb,
          created_at timestamp not null default now(),
          updated_at timestamp not null default now()
        );
      `)
      await db.execute(sql`
        create table if not exists hero_jsa_steps (
          id uuid primary key default gen_random_uuid(),
          jsa_id uuid not null references hero_jsas(id) on delete cascade,
          step_order integer not null,
          work_step text not null,
          hazard text not null,
          consequence text not null,
          control text not null,
          residual_risk varchar(50) not null,
          pic varchar(255) not null,
          created_at timestamp not null default now()
        );
      `)
      await db.execute(sql`
        create table if not exists hero_jsa_settings (
          id uuid primary key default gen_random_uuid(),
          setting_key varchar(255) not null unique,
          setting_value jsonb not null default '{}'::jsonb,
          updated_at timestamp not null default now()
        );
      `)
    })().catch((error) => {
      jsaTablesPromise = null
      console.error('[JSA] Failed to ensure tables:', error)
      throw error
    })
  }

  return jsaTablesPromise
}

export async function getJsaSettings(): Promise<JsaSettings> {
  await ensureJsaTables()

  try {
    const [row] = await db
      .select()
      .from(heroJsaSettings)
      .where(eq(heroJsaSettings.settingKey, 'jsa_workflow'))
      .limit(1)

    return { ...DEFAULT_JSA_SETTINGS, ...((row?.settingValue as Partial<JsaSettings> | undefined) ?? {}) }
  } catch (error) {
    console.error('[JSA] getJsaSettings error:', error)
    return DEFAULT_JSA_SETTINGS
  }
}

export async function saveJsaSettings(settings: JsaSettings) {
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized')

  const canEdit = await checkJsaPermission('edit')
  if (!canEdit) throw new Error('Role Anda tidak punya akses mengubah setting JSA.')

  await ensureJsaTables()

  const [existing] = await db
    .select({ id: heroJsaSettings.id })
    .from(heroJsaSettings)
    .where(eq(heroJsaSettings.settingKey, 'jsa_workflow'))
    .limit(1)

  if (existing) {
    await db
      .update(heroJsaSettings)
      .set({ settingValue: settings, updatedAt: new Date() })
      .where(eq(heroJsaSettings.id, existing.id))
  } else {
    await db.insert(heroJsaSettings).values({ settingKey: 'jsa_workflow', settingValue: settings })
  }

  revalidatePath('/dashboard/hse/jsa')
  return { success: true }
}

export async function getJsaList() {
  await ensureJsaTables()
  return db.select().from(heroJsas).orderBy(desc(heroJsas.createdAt))
}

export async function getJsaById(id: string) {
  await ensureJsaTables()

  const [jsa] = await db.select().from(heroJsas).where(eq(heroJsas.id, id)).limit(1)
  if (!jsa) return null

  const steps = await db
    .select()
    .from(heroJsaSteps)
    .where(eq(heroJsaSteps.jsaId, id))
    .orderBy(heroJsaSteps.stepOrder)

  return { ...jsa, steps }
}

export async function saveJsa(
  data: Omit<NewJsa, 'id' | 'createdAt' | 'updatedAt'>,
  steps: Omit<NewJsaStep, 'id' | 'jsaId' | 'createdAt'>[],
  id?: string
) {
  await ensureJsaTables()

  const session = await getServerSession()
  // If editing an existing JSA, user must be logged in
  if (id && !session?.user) {
    throw new Error('Unauthorized: Harus login untuk mengubah data JSA.')
  }

  let settings: JsaSettings = DEFAULT_JSA_SETTINGS
  try {
    settings = await getJsaSettings()
  } catch (err) {
    console.warn('[JSA] getJsaSettings fallback:', err)
  }

  let notificationPayload: null | {
    mode: 'create' | 'update'
    jsaNumber: string
    jobDescription: string
    riskLevel: string
    teamMembers: string
  } = null

  if (id) {
    const jsaId = id

    // Update existing
    await db.update(heroJsas).set({ ...data, updatedAt: new Date() }).where(eq(heroJsas.id, jsaId))
    
    // Delete old steps and insert new ones
    await db.delete(heroJsaSteps).where(eq(heroJsaSteps.jsaId, jsaId))
    if (steps.length > 0) {
      await db.insert(heroJsaSteps).values(
        steps.map((step) => ({
          ...step,
          jsaId,
        }))
      )
    }
    notificationPayload = {
      mode: 'update',
      jsaNumber: data.jsaNumber || jsaId,
      jobDescription: data.jobDescription,
      riskLevel: data.riskLevel,
      teamMembers: data.teamMembers,
    }
  } else {
    // Create new JSA
    if (!data.jsaNumber || data.jsaNumber === 'AUTO' || data.jsaNumber.trim() === '') {
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const randStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      data.jsaNumber = `JSA/${dateStr}/${randStr}`
    }

    const [inserted] = await db.insert(heroJsas).values(data).returning()
    if (steps.length > 0) {
      await db.insert(heroJsaSteps).values(
        steps.map((step) => ({
          ...step,
          jsaId: inserted.id,
        }))
      )
    }
    id = inserted.id
    notificationPayload = {
      mode: 'create',
      jsaNumber: inserted.jsaNumber,
      jobDescription: inserted.jobDescription,
      riskLevel: inserted.riskLevel,
      teamMembers: inserted.teamMembers,
    }
  }

  // Handle notifications asynchronously without failing JSA save if email/bell fails
  if (notificationPayload) {
    try {
      const emailContent = buildHseSafetyEmail({
        title: notificationPayload.mode === 'create' ? `JSA baru: ${notificationPayload.jsaNumber}` : `JSA diperbarui: ${notificationPayload.jsaNumber}`,
        intro:
          notificationPayload.mode === 'create'
            ? `${notificationPayload.jobDescription} telah didaftarkan ke sistem JSA.`
            : `${notificationPayload.jobDescription} telah diperbarui di sistem JSA.`,
        details: [
          `Nomor JSA: ${notificationPayload.jsaNumber}`,
          `Risk level: ${notificationPayload.riskLevel}`,
          notificationPayload.teamMembers ? `Tim: ${notificationPayload.teamMembers}` : null,
        ],
        ctaLabel: 'Buka JSA',
        ctaUrl: getAppUrl('/dashboard/hse/jsa'),
      })
      const extraRecipients = settings.notificationRecipients
      await sendHseSafetyEmail({
        templateCode: notificationPayload.mode === 'create' ? 'hse_jsa_created' : 'hse_jsa_updated',
        templateName: notificationPayload.mode === 'create' ? 'HSE JSA Created' : 'HSE JSA Updated',
        variables: notificationPayload,
        extraTo: extraRecipients,
        fallbackSubject:
          notificationPayload.mode === 'create'
            ? `JSA baru: ${notificationPayload.jsaNumber}`
            : `Update JSA: ${notificationPayload.jsaNumber}`,
        fallbackHtml: emailContent.html,
        fallbackText: emailContent.text,
      }).catch((e) => console.warn('[JSA Email Warn]', e))

      const bellRecipients = await resolveHseSafetyRecipients({ extraTo: extraRecipients }).catch(() => ({ to: [] }))
      if (bellRecipients?.to?.length > 0) {
        await notifyWorkflowBellRecipients({
          recipientEmails: bellRecipients.to,
          eventType: notificationPayload.mode === 'create' ? 'hse_jsa_created' : 'hse_jsa_updated',
          category: 'hse_alerts',
          title:
            notificationPayload.mode === 'create'
              ? `JSA baru: ${notificationPayload.jsaNumber}`
              : `Update JSA: ${notificationPayload.jsaNumber}`,
          body:
            notificationPayload.mode === 'create'
              ? `${notificationPayload.jobDescription} ditambahkan ke register JSA.`
              : `${notificationPayload.jobDescription} diperbarui di register JSA.`,
          url: '/dashboard/hse/jsa',
          tagPrefix: 'hse-jsa',
          metadata: {
            jsaId: id,
            jsaNumber: notificationPayload.jsaNumber,
          },
        }).catch((e) => console.warn('[JSA Bell Warn]', e))
      }
    } catch (notifErr) {
      console.warn('[JSA] Notification delivery caught:', notifErr)
    }
  }

  try {
    revalidatePath('/dashboard/hse/jsa')
    revalidatePath('/jsa')
  } catch (revalErr) {
    console.warn('[JSA] revalidatePath warn:', revalErr)
  }

  return { success: true, id }
}

export async function deleteJsa(id: string) {
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized')

  const canDelete = await checkJsaPermission('delete')
  if (!canDelete) throw new Error('Role Anda tidak punya akses menghapus JSA.')

  await ensureJsaTables()
  await db.delete(heroJsas).where(eq(heroJsas.id, id))
  revalidatePath('/dashboard/hse/jsa')
  return { success: true }
}
