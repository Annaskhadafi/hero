'use server'

import { revalidatePath } from 'next/cache'
import { desc, eq, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { employees, twibbonTemplates } from '@/db/schema'
import { getServerSession } from '@/lib/auth-session'
import { getMenuPermissionForRole, isSuperAdminRole } from '@/lib/hero-access'
import { extractS3ObjectKeyFromUrl } from '@/lib/resolve-upload-url'
import { normalizeAndUploadTwibbonPng } from '@/lib/twibbon-server'
import {
  type TwibbonAspectRatio,
  type TwibbonTemplateDTO,
} from '@/lib/twibbon'

declare global {
  var heroTwibbonTableReady: boolean | undefined
}

async function ensureTwibbonTable() {
  if (globalThis.heroTwibbonTableReady) return
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS twibbon_templates (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      caption_text TEXT,
      category TEXT NOT NULL DEFAULT 'Campaign',
      square_url TEXT,
      portrait_url TEXT,
      story_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_by_user_id TEXT,
      created_by_employee_id INTEGER,
      created_by_name TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  globalThis.heroTwibbonTableReady = true
}

export interface TwibbonActor {
  userId: string
  email: string
  name: string
  employeeId: number | null
  accessRole: string | null
  isAdmin: boolean
}

export async function getCurrentTwibbonActor(): Promise<TwibbonActor | null> {
  const session = await getServerSession()
  if (!session?.user?.id && !session?.user?.email) return null

  const userId = session.user.id || ''
  const email = (session.user.email || '').trim().toLowerCase()

  const conds = []
  if (userId) conds.push(eq(employees.authUserId, userId))
  if (email) conds.push(sql`lower(${employees.email}) = ${email}`)

  const [emp] =
    conds.length > 0
      ? await db
          .select({
            id: employees.id,
            name: employees.name,
            accessRole: employees.accessRole,
          })
          .from(employees)
          .where(conds.length > 1 ? or(...conds) : conds[0])
          .limit(1)
      : []

  const accessRole = emp?.accessRole ?? null
  let isAdmin = isSuperAdminRole(accessRole)

  if (!isAdmin && accessRole) {
    const perm = await getMenuPermissionForRole(accessRole, 'marketing_twibbon')
    isAdmin = Boolean(perm.canEdit || perm.canDelete)
  }

  return {
    userId,
    email,
    name: emp?.name || session.user.name || session.user.email || 'Karyawan HERO',
    employeeId: emp?.id ?? null,
    accessRole,
    isAdmin,
  }
}

function normalizeProxyUploadPath(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || !rawUrl.trim()) return null
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith('/api/uploads/')) return trimmed
  const key = extractS3ObjectKeyFromUrl(trimmed)
  if (!key) return null
  return `/api/uploads/${key}`
}

function toDto(
  row: typeof twibbonTemplates.$inferSelect,
  actor: TwibbonActor | null
): TwibbonTemplateDTO {
  const isOwner = Boolean(
    actor &&
      ((actor.userId && row.createdByUserId && row.createdByUserId === actor.userId) ||
        (actor.employeeId && row.createdByEmployeeId && row.createdByEmployeeId === actor.employeeId))
  )

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? null,
    captionText: row.captionText ?? null,
    category: row.category || 'Campaign',
    squareUrl: normalizeProxyUploadPath(row.squareUrl),
    portraitUrl: normalizeProxyUploadPath(row.portraitUrl),
    storyUrl: normalizeProxyUploadPath(row.storyUrl),
    status: row.status === 'inactive' ? 'inactive' : 'active',
    usageCount: Number(row.usageCount || 0),
    createdByUserId: row.createdByUserId ?? null,
    createdByEmployeeId: row.createdByEmployeeId ?? null,
    createdByName: row.createdByName || 'Karyawan HERO',
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    canManage: Boolean(actor?.isAdmin || isOwner),
  }
}

function makeSlug(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base || 'twibbon'}-${suffix}`
}

export async function uploadTwibbonPngAction(formData: FormData) {
  try {
    const actor = await getCurrentTwibbonActor()
    if (!actor) {
      return { success: false, error: 'Unauthorized: Silakan login terlebih dahulu.' }
    }

    const file = formData.get('file') as File | null
    const ratio = (formData.get('ratio') as TwibbonAspectRatio | null) || '1:1'

    if (!file) {
      return { success: false, error: 'Berkas PNG tidak ditemukan.' }
    }

    const uploaded = await normalizeAndUploadTwibbonPng(file, ratio)
    return {
      success: true,
      ...uploaded,
    }
  } catch (error: any) {
    console.error('[uploadTwibbonPngAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengunggah frame PNG Twibbon ke S3.',
    }
  }
}

export async function listTwibbonTemplatesAction(): Promise<{
  success: boolean
  data: TwibbonTemplateDTO[]
  error?: string
}> {
  try {
    await ensureTwibbonTable()
    const actor = await getCurrentTwibbonActor()
    if (!actor) {
      return { success: false, data: [], error: 'Unauthorized' }
    }

    const rows = await db
      .select()
      .from(twibbonTemplates)
      .orderBy(desc(twibbonTemplates.createdAt))

    return {
      success: true,
      data: rows.map((row) => toDto(row, actor)),
    }
  } catch (error: any) {
    console.error('[listTwibbonTemplatesAction] Error:', error)
    return {
      success: false,
      data: [],
      error: error?.message || 'Gagal memuat daftar template Twibbon.',
    }
  }
}

export interface SaveTwibbonTemplateInput {
  title: string
  description?: string | null
  captionText?: string | null
  category?: string | null
  squareUrl?: string | null
  portraitUrl?: string | null
  storyUrl?: string | null
  status?: 'active' | 'inactive'
}

export async function createTwibbonTemplateAction(input: SaveTwibbonTemplateInput) {
  try {
    await ensureTwibbonTable()
    const actor = await getCurrentTwibbonActor()
    if (!actor) {
      return { success: false, error: 'Unauthorized: Sesi login diperlukan.' }
    }

    const title = (input.title || '').trim()
    if (!title) {
      return { success: false, error: 'Judul template Twibbon wajib diisi.' }
    }

    const squareUrl = normalizeProxyUploadPath(input.squareUrl)
    const portraitUrl = normalizeProxyUploadPath(input.portraitUrl)
    const storyUrl = normalizeProxyUploadPath(input.storyUrl)

    if (!squareUrl && !portraitUrl && !storyUrl) {
      return {
        success: false,
        error: 'Unggah minimal 1 frame PNG (1:1 Square, 4:5 Portrait, atau 9:16 Story/Reels).',
      }
    }

    const [created] = await db
      .insert(twibbonTemplates)
      .values({
        slug: makeSlug(title),
        title,
        description: input.description?.trim() || null,
        captionText: input.captionText?.trim() || null,
        category: input.category?.trim() || 'Campaign',
        squareUrl,
        portraitUrl,
        storyUrl,
        status: input.status === 'inactive' ? 'inactive' : 'active',
        usageCount: 0,
        createdByUserId: actor.userId || null,
        createdByEmployeeId: actor.employeeId,
        createdByName: actor.name,
      })
      .returning()

    revalidatePath('/dashboard/twibbon')
    revalidatePath('/mobile/twibbon')

    return {
      success: true,
      data: toDto(created, actor),
    }
  } catch (error: any) {
    console.error('[createTwibbonTemplateAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menyimpan template Twibbon.',
    }
  }
}

export async function updateTwibbonTemplateAction(id: number, input: SaveTwibbonTemplateInput) {
  try {
    await ensureTwibbonTable()
    const actor = await getCurrentTwibbonActor()
    if (!actor) {
      return { success: false, error: 'Unauthorized' }
    }

    const [existing] = await db
      .select()
      .from(twibbonTemplates)
      .where(eq(twibbonTemplates.id, id))
      .limit(1)

    if (!existing) {
      return { success: false, error: 'Template Twibbon tidak ditemukan.' }
    }

    const currentDto = toDto(existing, actor)
    if (!currentDto.canManage) {
      return {
        success: false,
        error: 'Anda tidak memiliki izin untuk mengubah template milik pengguna lain.',
      }
    }

    const title = (input.title || '').trim()
    if (!title) {
      return { success: false, error: 'Judul template wajib diisi.' }
    }

    const squareUrl = normalizeProxyUploadPath(input.squareUrl)
    const portraitUrl = normalizeProxyUploadPath(input.portraitUrl)
    const storyUrl = normalizeProxyUploadPath(input.storyUrl)

    if (!squareUrl && !portraitUrl && !storyUrl) {
      return {
        success: false,
        error: 'Minimal 1 varian PNG harus tetap tersedia pada template.',
      }
    }

    const [updated] = await db
      .update(twibbonTemplates)
      .set({
        title,
        description: input.description?.trim() || null,
        captionText: input.captionText?.trim() || null,
        category: input.category?.trim() || 'Campaign',
        squareUrl,
        portraitUrl,
        storyUrl,
        status: input.status === 'inactive' ? 'inactive' : 'active',
        updatedAt: new Date(),
      })
      .where(eq(twibbonTemplates.id, id))
      .returning()

    revalidatePath('/dashboard/twibbon')
    revalidatePath('/mobile/twibbon')

    return {
      success: true,
      data: toDto(updated, actor),
    }
  } catch (error: any) {
    console.error('[updateTwibbonTemplateAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui template Twibbon.',
    }
  }
}

export async function toggleTwibbonTemplateStatusAction(
  id: number,
  status: 'active' | 'inactive'
) {
  try {
    await ensureTwibbonTable()
    const actor = await getCurrentTwibbonActor()
    if (!actor) {
      return { success: false, error: 'Unauthorized' }
    }

    const [existing] = await db
      .select()
      .from(twibbonTemplates)
      .where(eq(twibbonTemplates.id, id))
      .limit(1)

    if (!existing) {
      return { success: false, error: 'Template tidak ditemukan.' }
    }

    if (!toDto(existing, actor).canManage) {
      return { success: false, error: 'Akses ditolak untuk mengubah status template ini.' }
    }

    const [updated] = await db
      .update(twibbonTemplates)
      .set({
        status: status === 'inactive' ? 'inactive' : 'active',
        updatedAt: new Date(),
      })
      .where(eq(twibbonTemplates.id, id))
      .returning()

    revalidatePath('/dashboard/twibbon')
    revalidatePath('/mobile/twibbon')

    return {
      success: true,
      data: toDto(updated, actor),
    }
  } catch (error: any) {
    console.error('[toggleTwibbonTemplateStatusAction] Error:', error)
    return { success: false, error: error?.message || 'Gagal mengubah status template.' }
  }
}

export async function deleteTwibbonTemplateAction(id: number) {
  try {
    await ensureTwibbonTable()
    const actor = await getCurrentTwibbonActor()
    if (!actor) {
      return { success: false, error: 'Unauthorized' }
    }

    const [existing] = await db
      .select()
      .from(twibbonTemplates)
      .where(eq(twibbonTemplates.id, id))
      .limit(1)

    if (!existing) {
      return { success: false, error: 'Template tidak ditemukan.' }
    }

    if (!toDto(existing, actor).canManage) {
      return { success: false, error: 'Anda tidak memiliki izin menghapus template ini.' }
    }

    await db.delete(twibbonTemplates).where(eq(twibbonTemplates.id, id))

    revalidatePath('/dashboard/twibbon')
    revalidatePath('/mobile/twibbon')

    return { success: true }
  } catch (error: any) {
    console.error('[deleteTwibbonTemplateAction] Error:', error)
    return { success: false, error: error?.message || 'Gagal menghapus template Twibbon.' }
  }
}

export async function incrementTwibbonUsageAction(id: number) {
  try {
    await ensureTwibbonTable()
    const actor = await getCurrentTwibbonActor()
    if (!actor) return { success: false }

    await db
      .update(twibbonTemplates)
      .set({
        usageCount: sql`${twibbonTemplates.usageCount} + 1`,
      })
      .where(eq(twibbonTemplates.id, id))

    revalidatePath('/dashboard/twibbon')
    return { success: true }
  } catch {
    return { success: false }
  }
}
