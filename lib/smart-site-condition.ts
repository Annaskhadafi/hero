import { desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  employees,
  sites,
  smartSiteConditionMatrixTemplates,
  smartSiteConditionMatrixTemplateVersions,
  smartSiteConditionPhotos,
  smartSiteConditionReports,
  smartSiteConditionObservations,
  smartSiteConditionVisits,
} from '@/db/schema/hero'
import { getS3ObjectForProxy, getS3ObjectReadUrl } from '@/lib/s3-storage'

export const SMART_SITE_CONDITION_DEFAULT_SCHEMA_SNAPSHOT = {
  columns: [
    { key: 'aspectType', label: 'Aspek', required: true },
    { key: 'finding', label: 'Temuan', required: true },
    { key: 'riskLevel', label: 'Level Risiko', required: true },
    { key: 'confidence', label: 'Confidence', required: true },
    { key: 'tireImpact', label: 'Dampak Tire', required: true },
    { key: 'rootCause', label: 'Root Cause', required: true },
    { key: 'recommendation', label: 'Rekomendasi', required: true },
    { key: 'priority', label: 'Prioritas', required: true },
    { key: 'evidencePhotoIds', label: 'Evidence Photo IDs', required: true },
  ],
}

export const SMART_SITE_CONDITION_DEFAULT_RUBRIC = {
  priorities: {
    P1: 'Risiko tinggi, perlu tindakan cepat.',
    P2: 'Perlu perbaikan terjadwal.',
    P3: 'Perlu monitoring / optimasi.',
  },
  riskGuidance: {
    low: 'Dampak rendah, masih aman dioperasikan dengan kontrol normal.',
    medium: 'Ada potensi kenaikan wear / cut / heat dan butuh mitigasi.',
    high: 'Risiko signifikan terhadap keselamatan, produktivitas, atau umur casing.',
  },
}

export const SMART_SITE_CONDITION_DEFAULT_SLIDE_LAYOUT = {
  minimumSlides: 5,
  slides: [
    { key: 'cover', title: 'Cover' },
    { key: 'summary', title: 'Executive Summary' },
    { key: 'evidence', title: 'Evidence Highlights' },
    { key: 'matrix', title: 'Matrix Analisa' },
    { key: 'actions', title: 'Recommended Actions' },
  ],
}

export async function ensureSmartSiteConditionDefaultTemplate(employeeId: number) {
  let [template] = await db
    .select()
    .from(smartSiteConditionMatrixTemplates)
    .where(eq(smartSiteConditionMatrixTemplates.ownerEmployeeId, employeeId))
    .orderBy(desc(smartSiteConditionMatrixTemplates.updatedAt))
    .limit(1)

  if (!template) {
    ;[template] = await db
      .insert(smartSiteConditionMatrixTemplates)
      .values({
        ownerEmployeeId: employeeId,
        name: 'Default Smart Site Matrix',
        description: 'Template awal untuk analisa site condition tire mining.',
      })
      .returning()
  }

  let [version] = await db
    .select()
    .from(smartSiteConditionMatrixTemplateVersions)
    .where(eq(smartSiteConditionMatrixTemplateVersions.templateId, template.id))
    .orderBy(desc(smartSiteConditionMatrixTemplateVersions.versionNumber))
    .limit(1)

  if (!version) {
    ;[version] = await db
      .insert(smartSiteConditionMatrixTemplateVersions)
      .values({
        templateId: template.id,
        versionNumber: 1,
        schemaSnapshot: SMART_SITE_CONDITION_DEFAULT_SCHEMA_SNAPSHOT,
        promptSystem:
          'Analisa kondisi site tire mining berdasarkan foto, checklist, dan konteks operasi. Kembalikan matrix yang tegas, praktis, dan mudah diubah user.',
        promptRubric: SMART_SITE_CONDITION_DEFAULT_RUBRIC,
        slideLayoutSnapshot: SMART_SITE_CONDITION_DEFAULT_SLIDE_LAYOUT,
        createdByEmployeeId: employeeId,
      })
      .returning()
  }

  return { template, version }
}

export async function getSmartSiteConditionDashboardData(employeeId: number) {
  await ensureSmartSiteConditionDefaultTemplate(employeeId)

  const [visits, reports, templates, statsRow] = await Promise.all([
    db
      .select({
        id: smartSiteConditionVisits.id,
        locationName: smartSiteConditionVisits.locationName,
        inspectedAt: smartSiteConditionVisits.inspectedAt,
        status: smartSiteConditionVisits.status,
        weather: smartSiteConditionVisits.weather,
        siteName: sites.name,
        creatorName: employees.name,
      })
      .from(smartSiteConditionVisits)
      .innerJoin(sites, eq(smartSiteConditionVisits.siteId, sites.id))
      .innerJoin(employees, eq(smartSiteConditionVisits.createdByEmployeeId, employees.id))
      .where(eq(smartSiteConditionVisits.createdByEmployeeId, employeeId))
      .orderBy(desc(smartSiteConditionVisits.createdAt))
      .limit(50),
    db
      .select({
        id: smartSiteConditionReports.id,
        visitId: smartSiteConditionReports.visitId,
        status: smartSiteConditionReports.status,
        aiModel: smartSiteConditionReports.aiModel,
        updatedAt: smartSiteConditionReports.updatedAt,
      })
      .from(smartSiteConditionReports)
      .where(eq(smartSiteConditionReports.createdByEmployeeId, employeeId))
      .orderBy(desc(smartSiteConditionReports.updatedAt))
      .limit(50),
    db
      .select({
        id: smartSiteConditionMatrixTemplates.id,
        name: smartSiteConditionMatrixTemplates.name,
        isShared: smartSiteConditionMatrixTemplates.isShared,
        updatedAt: smartSiteConditionMatrixTemplates.updatedAt,
      })
      .from(smartSiteConditionMatrixTemplates)
      .where(eq(smartSiteConditionMatrixTemplates.ownerEmployeeId, employeeId))
      .orderBy(desc(smartSiteConditionMatrixTemplates.updatedAt))
      .limit(50),
    db
      .select({
        visitCount: sql<number>`count(*)`,
        readyCount:
          sql<number>`count(*) filter (where ${smartSiteConditionVisits.status} in ('ready', 'submitted', 'approved'))`,
      })
      .from(smartSiteConditionVisits)
      .where(eq(smartSiteConditionVisits.createdByEmployeeId, employeeId))
      .then((rows) => rows[0] ?? { visitCount: 0, readyCount: 0 }),
  ])

  return {
    visits,
    reports,
    templates,
    stats: {
      totalVisits: Number(statsRow.visitCount ?? 0),
      readyVisits: Number(statsRow.readyCount ?? 0),
      totalReports: reports.length,
      totalTemplates: templates.length,
    },
  }
}

export async function getSmartSiteConditionVisitDetail(visitId: number, employeeId: number) {
  const [visit] = await db
    .select({
      id: smartSiteConditionVisits.id,
      siteId: smartSiteConditionVisits.siteId,
      locationName: smartSiteConditionVisits.locationName,
      weather: smartSiteConditionVisits.weather,
      shiftLabel: smartSiteConditionVisits.shiftLabel,
      notes: smartSiteConditionVisits.notes,
      status: smartSiteConditionVisits.status,
      inspectedAt: smartSiteConditionVisits.inspectedAt,
      gpsLat: smartSiteConditionVisits.gpsLat,
      gpsLng: smartSiteConditionVisits.gpsLng,
      siteName: sites.name,
      createdByEmployeeId: smartSiteConditionVisits.createdByEmployeeId,
      creatorName: employees.name,
    })
    .from(smartSiteConditionVisits)
    .innerJoin(sites, eq(smartSiteConditionVisits.siteId, sites.id))
    .innerJoin(employees, eq(smartSiteConditionVisits.createdByEmployeeId, employees.id))
    .where(eq(smartSiteConditionVisits.id, visitId))
    .limit(1)

  if (!visit || visit.createdByEmployeeId !== employeeId) {
    return null
  }

  const observations = await db
    .select()
    .from(smartSiteConditionObservations)
    .where(eq(smartSiteConditionObservations.visitId, visitId))
    .orderBy(desc(smartSiteConditionObservations.createdAt))

  const observationIds = observations.map((item) => item.id)
  const photos = observationIds.length
    ? await db
        .select()
        .from(smartSiteConditionPhotos)
        .where(inArray(smartSiteConditionPhotos.observationId, observationIds))
        .orderBy(desc(smartSiteConditionPhotos.createdAt))
    : []

  const photosByObservationId = new Map<number, typeof photos>()
  for (const photo of photos) {
    const current = photosByObservationId.get(photo.observationId) ?? []
    current.push(photo)
    photosByObservationId.set(photo.observationId, current)
  }

  const [report] = await db
    .select()
    .from(smartSiteConditionReports)
    .where(eq(smartSiteConditionReports.visitId, visitId))
    .limit(1)

  const hydratedObservations = await Promise.all(
    observations.map(async (observation) => ({
      ...observation,
      photos: await Promise.all(
        (photosByObservationId.get(observation.id) ?? []).map(async (photo) => ({
          ...photo,
          displayUrl: (await getS3ObjectReadUrl(photo.photoUrl)) || photo.photoUrl,
        }))
      ),
    }))
  )

  return {
    visit,
    report,
    observations: hydratedObservations,
  }
}

export async function buildSmartSiteConditionAiPayload(visitId: number, employeeId: number) {
  const detail = await getSmartSiteConditionVisitDetail(visitId, employeeId)

  if (!detail) {
    throw new Error('Visit tidak ditemukan.')
  }

  const { version } = await ensureSmartSiteConditionDefaultTemplate(employeeId)

  const observations = await Promise.all(
    detail.observations.map(async (observation) => {
      const photos = await Promise.all(
        observation.photos.map(async (photo) => {
          const object = await getS3ObjectForProxy(photo.photoUrl)
          if (!object) return null
          return {
            photoId: photo.id,
            caption: photo.caption,
            locationLabel: observation.title,
            mimeType: object.contentType || 'image/jpeg',
            base64: Buffer.from(object.body).toString('base64'),
          }
        })
      )

      return {
        observationId: observation.id,
        aspectType: observation.aspectType,
        title: observation.title,
        score: observation.score,
        notes: observation.notes,
        soilType: observation.soilType,
        tireUsed: observation.tireUsed,
        photos: photos.filter((photo): photo is NonNullable<typeof photo> => Boolean(photo)),
      }
    })
  )

  return {
    visit: detail.visit,
    report: detail.report,
    payload: {
      locationName: detail.visit.locationName,
      weather: detail.visit.weather,
      shiftLabel: detail.visit.shiftLabel,
      notes: detail.visit.notes,
      tireSpecSnapshot: {},
      checklistSnapshot: {},
      templateVersionId: version.id,
      templateName: 'Default Smart Site Matrix',
      templateSchemaSnapshot: version.schemaSnapshot as Record<string, unknown>,
      templateRubricSnapshot: version.promptRubric as Record<string, unknown>,
      slideLayoutSnapshot: version.slideLayoutSnapshot as Record<string, unknown>,
      observations,
    },
  }
}
