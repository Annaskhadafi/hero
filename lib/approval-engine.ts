import { and, asc, eq, inArray } from 'drizzle-orm'
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
  approvalMatrixStepId: number | null
  approvalMode: string
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
    | 'vacant'
  canDelegate: boolean
  slaHours: number
  nodeLabel: string | null
  fallbackLabel: string | null
  escalationLabel: string | null
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
    minOvertimeMinutes: number
    maxOvertimeMinutes: number | null
  },
  context: ApprovalContext
) {
  let score = 0

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
      return -1
    }

    score += 16
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

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    siteId: employee.siteId,
    siteName: employee.siteName ?? '',
    siteLocation: employee.siteLocation ?? '',
    siteHeadEmployeeId: employee.siteHeadEmployeeId ?? null,
    departmentId: employee.departmentId ?? null,
    departmentName: employee.departmentName ?? null,
    sectionId: employee.sectionId ?? null,
    positionId: employee.positionId ?? null,
    directManagerId: employee.directManagerId ?? null,
    activityType: input.activityType,
    priority: input.priority,
    overtimeMinutes: input.overtimeMinutes,
    transactionType: input.transactionType ?? 'activity',
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

async function resolveApdApprovalRoute(context: ApprovalContext): Promise<ApprovalRouteResolution> {
  const steps: ResolvedApprovalStep[] = []
  let stepOrder = 1

  // Step 1: PJO Site / Technical Engineer
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

  // Step 2: Head Section
  if (context.sectionId) {
    const sections = await db
      .select({
        headId: masterSections.headEmployeeId,
      })
      .from(masterSections)
      .where(eq(masterSections.id, context.sectionId))
      .limit(1)

    if (sections[0]?.headId) {
      const headSection = await db
        .select({
          id: employees.id,
          name: employees.name,
        })
        .from(employees)
        .where(and(eq(employees.id, sections[0].headId), eq(employees.isActive, true)))
        .limit(1)

      if (headSection[0]) {
        steps.push({
          stepOrder: stepOrder++,
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

  // Step 3: HSE Admin (Hanya untuk APD, bukan material/tools)
  if (context.transactionType === 'apd-request-apd') {
    const hseApprovers = await db
      .select({
        id: employees.id,
        name: employees.name,
      })
      .from(employees)
      .where(
        and(
          eq(employees.accessRole, 'HSE'),
          eq(employees.siteId, context.siteId),
          eq(employees.isActive, true)
        )
      )
      .limit(1)

    if (hseApprovers[0]) {
      steps.push({
        stepOrder: stepOrder++,
        label: 'HSE Admin',
        approverName: hseApprovers[0].name,
        approverEmployeeId: hseApprovers[0].id,
        approverNodeId: null,
        approvalMatrixStepId: null,
        approvalMode: 'sequential',
        resolutionSource: 'apd_hse_admin',
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
) {
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
    .filter(
      (matrix) => normalizeValue(matrix.transactionType) === normalizeValue(context.transactionType)
    )
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

      return right.effectiveFrom.getTime() - left.effectiveFrom.getTime()
    })

  const selectedMatrix = rankedCandidates[0]
  if (!selectedMatrix) {
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

  const steps = matrixSteps.map((step) =>
    resolveNodeStep(
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
  )

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
