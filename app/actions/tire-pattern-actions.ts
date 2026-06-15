'use server'

import { db } from '@/db'
import {
  tirePatterns,
  tireSizePresets,
  tirePatternAnalyses,
  type NewTirePattern,
  type TirePattern,
} from '@/db/schema/tire-pattern'
import { getServerSession } from '@/lib/auth-session'
import { eq, desc, ilike, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// ─── Tire Size Presets ───────────────────────────────────────────────────────

export async function getTireSizePresets() {
  return db.select().from(tireSizePresets).where(eq(tireSizePresets.isActive, true)).orderBy(tireSizePresets.sortOrder)
}

// ─── Pattern CRUD ────────────────────────────────────────────────────────────

export async function savePattern(data: {
  name: string
  tireSize: string
  patternType: string
  grooveAngle?: number
  grooveWidthMm?: number
  grooveDepthMm?: number
  patternDensity?: number
  repeatUnitMm?: number
  patternSvg?: string
  patternConfig?: Record<string, unknown>
  referenceImageUrl?: string
  thumbnailUrl?: string
  analysisResult?: Record<string, unknown>
  analysisModel?: string
  analysisSource?: string
  tireSectionWidthMm?: number
  tireAspectRatio?: number
  tireRimDiameterMm?: number
  tireCircumferenceMm?: number
  tireTreadWidthMm?: number
}): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return { success: false, error: 'Tidak terautentikasi' }

    const insert: NewTirePattern = {
      name: data.name,
      tireSize: data.tireSize,
      patternType: data.patternType,
      grooveAngle: data.grooveAngle ?? 45,
      grooveWidthMm: data.grooveWidthMm ?? 8,
      grooveDepthMm: data.grooveDepthMm ?? 12,
      patternDensity: data.patternDensity ?? 50,
      repeatUnitMm: data.repeatUnitMm,
      patternSvg: data.patternSvg,
      patternConfig: data.patternConfig,
      referenceImageUrl: data.referenceImageUrl,
      thumbnailUrl: data.thumbnailUrl,
      analysisResult: data.analysisResult,
      analysisModel: data.analysisModel,
      analysisSource: data.analysisSource ?? 'manual',
      tireSectionWidthMm: data.tireSectionWidthMm,
      tireAspectRatio: data.tireAspectRatio,
      tireRimDiameterMm: data.tireRimDiameterMm,
      tireCircumferenceMm: data.tireCircumferenceMm,
      tireTreadWidthMm: data.tireTreadWidthMm,
      status: 'active',
      createdBy: session.user.email,
    }

    const [result] = await db.insert(tirePatterns).values(insert).returning({ id: tirePatterns.id })
    revalidatePath('/dashboard/repair-retread/pattern-designer')
    return { success: true, id: result.id }
  } catch (error) {
    console.error('[tire-pattern] savePattern error:', error)
    return { success: false, error: 'Gagal menyimpan pola' }
  }
}

export async function updatePattern(
  id: number,
  data: Partial<NewTirePattern>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return { success: false, error: 'Tidak terautentikasi' }

    await db
      .update(tirePatterns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tirePatterns.id, id))

    revalidatePath('/dashboard/repair-retread/pattern-designer')
    return { success: true }
  } catch (error) {
    console.error('[tire-pattern] updatePattern error:', error)
    return { success: false, error: 'Gagal memperbarui pola' }
  }
}

export async function listPatterns(filter?: {
  search?: string
  tireSize?: string
  patternType?: string
  status?: string
}): Promise<TirePattern[]> {
  try {
    let query = db.select().from(tirePatterns).$dynamic()

    if (filter?.search) {
      query = query.where(
        or(
          ilike(tirePatterns.name, `%${filter.search}%`),
          ilike(tirePatterns.tireSize, `%${filter.search}%`),
        ),
      )
    }

    return await query.orderBy(desc(tirePatterns.createdAt))
  } catch (error) {
    console.error('[tire-pattern] listPatterns error:', error)
    return []
  }
}

export async function getPattern(id: number): Promise<TirePattern | null> {
  try {
    const [result] = await db.select().from(tirePatterns).where(eq(tirePatterns.id, id)).limit(1)
    return result ?? null
  } catch (error) {
    console.error('[tire-pattern] getPattern error:', error)
    return null
  }
}

export async function deletePattern(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return { success: false, error: 'Tidak terautentikasi' }

    await db.delete(tirePatterns).where(eq(tirePatterns.id, id))
    revalidatePath('/dashboard/repair-retread/pattern-designer')
    return { success: true }
  } catch (error) {
    console.error('[tire-pattern] deletePattern error:', error)
    return { success: false, error: 'Gagal menghapus pola' }
  }
}

// ─── Analysis History ────────────────────────────────────────────────────────

export async function saveAnalysisHistory(data: {
  patternId?: number
  imageUrl?: string
  imageBase64Hash?: string
  modelUsed: string
  prompt?: string
  rawResponse?: string
  parsedResult?: Record<string, unknown>
  confidence?: number
}) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return

    await db.insert(tirePatternAnalyses).values({
      ...data,
      createdBy: session.user.email,
    })
  } catch (error) {
    console.error('[tire-pattern] saveAnalysisHistory error:', error)
  }
}

export async function getAnalysisHistory(limit = 20) {
  try {
    return await db
      .select()
      .from(tirePatternAnalyses)
      .orderBy(desc(tirePatternAnalyses.createdAt))
      .limit(limit)
  } catch (error) {
    console.error('[tire-pattern] getAnalysisHistory error:', error)
    return []
  }
}
