import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm'
import { db } from '@/db'
import {
  approvalMatrices,
  approvalMatrixSteps,
  employees,
  masterDepartments,
  masterSections,
  orgChartNodes,
  orgChartStructures,
  orgNodeAssignments,
  sites,
} from '@/db/schema/hero'

type ApprovalContext = {
  employeeId: number
  employeeName: string
  siteId: number
  siteName: string
  siteLocation: string
  siteHeadEmployeeId: number | null
  departmentId: number | null
  departmentName: string | null
  sectionId: number | null
  positionId: number | null
  directManagerId: number | null
  requesterDirectManagerId?: number | null
  applicantEmployeeId?: number | null
  activityType: string
  priority: string
  overtimeMinutes: number
  transactionType: string
  at: Date
}

export type ResolvedApprovalStep = {
  stepOrder: number
  label: string
  approverName: string
  approverEmployeeId: number | null
  approverNodeId: number | null
  approvalMatrixStepId?: number | null
  approvalMode?: string | null
  resolutionSource:
    | 'matrix'
    | 'delegate'
    | 'fallback_node'
    | 'escalation'
    | 'legacy_manager'
    | 'legacy_site_pjo'
    | 'legacy_site_foreman'
    | 'apd_site_pjo'
    | 'apd_head_section'
    | 'form_wo_custom'
    | 'apd_hse_site'
    | 'apd_specific_approver'
    | 'vacant'
  canDelegate: boolean
  slaHours: number
  nodeLabel?: string | null
  fallbackLabel?: string | null
  escalationLabel?: string | null
}

export type ApprovalRouteResolution = {
  matrixId: number | null
  matrixName: string | null
  structureId: number | null
  structureName: string | null
  transactionType: string
  warnings: string[]
  steps: ResolvedApprovalStep[]
}

type ResolveApprovalRouteInput = {
  employeeId: number
  activityType: string
  priority: string
  overtimeMinutes: number
  transactionType?: string
  customerName?: string
  siteId?: number | null
  siteName?: string | null
  sectionId?: number | null
  departmentId?: number | null
  at?: Date
}

function normalizeValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function isCentralServiceDepartment(departmentName: string | null) {
  return normalizeValue(departmentName).replace(/s$/, '') === 'central service'
}

function isJakartaOrBalikpapanSite(siteName: string, siteLocation: string) {
  const source = `${siteName} ${siteLocation}`.toLowerCase()
  return source.includes('jakarta') || source.includes('balikpapan')
}

function isBetweenWindow(target: Date, start: Date | null, end: Date | null) {
  if (start && target < start) {
    return false
  }

  if (end && target > end) {
    return false
  }

  return true
}

function buildVacantApproverLabel(nodeLabel: string | null, fallbackLabel: string) {
  return nodeLabel?.trim() ? `${nodeLabel} (vacant)` : fallbackLabel
}

function getMatrixSpecificityScore(
  matrix: {
    siteId: number | null
    departmentId: number | null
    sectionId: number | null
    requesterPositionId: number | null
    activityType: string
    priority: string
    transactionType?: string | null
    minOvertimeMinutes: number
    maxOvertimeMinutes: number | null
  },
  context: ApprovalContext
) {
  let score = 0

  if (
    matrix.transactionType &&
    (normalizeValue(matrix.transactionType) === normalizeValue(context.transactionType) ||
      (normalizeValue(matrix.transactionType).startsWith('apd-request') &&
        normalizeValue(context.transactionType).startsWith('apd-request')))
  ) {
    score += 128
  }

  if (matrix.siteId != null) {
    if (matrix.siteId !== context.siteId) {
      return -1
    }

    score += 64
  }

  if (matrix.departmentId != null) {
    if (matrix.departmentId !== context.departmentId) {
      return -1
    }

    score += 32
  }

  if (matrix.sectionId != null) {
    if (matrix.sectionId !== context.sectionId) {
      if (
        !context.transactionType.startsWith('form_wo') &&
        !context.transactionType.startsWith('five_r')
      ) {
        return -1
      }
    } else {
      score += 16
    }
  }

  if (matrix.requesterPositionId != null) {
    if (matrix.requesterPositionId !== context.positionId) {
      return -1
    }

    score += 8
  }

  const matrixActivityType = normalizeValue(matrix.activityType)
  if (matrixActivityType) {
    if (matrixActivityType !== normalizeValue(context.activityType)) {
      return -1
    }

    score += 4
  }

  const matrixPriority = normalizeValue(matrix.priority)
  if (matrixPriority && matrixPriority !== 'any') {
    if (matrixPriority !== normalizeValue(context.priority)) {
      return -1
    }

    score += 2
  }

  if (context.overtimeMinutes < matrix.minOvertimeMinutes) {
    return -1
  }

  if (matrix.maxOvertimeMinutes != null && context.overtimeMinutes > matrix.maxOvertimeMinutes) {
    return -1
  }

  if (matrix.maxOvertimeMinutes != null) {
    score += 1
  }

  return score
}

async function getApprovalContext(input: ResolveApprovalRouteInput): Promise<ApprovalContext> {
  const [employee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      siteId: employees.siteId,
      siteName: sites.name,
      siteLocation: sites.location,
      siteHeadEmployeeId: sites.headEmployeeId,
      departmentId: employees.departmentId,
      departmentName: masterDepartments.name,
      sectionId: employees.sectionId,
      positionId: employees.positionId,
      directManagerId: employees.directManagerId,
    })
    .from(employees)
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .where(eq(employees.id, input.employeeId))
    .limit(1)

  if (!employee) {
    throw new Error('Employee approval context tidak ditemukan.')
  }

  let finalSiteId = employee.siteId
  let finalSiteName = employee.siteName ?? ''
  let finalSiteLocation = employee.siteLocation ?? ''
  let finalSiteHeadEmployeeId = employee.siteHeadEmployeeId ?? null

  if (input.siteId) {
    const [s] = await db
      .select({ id: sites.id, name: sites.name, location: sites.location, headEmployeeId: sites.headEmployeeId })
      .from(sites)
      .where(eq(sites.id, input.siteId))
      .limit(1)
    if (s) {
      finalSiteId = s.id
      finalSiteName = s.name
      finalSiteLocation = s.location ?? ''
      finalSiteHeadEmployeeId = s.headEmployeeId ?? null
    }
  } else if (input.siteName && input.siteName.trim() && input.siteName !== '-') {
    const trimmed = input.siteName.trim()
    const [s] = await db
      .select({ id: sites.id, name: sites.name, location: sites.location, headEmployeeId: sites.headEmployeeId })
      .from(sites)
      .where(or(ilike(sites.name, `%${trimmed}%`), ilike(sites.location, `%${trimmed}%`)))
      .limit(1)
    if (s) {
      finalSiteId = s.id
      finalSiteName = s.name
      finalSiteLocation = s.location ?? ''
      finalSiteHeadEmployeeId = s.headEmployeeId ?? null
    }
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    siteId: finalSiteId,
    siteName: finalSiteName,
    siteLocation: finalSiteLocation,
    siteHeadEmployeeId: finalSiteHeadEmployeeId,
    departmentId: input.departmentId !== undefined ? input.departmentId : (employee.departmentId ?? null),
    departmentName: employee.departmentName ?? null,
    sectionId: input.sectionId !== undefined ? input.sectionId : (employee.sectionId ?? null),
    positionId: employee.positionId ?? null,
    directManagerId: employee.directManagerId ?? null,
    activityType: input.activityType,
    priority: input.priority,
    overtimeMinutes: input.overtimeMinutes,
    transactionType: (() => {
      const custLower = (input.customerName || '').toLowerCase().trim()
      const isMvc =
        custLower.includes('trakindo') ||
        custLower.includes('cipta krida') ||
        custLower.includes('ciptakrida') ||
        custLower.includes('ckb') ||
        custLower.includes('mvc') ||
        /\bck\b/i.test(custLower) ||
        custLower === 'ck' ||
        custLower.startsWith('ck ') ||
        custLower.endsWith(' ck') ||
        custLower.includes(' ck ') ||
        custLower.includes('pt ck') ||
        custLower.includes('pt. ck') ||
        custLower.includes('pt.ck')
      const baseType = input.transactionType ?? 'activity'
      if (
        baseType === 'form_wo_service' ||
        baseType === 'form_wo_service_other' ||
        baseType === 'form_wo_service_mvc'
      ) {
        return isMvc ? 'form_wo_service_mvc' : 'form_wo_service_other'
      }
      return baseType
    })(),
    at: input.at ?? new Date(),
  }
}

async function resolveLegacyFallbackRoute(
  context: ApprovalContext
): Promise<ApprovalRouteResolution> {
  const warnings = [
    'Approval matrix aktif tidak ditemukan. Sistem memakai fallback legacy approver.',
  ]

  const centralServiceSitePjoRoute = await resolveCentralServiceSitePjoRoute(context, warnings)
  if (centralServiceSitePjoRoute) {
    return centralServiceSitePjoRoute
  }

  if (
    isCentralServiceDepartment(context.departmentName) &&
    !isJakartaOrBalikpapanSite(context.siteName, context.siteLocation)
  ) {
    warnings.push(
      'Head Area/PJO Site aktif belum diset di master Lokasi Site untuk Central Service site ini.'
    )
  }

  if (context.directManagerId) {
    const [manager] = await db
      .select({
        id: employees.id,
        name: employees.name,
      })
      .from(employees)
      .where(and(eq(employees.id, context.directManagerId), eq(employees.isActive, true)))
      .limit(1)

    if (manager) {
      return {
        matrixId: null,
        matrixName: null,
        structureId: null,
        structureName: null,
        transactionType: context.transactionType,
        warnings,
        steps: [
          {
            stepOrder: 1,
            label: 'Direct Manager',
            approverName: manager.name,
            approverEmployeeId: manager.id,
            approverNodeId: null,
            approvalMatrixStepId: null,
            approvalMode: 'sequential',
            resolutionSource: 'legacy_manager',
            canDelegate: true,
            slaHours: 24,
            nodeLabel: null,
            fallbackLabel: null,
            escalationLabel: null,
          },
        ],
      }
    }
  }

  const [siteForeman] = await db
    .select({
      id: employees.id,
      name: employees.name,
    })
    .from(employees)
    .where(
      and(
        eq(employees.siteId, context.siteId),
        eq(employees.isActive, true),
        eq(employees.jobTitle, 'Foreman')
      )
    )
    .orderBy(asc(employees.name))
    .limit(1)

  if (siteForeman) {
    return {
      matrixId: null,
      matrixName: null,
      structureId: null,
      structureName: null,
      transactionType: context.transactionType,
      warnings,
      steps: [
        {
          stepOrder: 1,
          label: 'Site Approver',
          approverName: siteForeman.name,
          approverEmployeeId: siteForeman.id,
          approverNodeId: null,
          approvalMatrixStepId: null,
          approvalMode: 'sequential',
          resolutionSource: 'legacy_site_foreman',
          canDelegate: true,
          slaHours: 24,
          nodeLabel: null,
          fallbackLabel: null,
          escalationLabel: null,
        },
      ],
    }
  }

  return {
    matrixId: null,
    matrixName: null,
    structureId: null,
    structureName: null,
    transactionType: context.transactionType,
    warnings: [...warnings, 'Belum ada approver aktif untuk fallback legacy.'],
    steps: [
      {
        stepOrder: 1,
        label: 'Unassigned Approver',
        approverName: 'Unassigned Approver',
        approverEmployeeId: null,
        approverNodeId: null,
        approvalMatrixStepId: null,
        approvalMode: 'sequential',
        resolutionSource: 'vacant',
        canDelegate: false,
        slaHours: 24,
        nodeLabel: null,
        fallbackLabel: null,
        escalationLabel: null,
      },
    ],
  }
}

async function resolveCentralServiceSitePjoRoute(
  context: ApprovalContext,
  warnings: string[]
): Promise<ApprovalRouteResolution | null> {
  const centralServiceOutsideMainSite =
    isCentralServiceDepartment(context.departmentName) &&
    !isJakartaOrBalikpapanSite(context.siteName, context.siteLocation)

  if (!centralServiceOutsideMainSite) {
    return null
  }

  const siteApprovers = await db
    .select({
      id: employees.id,
      name: employees.name,
    })
    .from(employees)
    .where(
      and(
        eq(employees.id, context.siteHeadEmployeeId ?? 0),
        eq(employees.siteId, context.siteId),
        eq(employees.isActive, true)
      )
    )
    .limit(1)
  const pjo = siteApprovers[0] ?? null

  if (!pjo) {
    return null
  }

  return {
    matrixId: null,
    matrixName: null,
    structureId: null,
    structureName: null,
    transactionType: context.transactionType,
    warnings: [
      ...warnings,
      'Central Service di site luar Jakarta/Balikpapan diarahkan langsung ke Head Area/PJO Site dari master Lokasi Site.',
    ],
    steps: [
      {
        stepOrder: 1,
        label: 'PJO Site',
        approverName: pjo.name,
        approverEmployeeId: pjo.id,
        approverNodeId: null,
        approvalMatrixStepId: null,
        approvalMode: 'sequential',
        resolutionSource: 'legacy_site_pjo',
        canDelegate: true,
        slaHours: 24,
        nodeLabel: null,
        fallbackLabel: null,
        escalationLabel: null,
      },
    ],
  }
}


async function resolveFormWoServiceApprovalRoute(
  context: ApprovalContext,
  customerName?: string
): Promise<ApprovalRouteResolution> {
  const steps: ResolvedApprovalStep[] = []

  const custUpper = (customerName || '').toUpperCase().trim()
  const isMvcCompany =
    custUpper.includes('TRAKINDO') ||
    custUpper.includes('CIPTA KRIDA') ||
    custUpper.includes('CIPTAKRIDA') ||
    custUpper.includes('CKB') ||
    custUpper.includes('MVC') ||
    /\bCK\b/.test(custUpper) ||
    custUpper === 'CK' ||
    custUpper.startsWith('CK ') ||
    custUpper.endsWith(' CK') ||
    custUpper.includes(' CK ') ||
    custUpper.includes('PT CK') ||
    custUpper.includes('PT. CK') ||
    custUpper.includes('PT.CK')

  const stage1Approver = isMvcCompany
    ? { id: 955, name: 'Apriyanto', label: 'Service Operation MVC Coord. SPV' }
    : { id: 15, name: 'Junaidi', label: 'Service Operation Others Coord. SPV' }

  // Step 1: Disetujui Oleh (Apriyanto / Junaidi based on company)
  steps.push({
    stepOrder: 1,
    label: stage1Approver.label,
    approverName: stage1Approver.name,
    approverEmployeeId: stage1Approver.id,
    approverNodeId: null,
    approvalMatrixStepId: null,
    approvalMode: 'sequential',
    resolutionSource: 'form_wo_service',
    canDelegate: true,
    slaHours: 24,
    nodeLabel: stage1Approver.label,
    fallbackLabel: null,
    escalationLabel: null,
  })

  // Step 2: Diperiksa Oleh (Andika - Team Billing)
  steps.push({
    stepOrder: 2,
    label: 'Team Billing',
    approverName: 'Andika Ferdiansyah',
    approverEmployeeId: 1102,
    approverNodeId: null,
    approvalMatrixStepId: null,
    approvalMode: 'sequential',
    resolutionSource: 'form_wo_service',
    canDelegate: true,
    slaHours: 24,
    nodeLabel: 'Team Billing',
    fallbackLabel: null,
    escalationLabel: null,
  })

  // Step 3: Disetujui Oleh (Ali Rahman - Inventory & Warehouse Management SPV)
  steps.push({
    stepOrder: 3,
    label: 'Inventory & Warehouse Management SPV',
    approverName: 'Ali Rahman',
    approverEmployeeId: 979,
    approverNodeId: null,
    approvalMatrixStepId: null,
    approvalMode: 'sequential',
    resolutionSource: 'form_wo_service',
    canDelegate: true,
    slaHours: 24,
    nodeLabel: 'Inventory & Warehouse Management SPV',
    fallbackLabel: null,
    escalationLabel: null,
  })

  return {
    matrixId: null,
    matrixName: null,
    structureId: null,
    structureName: null,
    transactionType: context.transactionType,
    warnings: ['Approval Form WO Service (3-Stage Approver Matrix)'],
    steps,
  }
}

async function resolveFormWoRepairRetreadApprovalRoute(
  context: ApprovalContext
): Promise<ApprovalRouteResolution> {
  const steps: ResolvedApprovalStep[] = []

  // Step 1: Diketahui Oleh (QC / Leader - mode "any", default Renaldo)
  steps.push({
    stepOrder: 1,
    label: 'QC / Leader',
    approverName: 'Renaldo',
    approverEmployeeId: 991,
    approverNodeId: null,
    approvalMatrixStepId: null,
    approvalMode: 'sequential',
    resolutionSource: 'form_wo_repair_retread',
    canDelegate: true,
    slaHours: 24,
    nodeLabel: 'QC / Leader',
    fallbackLabel: null,
    escalationLabel: null,
  })

  // Step 2: Disetujui Oleh (Ary Maulana - Repair Retread Operation SPV)
  steps.push({
    stepOrder: 2,
    label: 'Repair Retread Operation SPV',
    approverName: 'Ary Maulana',
    approverEmployeeId: 996,
    approverNodeId: null,
    approvalMatrixStepId: null,
    approvalMode: 'sequential',
    resolutionSource: 'form_wo_repair_retread',
    canDelegate: true,
    slaHours: 24,
    nodeLabel: 'Repair Retread Operation SPV',
    fallbackLabel: null,
    escalationLabel: null,
  })

  // Step 3: Diperiksa Oleh (Andika - Team Billing)
  steps.push({
    stepOrder: 3,
    label: 'Team Billing',
    approverName: 'Andika Ferdiansyah',
    approverEmployeeId: 1102,
    approverNodeId: null,
    approvalMatrixStepId: null,
    approvalMode: 'sequential',
    resolutionSource: 'form_wo_repair_retread',
    canDelegate: true,
    slaHours: 24,
    nodeLabel: 'Team Billing',
    fallbackLabel: null,
    escalationLabel: null,
  })

  // Step 4: Disetujui Oleh (Ali Rahman - Inventory & Warehouse Management SPV)
  steps.push({
    stepOrder: 4,
    label: 'Inventory & Warehouse Management SPV',
    approverName: 'Ali Rahman',
    approverEmployeeId: 979,
    approverNodeId: null,
    approvalMatrixStepId: null,
    approvalMode: 'sequential',
    resolutionSource: 'form_wo_repair_retread',
    canDelegate: true,
    slaHours: 24,
    nodeLabel: 'Inventory & Warehouse Management SPV',
    fallbackLabel: null,
    escalationLabel: null,
  })

  return {
    matrixId: null,
    matrixName: null,
    structureId: null,
    structureName: null,
    transactionType: context.transactionType,
    warnings: ['Approval Form WO Repair & Retread (4-Stage Approver Matrix)'],
    steps,
  }
}


async function resolveApdApprovalRoute(context: ApprovalContext): Promise<ApprovalRouteResolution> {
  const steps: ResolvedApprovalStep[] = []
  let stepOrder = 1

  // For APD requests: 1-step routing (Admin CP / HSE / PJO)
  if (context.transactionType === 'apd-request-apd' || context.transactionType === 'apd-request') {
    // 1. Kategori Admin CP (13 Site)
    const adminCpSiteIds = [126, 142, 135, 132, 213, 212, 141, 148, 143, 147, 211, 146, 137]
    // 2. Kategori HSE (5 Site)
    const hseSiteIds = [133, 131, 129, 128, 140]

    const siteId = context.siteId ?? 0

    if (adminCpSiteIds.includes(siteId)) {
      // Admin CP logic:
      // - Service MVC (33) & Others (34) -> Muhammad As'ar Fauzan (1099, Serviceman)
      // - Repair / Retread (29) -> Arjun Zahiri Mursith (1039, Repairman)
      // - Technical Operation / TE (37) -> Muhammad Abian Husain (1094, Technical Engineer)
      let approverEmpId = 1099
      if (context.sectionId === 29) {
        approverEmpId = 1039
      } else if (context.sectionId === 37) {
        approverEmpId = 1094
      }

      const [approver] = await db
        .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle, email: employees.email })
        .from(employees)
        .where(and(eq(employees.id, approverEmpId), eq(employees.isActive, true)))
        .limit(1)

      if (approver) {
        steps.push({
          stepOrder: stepOrder++,
          label: approver.jobTitle || 'Serviceman',
          approverName: approver.name,
          approverEmployeeId: approver.id,
          approverNodeId: null,
          approvalMatrixStepId: null,
          approvalMode: 'sequential',
          resolutionSource: 'apd_admin_cp',
          canDelegate: true,
          slaHours: 24,
          nodeLabel: approver.jobTitle,
          fallbackLabel: null,
          escalationLabel: null,
        })
      }
    } else if (hseSiteIds.includes(siteId)) {
      // 5 HSE Sites
      const hseMap: Record<number, number> = {
        133: 1374, // CK BIB -> Fathurrahman Sufi (HSE Officer)
        131: 1285, // CK BMB -> Danny Hangga Irawan (HSE Officer)
        129: 1380, // CK KIM -> Rizky Rahmadani (HSE Officer)
        128: 1308, // CK MHU -> Irfan Rivai Remba (HSE)
        140: 1307, // Vale -> Muhammad Wahyu Ichsan (HSE Officer)
      }
      const hseEmpId = hseMap[siteId]
      const [hseApprover] = await db
        .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle, email: employees.email })
        .from(employees)
        .where(and(eq(employees.id, hseEmpId), eq(employees.isActive, true)))
        .limit(1)

      if (hseApprover) {
        steps.push({
          stepOrder: stepOrder++,
          label: hseApprover.jobTitle || 'HSE Officer',
          approverName: hseApprover.name,
          approverEmployeeId: hseApprover.id,
          approverNodeId: null,
          approvalMatrixStepId: null,
          approvalMode: 'sequential',
          resolutionSource: 'apd_hse_site',
          canDelegate: true,
          slaHours: 24,
          nodeLabel: hseApprover.jobTitle,
          fallbackLabel: null,
          escalationLabel: null,
        })
      }
    } else {
      // 13 PJO Sites
      const pjoMap: Record<number, number> = {
        138: 454,  // AMM Mifa Holing -> Adit Prasetyo (Technical Engineer)
        144: 1057, // AMM Tabang -> Singgih Wiyono (Technical Engineer)
        210: 1212, // BUMA Tanjung -> Dowy Pratama Sita (Technical Engineer)
        150: 1250, // CDE - Bengkulu -> Rakha Dwi Saputra (Repairman)
        145: 1189, // CK MIFA -> Fachri Husein (Serviceman)
        125: 1375, // Jakarta -> Ade Saharu (HSE Officer)
        151: 955,  // Makassar -> Apriyanto (Head of Service MVC)
        134: 96,   // Palembang -> Febrial Hariri (Leader Technical Sumatera)
        136: 96,   // Pekanbaru -> Febrial Hariri (Leader Technical Sumatera)
        149: 1180, // PPA BIB -> Muchamat Nurkolis Majid (Technical Engineer)
        127: 1164, // Sangatta -> Saipudin (HSE Leader)
        139: 955,  // Sebamban -> Apriyanto (Head of Service MVC)
        130: 97,   // Tj. Adaro -> Tommy Indra Aldiny Rambe (Technical Leader)
      }
      let pjoEmpId: number | null = pjoMap[siteId] ?? context.siteHeadEmployeeId ?? null
      if (!pjoEmpId && siteId) {
        const [siteRow] = await db.select({ headEmployeeId: sites.headEmployeeId }).from(sites).where(eq(sites.id, siteId)).limit(1)
        pjoEmpId = siteRow?.headEmployeeId ?? null
      }
      if (!pjoEmpId) pjoEmpId = context.requesterDirectManagerId ?? 955

      const [pjoApprover] = await db
        .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle, email: employees.email })
        .from(employees)
        .where(and(eq(employees.id, pjoEmpId), eq(employees.isActive, true)))
        .limit(1)

      if (pjoApprover) {
        steps.push({
          stepOrder: stepOrder++,
          label: pjoApprover.jobTitle || 'PJO Leader',
          approverName: pjoApprover.name,
          approverEmployeeId: pjoApprover.id,
          approverNodeId: null,
          approvalMatrixStepId: null,
          approvalMode: 'sequential',
          resolutionSource: 'apd_site_pjo',
          canDelegate: true,
          slaHours: 24,
          nodeLabel: pjoApprover.jobTitle,
          fallbackLabel: null,
          escalationLabel: null,
        })
      }
    }
  } else {
    // For Material/Tools: PJO → Section Head
    // Step 1: PJO Site
    let pjoEmpId: number | null = context.siteHeadEmployeeId ?? null
    if (!pjoEmpId && context.siteId) {
      const [siteRow] = await db.select({ headEmployeeId: sites.headEmployeeId }).from(sites).where(eq(sites.id, context.siteId)).limit(1)
      pjoEmpId = siteRow?.headEmployeeId ?? null
    }
    if (!pjoEmpId) pjoEmpId = context.requesterDirectManagerId ?? 955 // Apriyanto / Direct Manager fallback

    const siteApprovers = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(and(eq(employees.id, pjoEmpId), eq(employees.isActive, true)))
      .limit(1)
    const pjo = siteApprovers[0]

    if (pjo) {
      steps.push({
        stepOrder: stepOrder++,
        label: 'Atasan Di Site (PJO)',
        approverName: pjo.name,
        approverEmployeeId: pjo.id,
        approverNodeId: null,
        approvalMatrixStepId: null,
        approvalMode: 'sequential',
        resolutionSource: 'apd_site_pjo',
        canDelegate: true,
        slaHours: 24,
        nodeLabel: null,
        fallbackLabel: null,
        escalationLabel: null,
      })
    }

    // Step 2: Head Section (Dinamis sesuai section pemohon)
    let resolvedSectionId = context.sectionId
    if (!resolvedSectionId && context.applicantEmployeeId) {
      const [applicant] = await db
        .select({ sectionId: employees.sectionId, section: employees.section })
        .from(employees)
        .where(eq(employees.id, context.applicantEmployeeId))
        .limit(1)
      if (applicant?.sectionId) {
        resolvedSectionId = applicant.sectionId
      } else if (applicant?.section) {
        const [secRow] = await db
          .select({ id: masterSections.id, headId: masterSections.headEmployeeId })
          .from(masterSections)
          .where(eq(masterSections.name, applicant.section))
          .limit(1)
        if (secRow) {
          resolvedSectionId = secRow.id
        }
      }
    }

    let headEmployeeId: number | null = null
    if (resolvedSectionId) {
      const sections = await db
        .select({ headId: masterSections.headEmployeeId })
        .from(masterSections)
        .where(eq(masterSections.id, resolvedSectionId))
        .limit(1)
      headEmployeeId = sections[0]?.headId ?? null
    }

    // Default fallback to Ary Maulana (SPV Repair Retread) or Apriyanto (Head of Service MVC)
    if (!headEmployeeId) {
      headEmployeeId = 996 // Ary Maulana
    }

    const headSection = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(and(eq(employees.id, headEmployeeId), eq(employees.isActive, true)))
      .limit(1)

    if (headSection[0]) {
      steps.push({
        stepOrder: stepOrder++,
        label: 'Section Head',
        approverName: headSection[0].name,
        approverEmployeeId: headSection[0].id,
        approverNodeId: null,
        approvalMatrixStepId: null,
        approvalMode: 'sequential',
        resolutionSource: 'apd_head_section',
        canDelegate: true,
        slaHours: 24,
        nodeLabel: null,
        fallbackLabel: null,
        escalationLabel: null,
      })
    }
  }

  // Fallback to direct manager if no steps found
  if (steps.length === 0 && context.directManagerId) {
    const [manager] = await db
      .select({
        id: employees.id,
        name: employees.name,
      })
      .from(employees)
      .where(and(eq(employees.id, context.directManagerId), eq(employees.isActive, true)))
      .limit(1)

    if (manager) {
      steps.push({
        stepOrder: 1,
        label: 'Direct Manager',
        approverName: manager.name,
        approverEmployeeId: manager.id,
        approverNodeId: null,
        approvalMatrixStepId: null,
        approvalMode: 'sequential',
        resolutionSource: 'legacy_manager',
        canDelegate: true,
        slaHours: 24,
        nodeLabel: null,
        fallbackLabel: null,
        escalationLabel: null,
      })
    }
  }

  return {
    matrixId: null,
    matrixName: null,
    structureId: null,
    structureName: null,
    transactionType: context.transactionType,
    warnings: ['Menggunakan custom route untuk APD Request (PJO -> Head Section)'],
    steps,
  }
}
type NodeRow = {
  id: number
  label: string
  approvalRole: string
  canDelegate: boolean
  isEscalationTarget: boolean
  slaHours: number
  employeeId: number | null
  employeeName: string | null
  employeeJobTitle?: string | null
  employeeEmail?: string | null
}

type AssignmentRow = {
  id: number
  nodeId: number
  employeeId: number | null
  employeeName: string | null
  employeeIsActive: boolean | null
  assignmentType: string
  effectiveFrom: Date
  effectiveTo: Date | null
  isActive: boolean
}

function pickAssignment(
  assignments: AssignmentRow[],
  options: { at: Date; includeDelegate: boolean }
) {
  const activeAssignments = assignments
    .filter((assignment) => assignment.isActive)
    .filter((assignment) =>
      isBetweenWindow(options.at, assignment.effectiveFrom, assignment.effectiveTo)
    )
    .filter((assignment) => assignment.employeeId != null && assignment.employeeName != null)
    .filter((assignment) => assignment.employeeIsActive !== false)
    .sort((left, right) => {
      const leftPriority =
        left.assignmentType === 'primary' ? 0 : left.assignmentType === 'acting' ? 1 : 2
      const rightPriority =
        right.assignmentType === 'primary' ? 0 : right.assignmentType === 'acting' ? 1 : 2

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }

      return right.effectiveFrom.getTime() - left.effectiveFrom.getTime()
    })

  const primaryOrActing = activeAssignments.find(
    (assignment) =>
      assignment.assignmentType === 'primary' || assignment.assignmentType === 'acting'
  )

  if (primaryOrActing) {
    return {
      employeeId: primaryOrActing.employeeId,
      employeeName: primaryOrActing.employeeName,
      resolutionSource: 'matrix' as const,
    }
  }

  if (options.includeDelegate) {
    const delegate = activeAssignments.find(
      (assignment) => assignment.assignmentType === 'delegate'
    )

    if (delegate) {
      return {
        employeeId: delegate.employeeId,
        employeeName: delegate.employeeName,
        resolutionSource: 'delegate' as const,
      }
    }
  }

  return null
}

function resolveNodeStep(
  nodeId: number | null,
  stepOrder: number,
  label: string,
  approvalMatrixStepId: number | null,
  approvalMode: string,
  canDelegate: boolean,
  slaHours: number,
  nodeById: Map<number, NodeRow>,
  assignmentsByNodeId: Map<number, AssignmentRow[]>,
  options: {
    at: Date
    fallbackNodeId: number | null
    escalationNodeId: number | null
  }
): ResolvedApprovalStep {
  const node = nodeId != null ? (nodeById.get(nodeId) ?? null) : null
  const fallbackNode =
    options.fallbackNodeId != null ? (nodeById.get(options.fallbackNodeId) ?? null) : null
  const escalationNode =
    options.escalationNodeId != null ? (nodeById.get(options.escalationNodeId) ?? null) : null

  if (nodeId != null && node) {
    const assignment = pickAssignment(assignmentsByNodeId.get(nodeId) ?? [], {
      at: options.at,
      includeDelegate: canDelegate || node.canDelegate,
    })

    if (assignment) {
      return {
        stepOrder,
        label: label || node.approvalRole || node.label,
        approverName:
          assignment.employeeName ?? buildVacantApproverLabel(node.label, 'Vacant approver'),
        approverEmployeeId: assignment.employeeId ?? null,
        approverNodeId: node.id,
        approvalMatrixStepId,
        approvalMode,
        resolutionSource: assignment.resolutionSource,
        canDelegate,
        slaHours: slaHours || node.slaHours,
        nodeLabel: node.label,
        fallbackLabel: fallbackNode?.label ?? null,
        escalationLabel: escalationNode?.label ?? null,
      } satisfies ResolvedApprovalStep
    }

    if (node.employeeId != null && node.employeeName) {
      return {
        stepOrder,
        label: label || node.approvalRole || node.label,
        approverName: node.employeeName,
        approverEmployeeId: node.employeeId,
        approverNodeId: node.id,
        approvalMatrixStepId,
        approvalMode,
        resolutionSource: 'matrix',
        canDelegate,
        slaHours: slaHours || node.slaHours,
        nodeLabel: node.label,
        fallbackLabel: fallbackNode?.label ?? null,
        escalationLabel: escalationNode?.label ?? null,
      } satisfies ResolvedApprovalStep
    }
  }

  if (fallbackNode) {
    const fallbackAssignment = pickAssignment(assignmentsByNodeId.get(fallbackNode.id) ?? [], {
      at: options.at,
      includeDelegate: true,
    })

    if (fallbackAssignment) {
      return {
        stepOrder,
        label: label || fallbackNode.approvalRole || fallbackNode.label,
        approverName:
          fallbackAssignment.employeeName ??
          buildVacantApproverLabel(fallbackNode.label, 'Fallback approver'),
        approverEmployeeId: fallbackAssignment.employeeId ?? null,
        approverNodeId: fallbackNode.id,
        approvalMatrixStepId,
        approvalMode,
        resolutionSource: 'fallback_node',
        canDelegate,
        slaHours: slaHours || fallbackNode.slaHours,
        nodeLabel: node?.label ?? null,
        fallbackLabel: fallbackNode.label,
        escalationLabel: escalationNode?.label ?? null,
      } satisfies ResolvedApprovalStep
    }
  }

  if (escalationNode) {
    const escalationAssignment = pickAssignment(assignmentsByNodeId.get(escalationNode.id) ?? [], {
      at: options.at,
      includeDelegate: true,
    })

    if (escalationAssignment) {
      return {
        stepOrder,
        label: label || escalationNode.approvalRole || escalationNode.label,
        approverName:
          escalationAssignment.employeeName ??
          buildVacantApproverLabel(escalationNode.label, 'Escalation approver'),
        approverEmployeeId: escalationAssignment.employeeId ?? null,
        approverNodeId: escalationNode.id,
        approvalMatrixStepId,
        approvalMode,
        resolutionSource: 'escalation',
        canDelegate,
        slaHours: slaHours || escalationNode.slaHours,
        nodeLabel: node?.label ?? null,
        fallbackLabel: fallbackNode?.label ?? null,
        escalationLabel: escalationNode.label,
      } satisfies ResolvedApprovalStep
    }
  }

  return {
    stepOrder,
    label: label || node?.approvalRole || node?.label || 'Unassigned Approver',
    approverName: buildVacantApproverLabel(node?.label ?? null, 'Unassigned Approver'),
    approverEmployeeId: null,
    approverNodeId: node?.id ?? null,
    approvalMatrixStepId,
    approvalMode,
    resolutionSource: 'vacant',
    canDelegate,
    slaHours: slaHours || node?.slaHours || 24,
    nodeLabel: node?.label ?? null,
    fallbackLabel: fallbackNode?.label ?? null,
    escalationLabel: escalationNode?.label ?? null,
  } satisfies ResolvedApprovalStep
}

export async function resolveApprovalRouteForActivity(
  input: ResolveApprovalRouteInput
): Promise<ApprovalRouteResolution> {
  const context = await getApprovalContext(input)

  const matrixCandidates = await db
    .select({
      id: approvalMatrices.id,
      name: approvalMatrices.name,
      structureId: approvalMatrices.structureId,
      transactionType: approvalMatrices.transactionType,
      siteId: approvalMatrices.siteId,
      departmentId: approvalMatrices.departmentId,
      sectionId: approvalMatrices.sectionId,
      requesterPositionId: approvalMatrices.requesterPositionId,
      activityType: approvalMatrices.activityType,
      priority: approvalMatrices.priority,
      minOvertimeMinutes: approvalMatrices.minOvertimeMinutes,
      maxOvertimeMinutes: approvalMatrices.maxOvertimeMinutes,
      effectiveFrom: approvalMatrices.effectiveFrom,
      effectiveTo: approvalMatrices.effectiveTo,
      isActive: approvalMatrices.isActive,
      structureName: orgChartStructures.name,
      structureIsActive: orgChartStructures.isActive,
      structureEffectiveFrom: orgChartStructures.effectiveFrom,
      structureEffectiveTo: orgChartStructures.effectiveTo,
    })
    .from(approvalMatrices)
    .leftJoin(orgChartStructures, eq(approvalMatrices.structureId, orgChartStructures.id))
    .where(eq(approvalMatrices.isActive, true))

  const rankedCandidates = matrixCandidates
    .filter((matrix) => {
      const matType = normalizeValue(matrix.transactionType)
      const ctxType = normalizeValue(context.transactionType)
      const matName = (matrix.name || '').toLowerCase()
      if (matType === ctxType) return true
      if (ctxType === 'form_wo_service_mvc') {
        return (
          matType === 'form_wo_service_mvc' ||
          (matType === 'form_wo_service' &&
            !matName.includes('other') &&
            !matName.includes('non-mvc'))
        )
      }
      if (ctxType === 'form_wo_service_other') {
        return (
          matType === 'form_wo_service_other' ||
          (matType === 'form_wo_service' &&
            (matName.includes('other') || matName.includes('non-mvc')))
        )
      }
      if (ctxType === 'form_wo_service') {
        return (
          matType === 'form_wo_service_other' ||
          matType === 'form_wo_service_mvc' ||
          matType === 'form_wo_service'
        )
      }
      if (ctxType === 'form_wo_repair_retread') {
        return (
          matType === 'form_wo_repair_retread' ||
          matType === 'form_wo_repair' ||
          matType === 'form_wo_retread'
        )
      }
      if (ctxType.startsWith('apd-request') || matType.startsWith('apd-request')) {
        return (
          matType === ctxType ||
          (ctxType.startsWith('apd-request') && matType.startsWith('apd-request'))
        )
      }
      return false
    })
    .filter((matrix) => isBetweenWindow(context.at, matrix.effectiveFrom, matrix.effectiveTo))
    .filter((matrix) =>
      isBetweenWindow(
        context.at,
        matrix.structureEffectiveFrom ?? context.at,
        matrix.structureEffectiveTo ?? null
      )
    )
    .filter((matrix) => matrix.structureId == null || matrix.structureIsActive)
    .map((matrix) => ({
      ...matrix,
      score: getMatrixSpecificityScore(matrix, context),
    }))
    .filter((matrix) => matrix.score >= 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      if (right.effectiveFrom.getTime() !== left.effectiveFrom.getTime()) {
        return right.effectiveFrom.getTime() - left.effectiveFrom.getTime()
      }

      return right.id - left.id
    })

  const selectedMatrix = rankedCandidates[0]
  if (!selectedMatrix) {
    if (context.transactionType === 'sop_win_request' || context.transactionType === 'sop_win') {
      return {
        matrixId: null,
        matrixName: 'Default SOP/WIN Access Matrix (2-Step)',
        structureId: null,
        structureName: null,
        transactionType: 'sop_win_request',
        warnings: [],
        steps: [
          {
            stepOrder: 1,
            label: 'Quality Management Review (Ria Annisa)',
            approverName: 'Ria Annisa Putri',
            approverEmployeeId: null,
            approverNodeId: null,
            approvalMatrixStepId: null,
            approvalMode: 'single',
            resolutionSource: 'matrix',
            canDelegate: false,
            slaHours: 24,
          },
          {
            stepOrder: 2,
            label: 'BPI & IA Reps Review (Bardinia Susi)',
            approverName: 'Bardinia Susi Ekawaty',
            approverEmployeeId: null,
            approverNodeId: null,
            approvalMatrixStepId: null,
            approvalMode: 'single',
            resolutionSource: 'matrix',
            canDelegate: false,
            slaHours: 24,
          },
        ],
      }
    }
    if (context.transactionType === 'form_wo_service_mvc') {
      return resolveFormWoServiceApprovalRoute(context, 'trakindo')
    }
    if (context.transactionType === 'form_wo_service_other') {
      return resolveFormWoServiceApprovalRoute(context, 'other')
    }
    if (context.transactionType === 'form_wo_service') {
      return resolveFormWoServiceApprovalRoute(context, input.customerName)
    }
    if (
      context.transactionType === 'form_wo_repair_retread' ||
      context.transactionType === 'form_wo_repair' ||
      context.transactionType === 'form_wo_retread' ||
      context.transactionType === 'form_wo_non_repair'
    ) {
      return resolveFormWoRepairRetreadApprovalRoute(context)
    }
    if (context.transactionType.startsWith('apd-request')) {
      return resolveApdApprovalRoute(context)
    }

    const centralServiceSitePjoRoute = await resolveCentralServiceSitePjoRoute(context, [
      'Central Service di site luar Jakarta/Balikpapan memakai routing khusus PJO Site.',
    ])

    if (centralServiceSitePjoRoute) {
      return centralServiceSitePjoRoute
    }

    return resolveLegacyFallbackRoute(context)
  }

  const matrixSteps = await db
    .select({
      id: approvalMatrixSteps.id,
      stepOrder: approvalMatrixSteps.stepOrder,
      label: approvalMatrixSteps.label,
      nodeId: approvalMatrixSteps.nodeId,
      fallbackNodeId: approvalMatrixSteps.fallbackNodeId,
      escalationNodeId: approvalMatrixSteps.escalationNodeId,
      approvalMode: approvalMatrixSteps.approvalMode,
      canDelegate: approvalMatrixSteps.canDelegate,
      slaHours: approvalMatrixSteps.slaHours,
    })
    .from(approvalMatrixSteps)
    .where(eq(approvalMatrixSteps.matrixId, selectedMatrix.id))
    .orderBy(asc(approvalMatrixSteps.stepOrder), asc(approvalMatrixSteps.id))

  if (matrixSteps.length === 0) {
    return {
      ...(await resolveLegacyFallbackRoute(context)),
      matrixId: selectedMatrix.id,
      matrixName: selectedMatrix.name,
      structureId: selectedMatrix.structureId ?? null,
      structureName: selectedMatrix.structureName ?? null,
      warnings: [
        `Approval matrix "${selectedMatrix.name}" tidak memiliki step aktif. Fallback legacy dipakai.`,
      ],
    }
  }

  const nodeIds = Array.from(
    new Set(
      matrixSteps
        .flatMap((step) => [step.nodeId, step.fallbackNodeId, step.escalationNodeId])
        .filter((value): value is number => value != null)
    )
  )

  const [nodes, assignments] = await Promise.all([
    nodeIds.length === 0
      ? Promise.resolve([] as NodeRow[])
      : db
          .select({
            id: orgChartNodes.id,
            label: orgChartNodes.label,
            approvalRole: orgChartNodes.approvalRole,
            canDelegate: orgChartNodes.canDelegate,
            isEscalationTarget: orgChartNodes.isEscalationTarget,
            slaHours: orgChartNodes.slaHours,
            employeeId: orgChartNodes.employeeId,
            employeeName: employees.name,
            employeeJobTitle: employees.jobTitle,
            employeeEmail: employees.email,
          })
          .from(orgChartNodes)
          .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
          .where(inArray(orgChartNodes.id, nodeIds)),
    nodeIds.length === 0
      ? Promise.resolve([] as AssignmentRow[])
      : db
          .select({
            id: orgNodeAssignments.id,
            nodeId: orgNodeAssignments.nodeId,
            employeeId: orgNodeAssignments.employeeId,
            employeeName: employees.name,
            employeeIsActive: employees.isActive,
            assignmentType: orgNodeAssignments.assignmentType,
            effectiveFrom: orgNodeAssignments.effectiveFrom,
            effectiveTo: orgNodeAssignments.effectiveTo,
            isActive: orgNodeAssignments.isActive,
          })
          .from(orgNodeAssignments)
          .leftJoin(employees, eq(orgNodeAssignments.employeeId, employees.id))
          .where(inArray(orgNodeAssignments.nodeId, nodeIds)),
  ])

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const assignmentsByNodeId = new Map<number, AssignmentRow[]>()

  for (const assignment of assignments) {
    const list = assignmentsByNodeId.get(assignment.nodeId) ?? []
    list.push({
      ...assignment,
      employeeId: assignment.employeeId ?? null,
      employeeName: assignment.employeeName ?? null,
      employeeIsActive: assignment.employeeIsActive ?? null,
      effectiveTo: assignment.effectiveTo ?? null,
    })
    assignmentsByNodeId.set(assignment.nodeId, list)
  }

  const steps: ResolvedApprovalStep[] = matrixSteps.map((step) => {
    const resolved = resolveNodeStep(
      step.nodeId,
      step.stepOrder,
      step.label,
      step.id,
      step.approvalMode,
      step.canDelegate,
      step.slaHours,
      nodeById,
      assignmentsByNodeId,
      {
        at: context.at,
        fallbackNodeId: step.fallbackNodeId ?? null,
        escalationNodeId: step.escalationNodeId ?? null,
      }
    )
    if (context.transactionType.startsWith('apd-request') && step.nodeId) {
      const n = nodeById.get(step.nodeId)
      if (n?.employeeJobTitle) {
        resolved.label = n.employeeJobTitle
      }
    }
    return resolved
  })


  // For Material/Tools: if only 1 step from matrix, append dynamic Head Section step
  if (
    (selectedMatrix.transactionType === 'apd-request-material' || selectedMatrix.transactionType === 'apd-request-tools') &&
    steps.length === 1 &&
    context.sectionId
  ) {
    const sections = await db
      .select({ headId: masterSections.headEmployeeId })
      .from(masterSections)
      .where(eq(masterSections.id, context.sectionId))
      .limit(1)

    if (sections[0]?.headId) {
      const headSection = await db
        .select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(and(eq(employees.id, sections[0].headId), eq(employees.isActive, true)))
        .limit(1)

      if (headSection[0]) {
        steps.push({
          stepOrder: 2,
          label: 'Head Section',
          approverName: headSection[0].name,
          approverEmployeeId: headSection[0].id,
          approverNodeId: null,
          approvalMatrixStepId: null,
          approvalMode: 'sequential',
          resolutionSource: 'apd_head_section',
          canDelegate: true,
          slaHours: 24,
          nodeLabel: null,
          fallbackLabel: null,
          escalationLabel: null,
        })
      }
    }
  }


  // Post-process virtual relative approvers (Direct Supervisor, Dept Head, Sect Head, Site Head)
  for (const step of steps) {
    if (step.approverEmployeeId === 990001 && context.directManagerId) {
      const [mgr] = await db
        .select({ name: employees.name })
        .from(employees)
        .where(eq(employees.id, context.directManagerId))
        .limit(1);
      if (mgr) {
        step.approverEmployeeId = context.directManagerId;
        step.approverName = mgr.name;
        step.resolutionSource = "legacy_manager";
      }
    } else if (step.approverEmployeeId === 990002 && context.departmentId) {
      const [dept] = await db
        .select({ headEmployeeId: masterDepartments.headEmployeeId })
        .from(masterDepartments)
        .where(eq(masterDepartments.id, context.departmentId))
        .limit(1);
      if (dept?.headEmployeeId) {
        const [mgr] = await db
          .select({ name: employees.name })
          .from(employees)
          .where(eq(employees.id, dept.headEmployeeId))
          .limit(1);
        if (mgr) {
          step.approverEmployeeId = dept.headEmployeeId;
          step.approverName = mgr.name;
        }
      }
    } else if (step.approverEmployeeId === 990003 && context.sectionId) {
      const [sect] = await db
        .select({ headEmployeeId: masterSections.headEmployeeId })
        .from(masterSections)
        .where(eq(masterSections.id, context.sectionId))
        .limit(1);
      if (sect?.headEmployeeId) {
        const [mgr] = await db
          .select({ name: employees.name })
          .from(employees)
          .where(eq(employees.id, sect.headEmployeeId))
          .limit(1);
        if (mgr) {
          step.approverEmployeeId = sect.headEmployeeId;
          step.approverName = mgr.name;
        }
      }
    } else if (step.approverEmployeeId === 990004 && context.siteHeadEmployeeId) {
      const [mgr] = await db
        .select({ name: employees.name })
        .from(employees)
        .where(eq(employees.id, context.siteHeadEmployeeId))
        .limit(1);
      if (mgr) {
        step.approverEmployeeId = context.siteHeadEmployeeId;
        step.approverName = mgr.name;
      }
    }
  }

  const warnings = steps
    .filter((step) => step.resolutionSource === 'vacant')
    .map(
      (step) =>
        `Step ${step.stepOrder} (${step.label}) belum punya assignee aktif dan akan tampil sebagai vacant approver.`
    )

  return {
    matrixId: selectedMatrix.id,
    matrixName: selectedMatrix.name,
    structureId: selectedMatrix.structureId ?? null,
    structureName: selectedMatrix.structureName ?? null,
    transactionType: selectedMatrix.transactionType,
    warnings,
    steps,
  }
}

export function serializeApprovalRoute(route: ApprovalRouteResolution) {
  return JSON.stringify({
    matrixId: route.matrixId,
    matrixName: route.matrixName,
    structureId: route.structureId,
    structureName: route.structureName,
    transactionType: route.transactionType,
    warnings: route.warnings,
    steps: route.steps.map((step) => ({
      stepOrder: step.stepOrder,
      label: step.label,
      approverName: step.approverName,
      approverEmployeeId: step.approverEmployeeId,
      approverNodeId: step.approverNodeId,
      approvalMatrixStepId: step.approvalMatrixStepId,
      approvalMode: step.approvalMode,
      resolutionSource: step.resolutionSource,
      canDelegate: step.canDelegate,
      slaHours: step.slaHours,
      nodeLabel: step.nodeLabel,
      fallbackLabel: step.fallbackLabel,
      escalationLabel: step.escalationLabel,
    })),
  })
}
