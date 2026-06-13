'use server'

import { revalidatePath } from 'next/cache'
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/db'
import { heroJsas, heroJsaSettings, heroJsaSteps, type NewJsa, type NewJsaStep } from '@/db/schema/jsa'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'

async function requireJsaPermission(action: 'view' | 'edit' | 'delete') {
  const permission = await getCurrentMenuPermission('hse_jsa')
  const allowed = action === 'view' ? permission.canView : action === 'delete' ? permission.canDelete : permission.canEdit
  if (!allowed) throw new Error('Role Anda tidak punya akses JSA.')
  return permission
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

let jsaSettingsTablePromise: Promise<void> | null = null

async function ensureJsaSettingsTable() {
  if (!jsaSettingsTablePromise) {
    jsaSettingsTablePromise = db.execute(sql`
      create table if not exists hero_jsa_settings (
        id uuid primary key default gen_random_uuid(),
        setting_key varchar(255) not null unique,
        setting_value jsonb not null default '{}'::jsonb,
        updated_at timestamp not null default now()
      )
    `).then(() => undefined).catch((error) => {
      jsaSettingsTablePromise = null
      throw error
    })
  }

  return jsaSettingsTablePromise
}

export async function getJsaSettings(): Promise<JsaSettings> {
  await requireJsaPermission('view')
  await ensureJsaSettingsTable()

  const [row] = await db
    .select()
    .from(heroJsaSettings)
    .where(eq(heroJsaSettings.settingKey, 'jsa_workflow'))
    .limit(1)

  return { ...DEFAULT_JSA_SETTINGS, ...((row?.settingValue as Partial<JsaSettings> | undefined) ?? {}) }
}

export async function saveJsaSettings(settings: JsaSettings) {
  await requireJsaPermission('edit')
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized')

  await ensureJsaSettingsTable()

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
  await requireJsaPermission('view')
  return db.select().from(heroJsas).orderBy(desc(heroJsas.createdAt))
}

export async function getJsaById(id: string) {
  await requireJsaPermission('view')


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
  await requireJsaPermission('edit')
  const session = await getServerSession()
  if (id && !session?.user) throw new Error('Unauthorized')

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
  } else {
    // Create new
    if (!data.jsaNumber || data.jsaNumber === 'AUTO') {
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
  }

  revalidatePath('/dashboard/hse/jsa')
  revalidatePath('/jsa')
  return { success: true, id }
}

export async function deleteJsa(id: string) {
  await requireJsaPermission('delete')

  
  await db.delete(heroJsas).where(eq(heroJsas.id, id))
  revalidatePath('/dashboard/hse/jsa')
  return { success: true }
}
