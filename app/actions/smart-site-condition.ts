"use server"

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import {
  smartSiteConditionAiJobs,
  smartSiteConditionPhotos,
  smartSiteConditionMatrixTemplateVersions,
  smartSiteConditionMatrixTemplates,
  smartSiteConditionObservations,
  smartSiteConditionReports,
  smartSiteConditionVisits,
} from '@/db/schema/hero'
import {
  SMART_SITE_CONDITION_DEFAULT_RUBRIC,
  SMART_SITE_CONDITION_DEFAULT_SCHEMA_SNAPSHOT,
  SMART_SITE_CONDITION_DEFAULT_SLIDE_LAYOUT,
  buildSmartSiteConditionAiPayload,
  ensureSmartSiteConditionDefaultTemplate,
} from '@/lib/smart-site-condition'
import { callSmartSiteConditionAiDraft } from '@/lib/smart-site-condition-ai'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { uploadAnyFileToS3 } from '@/lib/s3-storage'

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

export async function createSmartSiteConditionObservation(formData: FormData) {
  const employee = await getCurrentEmployee()

  if (!employee) {
    throw new Error('Session karyawan tidak ditemukan.')
  }

  const visitId = Number(formData.get('visitId'))
  const title = toOptionalText(formData.get('title'))

  if (!Number.isFinite(visitId) || !title) {
    throw new Error('Data observation belum lengkap.')
  }

  const [visit] = await db
    .select()
    .from(smartSiteConditionVisits)
    .where(eq(smartSiteConditionVisits.id, visitId))
    .limit(1)

  if (!visit || visit.createdByEmployeeId !== employee.id) {
    throw new Error('Visit tidak ditemukan atau tidak boleh diakses.')
  }

  const score = Number(formData.get('score') || 3)

  await db.insert(smartSiteConditionObservations).values({
    visitId,
    aspectType: toOptionalText(formData.get('aspectType')) || 'other',
    title,
    score: Number.isFinite(score) ? Math.min(5, Math.max(1, score)) : 3,
    notes: toOptionalText(formData.get('notes')),
    soilType: toOptionalText(formData.get('soilType')),
    tireUsed: toOptionalText(formData.get('tireUsed')),
    gpsLat: toOptionalNumber(formData.get('gpsLat')),
    gpsLng: toOptionalNumber(formData.get('gpsLng')),
  })

  await db
    .update(smartSiteConditionVisits)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(smartSiteConditionVisits.id, visitId))

  revalidatePath(`/dashboard/smart-site-condition/${visitId}`)

  return { success: true }
}

export async function uploadSmartSiteConditionPhoto(formData: FormData) {
  const employee = await getCurrentEmployee()

  if (!employee) {
    throw new Error('Session karyawan tidak ditemukan.')
  }

  const observationId = Number(formData.get('observationId'))
  const file = formData.get('file') as File | null

  if (!Number.isFinite(observationId) || !file) {
    throw new Error('Observation dan file wajib ada.')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar.')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran foto maksimal 5MB.')
  }

  const [observation] = await db
    .select({
      id: smartSiteConditionObservations.id,
      visitId: smartSiteConditionObservations.visitId,
    })
    .from(smartSiteConditionObservations)
    .where(eq(smartSiteConditionObservations.id, observationId))
    .limit(1)

  if (!observation) {
    throw new Error('Observation tidak ditemukan.')
  }

  const [visit] = await db
    .select()
    .from(smartSiteConditionVisits)
    .where(eq(smartSiteConditionVisits.id, observation.visitId))
    .limit(1)

  if (!visit || visit.createdByEmployeeId !== employee.id) {
    throw new Error('Visit tidak ditemukan atau tidak boleh diakses.')
  }

  const uploaded = await uploadAnyFileToS3(file, 'smart-site-condition')

  await db.insert(smartSiteConditionPhotos).values({
    observationId,
    photoUrl: uploaded.url,
    photoKey: uploaded.key,
    photoName: file.name,
    caption: toOptionalText(formData.get('caption')),
    gpsLat: toOptionalNumber(formData.get('gpsLat')),
    gpsLng: toOptionalNumber(formData.get('gpsLng')),
  })

  await db
    .update(smartSiteConditionVisits)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(smartSiteConditionVisits.id, observation.visitId))

  revalidatePath(`/dashboard/smart-site-condition/${observation.visitId}`)

  return { success: true }
}

export async function generateSmartSiteConditionAiDraft(visitId: number) {
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

  await bootstrapSmartSiteConditionReport(visitId)

  const { report, payload } = await buildSmartSiteConditionAiPayload(visitId, employee.id)

  if (!payload.observations.length) {
    throw new Error('Minimal harus ada satu observation.')
  }

  const reportId = report?.id

  if (!reportId) {
    throw new Error('Draft report belum tersedia.')
  }

  const [job] = await db
    .insert(smartSiteConditionAiJobs)
    .values({
      reportId,
      status: 'running',
      attempts: 1,
      startedAt: new Date(),
    })
    .returning()

  await db
    .update(smartSiteConditionVisits)
    .set({
      status: 'generating',
      updatedAt: new Date(),
    })
    .where(eq(smartSiteConditionVisits.id, visitId))

  try {
    const result = await callSmartSiteConditionAiDraft(payload)

    await db
      .update(smartSiteConditionReports)
      .set({
        status: 'generated',
        aiModel: result.model,
        aiRaw: result.rawContent,
        aiJson: result.content,
        executiveSummary: result.content.executiveSummary,
        finalNarrative: result.content.siteNarrative,
        finalMatrix: {
          matrixRows: result.content.matrixRows,
          recommendedActions: result.content.recommendedActions,
          slidePlan: result.content.slidePlan,
          keyFindings: result.content.keyFindings,
        },
        updatedByEmployeeId: employee.id,
        updatedAt: new Date(),
      })
      .where(eq(smartSiteConditionReports.id, reportId))

    await db
      .update(smartSiteConditionVisits)
      .set({
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(smartSiteConditionVisits.id, visitId))

    await db
      .update(smartSiteConditionAiJobs)
      .set({
        status: 'done',
        finishedAt: new Date(),
      })
      .where(eq(smartSiteConditionAiJobs.id, job.id))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI draft gagal dibuat.'

    await db
      .update(smartSiteConditionAiJobs)
      .set({
        status: 'failed',
        errorMessage: message,
        finishedAt: new Date(),
      })
      .where(eq(smartSiteConditionAiJobs.id, job.id))

    await db
      .update(smartSiteConditionVisits)
      .set({
        status: 'draft',
        updatedAt: new Date(),
      })
      .where(eq(smartSiteConditionVisits.id, visitId))

    throw error
  }

  revalidatePath(`/dashboard/smart-site-condition/${visitId}`)
  revalidatePath('/dashboard/smart-site-condition')

  return { success: true }
}
