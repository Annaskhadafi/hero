'use server'

import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  employees,
  hseIncidents,
  hseObservations,
  hsePtwPermits,
  ptwApprovals,
  sites,
  safetyCertifications,
  safetyIncidentReports,
  safetyIncidentSummaryMonthly,
  safetyIncidentSummaryYearly,
  safetyInspections,
  safetyManHours,
  safetyMonthlyManHours,
  safetyPerformanceMetrics,
  safetyWeeklyActivities,
} from '@/db/schema/hero'
import { heroJsas, heroJsaSteps } from '@/db/schema/jsa'
import { heroSafetyInductions } from '@/db/schema/safety-induction'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { buildSafetyCharts, buildSafetyKpis } from '@/lib/safety-dashboard/aggregations'

export interface MaestroPtwItem {
  id: number
  permitNumber: string
  projectName: string
  permitType: string
  location: string
  area: string
  startAt: string | null
  endAt: string | null
  applicantName: string
  fieldPicName: string
  authorizedByName: string
  status: string
  riskLevel: string
  description: string
  controlSteps: string
  ppe: string[]
  subTypes: Record<string, string[]> | string[]
  additionalNotes: string
  gasTestRequired: boolean
  isolationRequired: boolean
  attachments: string[]
  siteName: string
  siteId: number | null
  createdAt: string
  approvals: Array<{
    id: number
    stepOrder: number
    stepLabel: string
    approverName: string
    approverRole: string
    status: string
    signedAt: string | null
    signatureDataUrl: string | null
    remarks: string
  }>
}

export interface MaestroObservationItem {
  id: number
  category: string
  title: string
  location: string
  severity: string
  status: string
  notes: string
  observedAt: string
  siteName: string
  siteId: number
  reporterName: string
}

export interface MaestroJsaItem {
  id: string
  jsaNumber: string
  jobDescription: string
  equipmentNumber: string
  teamMembers: string
  riskLevel: string
  stepsCount: number
  createdAt: string
  steps: Array<{
    id: string
    stepOrder: number
    workStep: string
    hazard: string
    consequence: string
    control: string
    residualRisk: string
    pic: string
  }>
}

export interface MaestroSafetyData {
  customerName: string
  sitesList: Array<{ id: number; name: string }>
  kpis: {
    totalIncidentYtd: number
    fatality: number
    safeManHours: number
    certificationExpired: number
    nearMiss: number
    totalPtw: number
    activePtw: number
    approvedPtw: number
    totalObservations: number
    closedObservations: number
    zeroIncidentDays: number
  }
  charts: {
    incidentTrend: Array<Record<string, string | number>>
    certificationStatus: Array<{ name: string; value: number }>
    weeklyActivitiesByCategory: Array<{ category: string; count: number }>
    manHoursByLocation: Array<{ location: string; manHours: number; target: number }>
    monthlyManHoursTrend: Array<{ month: string; manHours: number }>
    performanceComparison: Array<Record<string, string | number>>
  }
  ptwList: MaestroPtwItem[]
  observations: MaestroObservationItem[]
  jsaList: MaestroJsaItem[]
}

export async function getMaestroSafetyDataAction(filters?: {
  siteId?: string
  status?: string
  search?: string
  year?: string
  month?: string
}): Promise<{ success: boolean; data?: MaestroSafetyData; error?: string }> {
  try {
    const session = await getMaestroServerSession()
    if (!session) {
      return { success: false, error: 'Sesi MAESTRO tidak ditemukan atau kedaluwarsa.' }
    }

    const { customer, access } = session
    const authorizedSiteIds = access.siteIds

    if (authorizedSiteIds.length === 0) {
      return {
        success: true,
        data: {
          customerName: customer.name,
          sitesList: [],
          kpis: {
            totalIncidentYtd: 0,
            fatality: 0,
            safeManHours: 0,
            certificationExpired: 0,
            nearMiss: 0,
            totalPtw: 0,
            activePtw: 0,
            approvedPtw: 0,
            totalObservations: 0,
            closedObservations: 0,
            zeroIncidentDays: 365,
          },
          charts: {
            incidentTrend: [],
            certificationStatus: [],
            weeklyActivitiesByCategory: [],
            manHoursByLocation: [],
            monthlyManHoursTrend: [],
            performanceComparison: [],
          },
          ptwList: [],
          observations: [],
          jsaList: [],
        },
      }
    }

    // 1. Authorized sites list
    const authorizedSites = await db
      .select({
        id: sites.id,
        name: sites.name,
      })
      .from(sites)
      .where(inArray(sites.id, authorizedSiteIds))
      .orderBy(sites.name)

    const siteIdFilter =
      filters?.siteId && filters.siteId !== 'all' && filters.siteId !== '0'
        ? parseInt(filters.siteId, 10)
        : null

    const targetSiteIds = siteIdFilter
      ? authorizedSiteIds.includes(siteIdFilter)
        ? [siteIdFilter]
        : authorizedSiteIds
      : authorizedSiteIds

    // 2. Query Safety Management tables for charts and analytics
    const [
      monthlySummaries,
      certifications,
      rawManHours,
      rawMonthlyManHours,
      weeklyActivities,
      performanceMetrics,
    ] = await Promise.all([
      db.select().from(safetyIncidentSummaryMonthly).orderBy(desc(safetyIncidentSummaryMonthly.month)),
      db.select().from(safetyCertifications).orderBy(desc(safetyCertifications.nextCertificationDate)),
      db.select().from(safetyManHours).orderBy(desc(safetyManHours.safetyManHours)),
      db.select().from(safetyMonthlyManHours).orderBy(desc(safetyMonthlyManHours.month)),
      db.select().from(safetyWeeklyActivities).orderBy(desc(safetyWeeklyActivities.activityDate)),
      db.select().from(safetyPerformanceMetrics).orderBy(desc(safetyPerformanceMetrics.year)),
    ])

    const safetyKpis = buildSafetyKpis({
      monthlySummaries: monthlySummaries as any,
      certifications: certifications as any,
      weeklyActivities: weeklyActivities as any,
      manHours: rawManHours as any,
    })

    const safetyCharts = buildSafetyCharts({
      monthlySummaries: monthlySummaries as any,
      certifications: certifications as any,
      weeklyActivities: weeklyActivities as any,
      manHours: rawManHours as any,
      monthlyManHours: rawMonthlyManHours as any,
      performanceMetrics: performanceMetrics as any,
    })

    // 2. Query PTW Permits
    const ptwRows = await db
      .select({
        id: hsePtwPermits.id,
        permitNumber: hsePtwPermits.permitNumber,
        projectName: hsePtwPermits.projectName,
        permitType: hsePtwPermits.permitType,
        location: hsePtwPermits.location,
        area: hsePtwPermits.area,
        startAt: hsePtwPermits.startAt,
        endAt: hsePtwPermits.endAt,
        applicantName: hsePtwPermits.applicantName,
        fieldPicName: hsePtwPermits.fieldPicName,
        authorizedByName: hsePtwPermits.authorizedByName,
        status: hsePtwPermits.status,
        riskLevel: hsePtwPermits.riskLevel,
        description: hsePtwPermits.description,
        controlSteps: hsePtwPermits.controlSteps,
        ppe: hsePtwPermits.ppe,
        subTypes: hsePtwPermits.subTypes,
        additionalNotes: hsePtwPermits.additionalNotes,
        gasTestRequired: hsePtwPermits.gasTestRequired,
        isolationRequired: hsePtwPermits.isolationRequired,
        attachments: hsePtwPermits.attachments,
        createdAt: hsePtwPermits.createdAt,
        creatorSiteId: employees.siteId,
        creatorSiteName: sites.name,
      })
      .from(hsePtwPermits)
      .leftJoin(employees, eq(hsePtwPermits.createdByEmployeeId, employees.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(
        or(
          inArray(employees.siteId, targetSiteIds),
          isNull(hsePtwPermits.createdByEmployeeId),
        ),
      )
      .orderBy(desc(hsePtwPermits.createdAt))
      .limit(100)

    // Query approval steps for PTW permits
    const permitIds = ptwRows.map((r) => r.id)
    const approvalsByPermit = new Map<number, any[]>()

    if (permitIds.length > 0) {
      const stepRows = await db
        .select({
          id: ptwApprovals.id,
          ptwPermitId: ptwApprovals.ptwPermitId,
          stepOrder: ptwApprovals.stepOrder,
          stepLabel: ptwApprovals.stepLabel,
          approverName: ptwApprovals.approverName,
          approverRole: ptwApprovals.approverRole,
          status: ptwApprovals.status,
          signedAt: ptwApprovals.signedAt,
          signatureDataUrl: ptwApprovals.signatureDataUrl,
          remarks: ptwApprovals.remarks,
        })
        .from(ptwApprovals)
        .where(inArray(ptwApprovals.ptwPermitId, permitIds))
        .orderBy(ptwApprovals.stepOrder)

      for (const step of stepRows) {
        if (!approvalsByPermit.has(step.ptwPermitId)) {
          approvalsByPermit.set(step.ptwPermitId, [])
        }
        approvalsByPermit.get(step.ptwPermitId)!.push({
          id: step.id,
          stepOrder: step.stepOrder,
          stepLabel: step.stepLabel,
          approverName: step.approverName,
          approverRole: step.approverRole,
          status: step.status,
          signedAt: step.signedAt ? step.signedAt.toISOString() : null,
          signatureDataUrl: step.signatureDataUrl,
          remarks: step.remarks || '',
        })
      }
    }

    const ptwList: MaestroPtwItem[] = ptwRows.map((row) => ({
      id: row.id,
      permitNumber: row.permitNumber,
      projectName: row.projectName,
      permitType: row.permitType || 'Hot Work',
      location: row.location || '',
      area: row.area || '',
      startAt: row.startAt ? row.startAt.toISOString() : null,
      endAt: row.endAt ? row.endAt.toISOString() : null,
      applicantName: row.applicantName || '',
      fieldPicName: row.fieldPicName || '',
      authorizedByName: row.authorizedByName || '',
      status: row.status || 'Draft',
      riskLevel: row.riskLevel || 'Medium',
      description: row.description || '',
      controlSteps: row.controlSteps || '',
      ppe: Array.isArray(row.ppe) ? row.ppe : [],
      subTypes: row.subTypes || [],
      additionalNotes: row.additionalNotes || '',
      gasTestRequired: Boolean(row.gasTestRequired),
      isolationRequired: Boolean(row.isolationRequired),
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      siteName: row.creatorSiteName || row.location || 'Site Utama',
      siteId: row.creatorSiteId || null,
      createdAt: row.createdAt.toISOString(),
      approvals: approvalsByPermit.get(row.id) || [],
    }))

    // 3. Query HSE Observations on customer's sites
    const observationRows = await db
      .select({
        id: hseObservations.id,
        category: hseObservations.category,
        title: hseObservations.title,
        location: hseObservations.location,
        severity: hseObservations.severity,
        status: hseObservations.status,
        notes: hseObservations.notes,
        observedAt: hseObservations.observedAt,
        siteId: hseObservations.siteId,
        siteName: sites.name,
        reporterName: employees.name,
      })
      .from(hseObservations)
      .innerJoin(sites, eq(hseObservations.siteId, sites.id))
      .leftJoin(employees, eq(hseObservations.employeeId, employees.id))
      .where(inArray(hseObservations.siteId, targetSiteIds))
      .orderBy(desc(hseObservations.observedAt))
      .limit(60)

    const observations: MaestroObservationItem[] = observationRows.map((obs) => ({
      id: obs.id,
      category: obs.category,
      title: obs.title,
      location: obs.location,
      severity: obs.severity,
      status: obs.status,
      notes: obs.notes,
      observedAt: obs.observedAt.toISOString(),
      siteName: obs.siteName,
      siteId: obs.siteId,
      reporterName: obs.reporterName || 'Inspektor HSE HERO',
    }))

    // 4. Query Standard JSA library
    const jsaRows = await db
      .select({
        id: heroJsas.id,
        jsaNumber: heroJsas.jsaNumber,
        jobDescription: heroJsas.jobDescription,
        equipmentNumber: heroJsas.equipmentNumber,
        teamMembers: heroJsas.teamMembers,
        riskLevel: heroJsas.riskLevel,
        createdAt: heroJsas.createdAt,
      })
      .from(heroJsas)
      .orderBy(desc(heroJsas.createdAt))
      .limit(20)

    const jsaIds = jsaRows.map((j) => j.id)
    const jsaStepsByJsa = new Map<string, any[]>()

    if (jsaIds.length > 0) {
      const stepRows = await db
        .select({
          id: heroJsaSteps.id,
          jsaId: heroJsaSteps.jsaId,
          stepOrder: heroJsaSteps.stepOrder,
          workStep: heroJsaSteps.workStep,
          hazard: heroJsaSteps.hazard,
          consequence: heroJsaSteps.consequence,
          control: heroJsaSteps.control,
          residualRisk: heroJsaSteps.residualRisk,
          pic: heroJsaSteps.pic,
        })
        .from(heroJsaSteps)
        .where(inArray(heroJsaSteps.jsaId, jsaIds))
        .orderBy(heroJsaSteps.stepOrder)

      for (const step of stepRows) {
        if (!jsaStepsByJsa.has(step.jsaId)) {
          jsaStepsByJsa.set(step.jsaId, [])
        }
        jsaStepsByJsa.get(step.jsaId)!.push({
          id: step.id,
          stepOrder: step.stepOrder,
          workStep: step.workStep,
          hazard: step.hazard,
          consequence: step.consequence,
          control: step.control,
          residualRisk: step.residualRisk,
          pic: step.pic,
        })
      }
    }

    const jsaList: MaestroJsaItem[] = jsaRows.map((jsa) => ({
      id: jsa.id,
      jsaNumber: jsa.jsaNumber,
      jobDescription: jsa.jobDescription,
      equipmentNumber: jsa.equipmentNumber,
      teamMembers: jsa.teamMembers,
      riskLevel: jsa.riskLevel,
      stepsCount: (jsaStepsByJsa.get(jsa.id) || []).length,
      createdAt: jsa.createdAt.toISOString(),
      steps: jsaStepsByJsa.get(jsa.id) || [],
    }))

    // Calculate KPIs
    const totalPtw = ptwList.length
    const activePtw = ptwList.filter((p) => p.status === 'Approved' || p.status === 'In Progress').length
    const approvedPtw = ptwList.filter((p) => p.status === 'Approved' || p.status === 'Completed').length
    const totalObservations = observations.length
    const closedObservations = observations.filter(
      (o) => o.status.toLowerCase() === 'closed' || o.status.toLowerCase() === 'selesai',
    ).length

    return {
      success: true,
      data: {
        customerName: customer.name,
        sitesList: authorizedSites,
        kpis: {
          ...safetyKpis,
          totalPtw,
          activePtw,
          approvedPtw,
          totalObservations,
          closedObservations,
          zeroIncidentDays: 365,
        },
        charts: safetyCharts,
        ptwList,
        observations,
        jsaList,
      },
    }
  } catch (err: unknown) {
    console.error('[MAESTRO] Error fetching safety data:', err)
    const message = err instanceof Error ? err.message : 'Gagal memuat data Safety & PTW.'
    return { success: false, error: message }
  }
}
