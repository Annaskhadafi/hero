import { desc, eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { roadConditionReports } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { ensureRoadConditionReportTable } from '@/lib/road-condition-history'
import {
  ROAD_CONDITION_RESOURCE,
  ROAD_CONDITION_CATEGORIES,
  getRoadConditionOverallScore,
  normalizeRoadConditionScore,
  type RoadConditionCategoryKey,
} from '@/lib/road-condition-rubric'

export const runtime = 'nodejs'

type SavedAssessment = {
  criterionId: string
  score: number
  description: string
  recommendation: string
  recommendationEdited?: boolean
}

type SavedDraft = {
  id: string
  categoryKey: RoadConditionCategoryKey
  pointName: string
  model?: string
  photos?: Array<{ angle: string; caption: string }>
  analysis?: {
    summary: string
    overallScore: number
    assessments: SavedAssessment[]
    photoCaptions?: Array<{ angle: string; caption: string }>
  } | null
}

type SavePayload = {
  id?: number | null
  siteId?: number | null
  siteName: string
  customerName: string
  inspectorName: string
  reportDate: string
  drafts: SavedDraft[]
}

function readString(value: unknown, field: string) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) throw new Error(`${field} wajib diisi.`)
  return text
}

function toDateInput(value: unknown) {
  const text = readString(value, 'Tanggal')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Format tanggal harus YYYY-MM-DD.')
  return text
}

function normalizeDrafts(value: unknown) {
  const drafts = Array.isArray(value) ? value : []
  const normalized = drafts.map((draft, draftIndex) => {
    const categoryKey = String(draft?.categoryKey ?? '') as RoadConditionCategoryKey
    const category = ROAD_CONDITION_CATEGORIES[categoryKey]
    if (!category) throw new Error(`Kategori point ${draftIndex + 1} tidak valid.`)

    const assessments = Array.isArray(draft?.analysis?.assessments)
      ? draft.analysis.assessments.map((assessment: Partial<SavedAssessment>) => ({
          criterionId: readString(assessment.criterionId, 'Parameter'),
          score: normalizeRoadConditionScore(Number(assessment.score)),
          description: typeof assessment.description === 'string' ? assessment.description : '',
          recommendation: typeof assessment.recommendation === 'string' ? assessment.recommendation : '',
          recommendationEdited: Boolean(assessment.recommendationEdited),
        }))
      : []

    const analysis = assessments.length
      ? {
          summary: typeof draft?.analysis?.summary === 'string' ? draft.analysis.summary : '',
          overallScore: getRoadConditionOverallScore(assessments),
          assessments,
          photoCaptions: Array.isArray(draft?.analysis?.photoCaptions) ? draft.analysis.photoCaptions : [],
        }
      : null

    return {
      id: typeof draft?.id === 'string' && draft.id.trim() ? draft.id.trim() : `${categoryKey}-${draftIndex + 1}`,
      categoryKey,
      pointName: readString(draft?.pointName, 'Nama point'),
      model: typeof draft?.model === 'string' ? draft.model : '',
      photos: Array.isArray(draft?.photos)
        ? draft.photos.map((photo: { angle?: unknown; caption?: unknown }) => ({
            angle: typeof photo.angle === 'string' ? photo.angle : '',
            caption: typeof photo.caption === 'string' ? photo.caption : '',
          }))
        : [],
      analysis,
    }
  })

  if (!normalized.some((draft) => draft.analysis)) {
    throw new Error('Minimal satu point harus sudah dianalisis sebelum disimpan.')
  }

  return normalized
}

function validatePayload(input: unknown): SavePayload {
  const body = input as Partial<SavePayload>
  const drafts = normalizeDrafts(body.drafts)
  const id = Number(body.id)
  const siteId = Number(body.siteId)

  return {
    id: Number.isInteger(id) && id > 0 ? id : null,
    siteId: Number.isInteger(siteId) && siteId > 0 ? siteId : null,
    siteName: readString(body.siteName, 'Lokasi site'),
    customerName: readString(body.customerName, 'Customer'),
    inspectorName: readString(body.inspectorName, 'Nama inspector'),
    reportDate: toDateInput(body.reportDate),
    drafts,
  }
}

function calculateAverageScore(drafts: SavedDraft[]) {
  const scores = drafts
    .map((draft) => draft.analysis?.assessments ?? [])
    .flat()
    .map((assessment) => normalizeRoadConditionScore(assessment.score))

  if (!scores.length) return 0
  return scores.reduce((total, score) => total + score, 0) / scores.length
}

function serializeReport(row: typeof roadConditionReports.$inferSelect) {
  const reportData = row.reportData as { drafts?: unknown[] }
  return {
    id: row.id,
    siteId: row.siteId,
    siteName: row.siteName,
    customerName: row.customerName,
    inspectorName: row.inspectorName,
    reportDate: String(row.reportDate),
    averageScore: Number(row.averageScore ?? 0),
    pointCount: Array.isArray(reportData?.drafts) ? reportData.drafts.length : 0,
    modelUsed: row.modelUsed,
    reportData: row.reportData,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function requireAccess() {
  const session = await getServerSession()
  if (!session?.user?.email) throw new Error('Unauthorized')

  const permission = await getCurrentMenuPermission(ROAD_CONDITION_RESOURCE)
  if (!permission.canView) throw new Error('Akses ditolak.')

  return session
}

export async function GET() {
  try {
    await requireAccess()
    await ensureRoadConditionReportTable()
    const rows = await db
      .select()
      .from(roadConditionReports)
      .orderBy(desc(roadConditionReports.updatedAt))
      .limit(50)

    return NextResponse.json({ success: true, history: rows.map(serializeReport) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membaca history.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAccess()
    const payload = validatePayload(await request.json())
    await ensureRoadConditionReportTable()
    const averageScore = calculateAverageScore(payload.drafts).toFixed(2)
    const modelUsed = Array.from(new Set(payload.drafts.map((draft) => draft.model).filter(Boolean))).join(', ')
    const reportData = {
      siteId: payload.siteId,
      siteName: payload.siteName,
      customerName: payload.customerName,
      inspectorName: payload.inspectorName,
      reportDate: payload.reportDate,
      drafts: payload.drafts,
    }

    if (payload.id) {
      const [updated] = await db
        .update(roadConditionReports)
        .set({
          siteId: payload.siteId,
          siteName: payload.siteName,
          customerName: payload.customerName,
          inspectorName: payload.inspectorName,
          reportDate: payload.reportDate,
          averageScore,
          modelUsed,
          reportData,
          updatedAt: new Date(),
        })
        .where(eq(roadConditionReports.id, payload.id))
        .returning()

      if (!updated) throw new Error('History report tidak ditemukan.')
      return NextResponse.json({ success: true, report: serializeReport(updated) })
    }

    const [created] = await db
      .insert(roadConditionReports)
      .values({
        siteId: payload.siteId,
        siteName: payload.siteName,
        customerName: payload.customerName,
        inspectorName: payload.inspectorName,
        reportDate: payload.reportDate,
        averageScore,
        modelUsed,
        reportData,
        createdBy: session.user.email,
      })
      .returning()

    return NextResponse.json({ success: true, report: serializeReport(created) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan history.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 })
  }
}
