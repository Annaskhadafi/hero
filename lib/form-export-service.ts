import { db } from '@/db'
import {
  formTemplates,
  formTemplateVersions,
  formTemplateFields,
  formFieldOptions,
  formSubmissions,
  formSubmissionValues,
} from '@/db/schema/hero'
import { eq, desc, sql } from 'drizzle-orm'

export interface FormExportColumn {
  key: string
  label: string
  group?: string // e.g. 'Metadata' or 'Pertanyaan'
  fieldType?: string
}

export interface FormExportRow {
  id: number
  respondentName: string
  respondentEmail: string
  respondentPhone: string
  submittedAt: string
  duration: string
  [questionKey: string]: any
}

export interface FormExportData {
  templateId: number
  templateName: string
  slug: string
  category: string
  totalSubmissions: number
  columns: FormExportColumn[]
  rows: FormExportRow[]
}

function safeParse<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr) return fallback
  try {
    return JSON.parse(jsonStr)
  } catch {
    return fallback
  }
}

function formatDurationIndo(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 dtk'
  if (seconds < 60) return `${seconds} dtk`
  const minutes = Math.floor(seconds / 60)
  const remSec = seconds % 60
  return `${minutes} mnt ${remSec > 0 ? `${remSec} dtk` : ''}`
}

function formatDateTimeIndo(date: Date | null): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

export async function getFormResponsesExportData(templateId: number): Promise<FormExportData | null> {
  try {
    const tpls = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, templateId))
      .limit(1)

    if (tpls.length === 0) return null
    const tpl = tpls[0]

    // Ambil latest version
    const versions = await db
      .select()
      .from(formTemplateVersions)
      .where(eq(formTemplateVersions.templateId, templateId))
      .orderBy(desc(formTemplateVersions.versionNumber))
      .limit(1)

    const versionId = versions[0]?.id

    // Fields
    let dbFields: any[] = []
    if (versionId) {
      dbFields = await db
        .select()
        .from(formTemplateFields)
        .where(eq(formTemplateFields.versionId, versionId))
        .orderBy(formTemplateFields.sortOrder)
    }

    // Options for fields (e.g. single_choice, dropdown, multiple_choice)
    const fieldIds = dbFields.map((f) => f.id)
    let allOptions: any[] = []
    if (fieldIds.length > 0) {
      allOptions = await db
        .select()
        .from(formFieldOptions)
        .where(
          sql`${formFieldOptions.fieldId} IN (${sql.join(
            fieldIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        )
        .orderBy(formFieldOptions.sortOrder)
    }

    // Submissions
    const submissions = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.templateId, templateId))
      .orderBy(desc(formSubmissions.submittedAt), desc(formSubmissions.id))

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

    // Susun Kolom Excel
    const columns: FormExportColumn[] = [
      { key: 'id', label: 'ID Respon', group: 'Metadata' },
      { key: 'respondentName', label: 'Nama Responden', group: 'Metadata' },
      { key: 'respondentEmail', label: 'Email', group: 'Metadata' },
      { key: 'respondentPhone', label: 'No. Telepon / WA', group: 'Metadata' },
      { key: 'submittedAt', label: 'Waktu Kirim', group: 'Metadata' },
      { key: 'duration', label: 'Durasi Pengisian', group: 'Metadata' },
    ]

    // Map field definitions untuk lookup saat iterasi baris
    interface FieldLookup {
      fieldKey: string
      fieldType: string
      label: string
      options: Map<string, string> // value -> label
      likertRows?: { id: string; label: string }[]
      likertColumns?: { id: string; label: string }[]
    }

    const fieldLookups: FieldLookup[] = []

    for (const field of dbFields) {
      const config: any = safeParse(field.configJson, {})
      const opts = allOptions.filter((o) => o.fieldId === field.id)
      const optionsMap = new Map<string, string>()
      for (const o of opts) {
        optionsMap.set(o.optionValue, o.optionLabel || o.optionValue)
      }

      if (field.fieldType === 'likert_matrix' && Array.isArray(config.likertRows) && config.likertRows.length > 0) {
        fieldLookups.push({
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          label: field.label,
          options: optionsMap,
          likertRows: config.likertRows,
          likertColumns: config.likertColumns || [],
        })

        // Pecah per baris matrix jadi kolom terpisah
        for (const row of config.likertRows) {
          columns.push({
            key: `${field.fieldKey}__${row.id}`,
            label: `${field.label} - ${row.label}`,
            group: 'Pertanyaan',
            fieldType: 'likert_item',
          })
        }
      } else {
        fieldLookups.push({
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          label: field.label,
          options: optionsMap,
        })

        columns.push({
          key: field.fieldKey,
          label: field.label,
          group: 'Pertanyaan',
          fieldType: field.fieldType,
        })
      }
    }

    // Susun Baris Data
    const rows: FormExportRow[] = submissions.map((sub) => {
      const valuesForSub = allValues.filter((v) => v.submissionId === sub.id)
      const row: FormExportRow = {
        id: sub.id,
        respondentName: sub.respondentName || 'Anonim',
        respondentEmail: sub.respondentEmail || '-',
        respondentPhone: sub.respondentPhone || '-',
        submittedAt: formatDateTimeIndo(sub.submittedAt || sub.createdAt),
        duration: formatDurationIndo(sub.durationSeconds),
      }

      for (const fl of fieldLookups) {
        const val = valuesForSub.find((v) => v.fieldKey === fl.fieldKey)

        if (fl.fieldType === 'likert_matrix' && fl.likertRows) {
          const parsedMatrix = safeParse<Record<string, string>>(val?.jsonValue, {})
          for (const lr of fl.likertRows) {
            const selectedColId = parsedMatrix[lr.id]
            if (!selectedColId) {
              row[`${fl.fieldKey}__${lr.id}`] = '-'
              continue
            }
            const col = fl.likertColumns?.find((c) => c.id === selectedColId || c.label === selectedColId)
            row[`${fl.fieldKey}__${lr.id}`] = col ? col.label : selectedColId
          }
          continue
        }

        if (!val) {
          row[fl.fieldKey] = '-'
          continue
        }

        // Tipe Multiple Choice (checkboxes)
        if (fl.fieldType === 'multiple_choice') {
          let selectedValues: string[] = []
          if (val.jsonValue) {
            try {
              const parsed = JSON.parse(val.jsonValue)
              if (Array.isArray(parsed)) {
                selectedValues = parsed
              }
            } catch {
              selectedValues = val.valueText ? val.valueText.split(',') : []
            }
          } else if (val.valueText) {
            selectedValues = val.valueText.split(',')
          }

          if (selectedValues.length === 0) {
            row[fl.fieldKey] = '-'
          } else {
            const labels = selectedValues.map((v) => {
              const clean = v.trim()
              return fl.options.get(clean) || clean
            })
            row[fl.fieldKey] = labels.join(', ')
          }
          continue
        }

        // Tipe Single Choice atau Dropdown
        if (['single_choice', 'dropdown'].includes(fl.fieldType)) {
          const raw = val.valueText?.trim() || ''
          row[fl.fieldKey] = fl.options.get(raw) || val.displayValue || raw || '-'
          continue
        }

        // Tipe Numerik / Star Rating / Slider / NPS
        if (['number', 'star_rating', 'slider', 'nps'].includes(fl.fieldType)) {
          if (val.numericValue !== null && val.numericValue !== undefined) {
            row[fl.fieldKey] = val.numericValue
          } else if (val.valueText) {
            const parsed = parseFloat(val.valueText)
            row[fl.fieldKey] = isNaN(parsed) ? val.valueText : parsed
          } else {
            row[fl.fieldKey] = '-'
          }
          continue
        }

        // Default text, date, time, file_upload
        row[fl.fieldKey] = val.displayValue || val.valueText || '-'
      }

      return row
    })

    return {
      templateId: tpl.id,
      templateName: tpl.name,
      slug: tpl.slug || tpl.templateKey,
      category: tpl.category,
      totalSubmissions: rows.length,
      columns,
      rows,
    }
  } catch (error) {
    console.error('Error getFormResponsesExportData:', error)
    return null
  }
}
