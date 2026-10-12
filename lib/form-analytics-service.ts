import { db } from '@/db'
import {
  formTemplates,
  formTemplateVersions,
  formTemplateFields,
  formFieldOptions,
  formSubmissions,
  formSubmissionValues,
} from '@/db/schema/hero'
import { eq, desc, and, sql } from 'drizzle-orm'

export interface FormAnalyticsSummary {
  formId: number
  name: string
  slug: string
  totalViews: number
  totalStarts: number
  totalSubmissions: number
  completionRate: number // percent 0-100
  averageDurationSeconds: number
  dropOffRate: number // percent 0-100
  questions: QuestionAnalytics[]
  recentSubmissions: SubmissionSummaryItem[]
}

export interface QuestionAnalytics {
  fieldKey: string
  fieldType: string
  label: string
  sortOrder: number
  totalAnswered: number
  responseBreakdown?: { label: string; count: number; percentage: number }[]
  npsScore?: number // -100 to 100
  npsBreakdown?: {
    promoters: number // 9-10
    passives: number // 7-8
    detractors: number // 0-6
    promoterPct: number
    passivePct: number
    detractorPct: number
  }
  likertMatrix?: {
    rows: {
      rowId: string
      rowLabel: string
      averageScore: number
      counts: { columnLabel: string; count: number }[]
    }[]
  }
  averageRating?: number
  textAnswersSample?: { text: string; respondentName?: string; createdAt: string }[]
}

export interface SubmissionSummaryItem {
  id: number
  respondentName: string
  respondentEmail: string
  respondentPhone: string
  submittedAt: string | null
  durationSeconds: number
  isPublic: boolean
}

export async function getFormAnalytics(formId: number): Promise<FormAnalyticsSummary | null> {
  try {
    const tpls = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, formId))
      .limit(1)

    if (tpls.length === 0) return null
    const tpl = tpls[0]

    // Ambil latest version
    const versions = await db
      .select()
      .from(formTemplateVersions)
      .where(eq(formTemplateVersions.templateId, formId))
      .orderBy(desc(formTemplateVersions.versionNumber))
      .limit(1)

    const versionId = versions[0]?.id

    // Submissions
    const submissions = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.templateId, formId))
      .orderBy(desc(formSubmissions.createdAt))

    const totalSubmissions = submissions.filter((s) => s.submittedAt !== null).length
    const totalStarts = Math.max(submissions.length, tpl.startCount || 0)
    const totalViews = Math.max(tpl.viewCount || 0, totalStarts)

    const completionRate =
      totalStarts > 0 ? Math.round((totalSubmissions / totalStarts) * 100) : 0
    const dropOffRate = 100 - completionRate

    // Avg duration
    const completedWithDuration = submissions.filter(
      (s) => s.submittedAt && s.durationSeconds && s.durationSeconds > 0,
    )
    const avgDuration =
      completedWithDuration.length > 0
        ? Math.round(
            completedWithDuration.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) /
              completedWithDuration.length,
          )
        : 0

    // Fields
    let dbFields: any[] = []
    if (versionId) {
      dbFields = await db
        .select()
        .from(formTemplateFields)
        .where(eq(formTemplateFields.versionId, versionId))
        .orderBy(formTemplateFields.sortOrder)
    }

    // Submission values
    const subIds = submissions.map((s) => s.id)
    let allValues: any[] = []
    if (subIds.length > 0) {
      allValues = await db
        .select()
        .from(formSubmissionValues)
        .where(
          sql`${formSubmissionValues.submissionId} IN (${sql.join(
            subIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        )
    }

    const questions: QuestionAnalytics[] = []

    for (const field of dbFields) {
      const fieldValues = allValues.filter((v) => v.fieldKey === field.fieldKey)
      const answeredCount = fieldValues.filter(
        (v) => (v.valueText && v.valueText.trim() !== '') || v.numericValue !== null,
      ).length

      const config: any = safeParse(field.configJson, {})
      const qAnalytics: QuestionAnalytics = {
        fieldKey: field.fieldKey,
        fieldType: field.fieldType,
        label: field.label,
        sortOrder: field.sortOrder,
        totalAnswered: answeredCount,
      }

      // Choice Breakdown (single_choice, dropdown, multiple_choice)
      if (['single_choice', 'dropdown', 'multiple_choice'].includes(field.fieldType)) {
        const counts: Record<string, number> = {}
        for (const fv of fieldValues) {
          if (!fv.valueText) continue
          let vals = [fv.valueText]
          if (fv.fieldType === 'multiple_choice' && fv.jsonValue) {
            try {
              vals = JSON.parse(fv.jsonValue)
            } catch {
              vals = fv.valueText.split(',')
            }
          }
          for (const v of vals) {
            const clean = v.trim()
            if (clean) counts[clean] = (counts[clean] || 0) + 1
          }
        }

        const breakdown = Object.entries(counts).map(([label, count]) => ({
          label,
          count,
          percentage: answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0,
        }))
        qAnalytics.responseBreakdown = breakdown
      }

      // NPS Calculation (0 to 10)
      if (field.fieldType === 'nps') {
        let promoters = 0 // 9-10
        let passives = 0 // 7-8
        let detractors = 0 // 0-6
        let npsTotal = 0

        for (const fv of fieldValues) {
          const score =
            fv.numericValue !== null ? fv.numericValue : parseInt(fv.valueText, 10)
          if (!isNaN(score) && score >= 0 && score <= 10) {
            npsTotal++
            if (score >= 9) promoters++
            else if (score >= 7) passives++
            else detractors++
          }
        }

        const pPct = npsTotal > 0 ? Math.round((promoters / npsTotal) * 100) : 0
        const dPct = npsTotal > 0 ? Math.round((detractors / npsTotal) * 100) : 0
        const passPct = npsTotal > 0 ? 100 - pPct - dPct : 0
        const score = pPct - dPct // Net Promoter Score = % promoters - % detractors

        qAnalytics.npsScore = score
        qAnalytics.npsBreakdown = {
          promoters,
          passives,
          detractors,
          promoterPct: pPct,
          passivePct: passPct,
          detractorPct: dPct,
        }
      }

      // Star Rating & Slider average
      if (['star_rating', 'slider', 'number'].includes(field.fieldType)) {
        let sum = 0
        let validNum = 0
        for (const fv of fieldValues) {
          const num =
            fv.numericValue !== null ? fv.numericValue : parseFloat(fv.valueText)
          if (!isNaN(num)) {
            sum += num
            validNum++
          }
        }
        qAnalytics.averageRating = validNum > 0 ? Number((sum / validNum).toFixed(1)) : 0
      }

      // Likert Matrix
      if (field.fieldType === 'likert_matrix' && config.likertRows) {
        const rows = config.likertRows || []
        const columns = config.likertColumns || []
        const matrixRows = rows.map((r: any) => {
          let rowTotal = 0
          let rowWeightedSum = 0
          const columnCounts: { columnLabel: string; count: number }[] = columns.map(
            (c: any) => ({
              columnLabel: c.label,
              count: 0,
            }),
          )

          for (const fv of fieldValues) {
            if (fv.jsonValue) {
              try {
                const parsed = JSON.parse(fv.jsonValue)
                const selectedVal = parsed[r.id]
                if (selectedVal) {
                  const colIdx = columns.findIndex(
                    (c: any) => c.id === selectedVal || c.label === selectedVal,
                  )
                  if (colIdx >= 0) {
                    columnCounts[colIdx].count++
                    rowTotal++
                    rowWeightedSum += columns[colIdx].points || colIdx + 1
                  }
                }
              } catch {}
            }
          }

          const avgScore = rowTotal > 0 ? Number((rowWeightedSum / rowTotal).toFixed(2)) : 0
          return {
            rowId: r.id,
            rowLabel: r.label,
            averageScore: avgScore,
            counts: columnCounts,
          }
        })

        qAnalytics.likertMatrix = { rows: matrixRows }
      }

      // Text Answers Sample
      if (['short_text', 'long_text', 'email', 'phone'].includes(field.fieldType)) {
        const samples = fieldValues
          .filter((fv) => fv.valueText && fv.valueText.trim().length > 0)
          .slice(0, 15)
          .map((fv) => {
            const sub = submissions.find((s) => s.id === fv.submissionId)
            return {
              text: fv.valueText,
              respondentName: sub?.respondentName || 'Anonim',
              createdAt: fv.createdAt.toISOString(),
            }
          })
        qAnalytics.textAnswersSample = samples
      }

      questions.push(qAnalytics)
    }

    const recentSubmissions: SubmissionSummaryItem[] = submissions.slice(0, 25).map((s) => ({
      id: s.id,
      respondentName: s.respondentName || 'Responden Anonim',
      respondentEmail: s.respondentEmail || '-',
      respondentPhone: s.respondentPhone || '-',
      submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
      durationSeconds: s.durationSeconds || 0,
      isPublic: s.isPublicSubmission,
    }))

    return {
      formId: tpl.id,
      name: tpl.name,
      slug: tpl.slug || tpl.templateKey,
      totalViews,
      totalStarts,
      totalSubmissions,
      completionRate,
      averageDurationSeconds: avgDuration,
      dropOffRate,
      questions,
      recentSubmissions,
    }
  } catch (err) {
    console.error('Error getFormAnalytics:', err)
    return null
  }
}

function safeParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}
