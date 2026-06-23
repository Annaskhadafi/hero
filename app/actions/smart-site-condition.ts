"use server"

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import {
  smartSiteConditionMatrixTemplateVersions,
  smartSiteConditionMatrixTemplates,
  smartSiteConditionReports,
  smartSiteConditionVisits,
} from '@/db/schema/hero'
import {
  SMART_SITE_CONDITION_DEFAULT_RUBRIC,
  SMART_SITE_CONDITION_DEFAULT_SCHEMA_SNAPSHOT,
  SMART_SITE_CONDITION_DEFAULT_SLIDE_LAYOUT,
  ensureSmartSiteConditionDefaultTemplate,
} from '@/lib/smart-site-condition'
import { getCurrentEmployee } from '@/lib/get-current-employee'

function toOptionalText(value: FormDataEntryValue | null) {
  return `${value ?? ''}`.trim()
}

function toOptionalNumber(value: FormDataEntryValue | null) {
  const text = `${value ?? ''}`.trim()
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

export async function createSmartSiteConditionVisit(formData: FormData) {
  const employee = await getCurrentEmployee()

  if (!employee) {
    throw new Error('Session karyawan tidak ditemukan.')
  }

  const locationName = toOptionalText(formData.get('locationName'))
  if (!locationName) {
    throw new Error('Nama lokasi wajib diisi.')
  }

  const notes = toOptionalText(formData.get('notes'))
  const weather = toOptionalText(formData.get('weather'))
  const shiftLabel = toOptionalText(formData.get('shiftLabel'))
  const gpsLat = toOptionalNumber(formData.get('gpsLat'))
  const gpsLng = toOptionalNumber(formData.get('gpsLng'))

  await db.insert(smartSiteConditionVisits).values({
    siteId: employee.siteId,
    createdByEmployeeId: employee.id,
    locationName,
    notes,
    weather,
    shiftLabel,
    gpsLat,
    gpsLng,
  })

  revalidatePath('/dashboard/smart-site-condition')

  return { success: true }
}

export async function createSmartSiteConditionTemplate(formData: FormData) {
  const employee = await getCurrentEmployee()

  if (!employee) {
    throw new Error('Session karyawan tidak ditemukan.')
  }

  const name = toOptionalText(formData.get('name'))
  const description = toOptionalText(formData.get('description'))

  if (!name) {
    throw new Error('Nama template wajib diisi.')
  }

  const [template] = await db
    .insert(smartSiteConditionMatrixTemplates)
    .values({
      ownerEmployeeId: employee.id,
      name,
      description,
    })
    .returning()

  await db.insert(smartSiteConditionMatrixTemplateVersions).values({
    templateId: template.id,
    versionNumber: 1,
    schemaSnapshot: SMART_SITE_CONDITION_DEFAULT_SCHEMA_SNAPSHOT,
    promptSystem:
      'Analisa site condition tire mining berdasarkan foto, checklist, dan konteks operasi. Buat matrix yang tajam, singkat, dan operasional.',
    promptRubric: SMART_SITE_CONDITION_DEFAULT_RUBRIC,
    slideLayoutSnapshot: SMART_SITE_CONDITION_DEFAULT_SLIDE_LAYOUT,
    createdByEmployeeId: employee.id,
  })

  revalidatePath('/dashboard/smart-site-condition')

  return { success: true }
}

export async function bootstrapSmartSiteConditionReport(visitId: number) {
  const employee = await getCurrentEmployee()

  if (!employee) {
    throw new Error('Session karyawan tidak ditemukan.')
  }

  const [visit] = await db
    .select()
    .from(smartSiteConditionVisits)
    .where(eq(smartSiteConditionVisits.id, visitId))
    .limit(1)

  if (!visit || visit.createdByEmployeeId !== employee.id) {
    throw new Error('Visit tidak ditemukan atau tidak boleh diakses.')
  }

  const { version } = await ensureSmartSiteConditionDefaultTemplate(employee.id)
  const [existingReport] = await db
    .select()
    .from(smartSiteConditionReports)
    .where(eq(smartSiteConditionReports.visitId, visit.id))
    .limit(1)

  if (!existingReport) {
    await db.insert(smartSiteConditionReports).values({
      visitId: visit.id,
      templateVersionId: version.id,
      status: 'draft',
      executiveSummary:
        'Draft report dibuat. Langkah berikutnya: sambungkan AI vision + editor matrix + export PPTX/PDF.',
      finalNarrative:
        'Draft awal Smart Site Condition. Belum ada hasil inferensi AI pada tahap skeleton ini.',
      createdByEmployeeId: employee.id,
      updatedByEmployeeId: employee.id,
    })
  }

  await db
    .update(smartSiteConditionVisits)
    .set({
      status: 'ready',
      updatedAt: new Date(),
    })
    .where(eq(smartSiteConditionVisits.id, visit.id))

  revalidatePath('/dashboard/smart-site-condition')

  return { success: true }
}
