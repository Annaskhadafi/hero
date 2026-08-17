import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, like, lte, or, sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import { user } from '@/db/schema/auth'
import {
  activities,
  activityLibraries,
  activityModifiers,
  activityPhotos,
  activityRouteGroups,
  activityRouteItems,
  activityRouteTemplates,
  activitySectionPointOverrides,
  approvals,
  dailyActivityConfigs,
  dailyActivitySessionItems,
  dailyActivitySessions,
  employees,
  jobAssignments,
  masterDepartments,
  masterPositions,
  masterSections,
  overtimeCommandLetterItems,
  overtimeCommandLetterParticipants,
  overtimeCommandLetters,
  orgChartNodes,
  orgNodeAssignments,
  penaltyEvents,
  pointDisputes,
  pointEvents,
  sites,
  streakRecords,
} from '@/db/schema/hero'
import { ensureHeroGovernanceSeedData } from '@/lib/hero-admin'
import { resolveUploadUrl } from '@/lib/s3-storage'

let dailyActivitySeedPromise: Promise<void> | null = null

// Aktivitas library bersifat global (siteIds kosong) atau tersedia untuk site yang
// terdaftar di kolom siteIds. Menggantikan filter lama yang hanya satu site.
function librarySiteMatches(siteIdCol: AnyPgColumn, siteIdsCol: AnyPgColumn, employeeSiteId: number | null | undefined) {
  if (employeeSiteId == null) {
    return and(
      isNull(siteIdCol),
      sql`(${siteIdsCol} is null or jsonb_array_length(${siteIdsCol}) = 0)`
    )
  }
  return or(
    and(
      isNull(siteIdCol),
      sql`(${siteIdsCol} is null or jsonb_array_length(${siteIdsCol}) = 0)`
    ),
    eq(siteIdCol, employeeSiteId),
    sql`${siteIdsCol} @> jsonb_build_array(${employeeSiteId}::integer)`
  )
}

// Cocokkan departement: jika departmentId DAN departmentIds sama-sama kosong/null → global (tampilkan).
// Jika salah satu terisi, cek apakah dept karyawan termasuk di dalamnya.
function libraryDeptMatches(deptIdCol: AnyPgColumn, deptIdsCol: AnyPgColumn, employeeDeptId: number | null | undefined) {
  if (employeeDeptId == null) {
    // Karyawan tidak punya departemen → hanya tampilkan yang global (kedua kolom kosong/null)
    return and(
      isNull(deptIdCol),
      sql`(${deptIdsCol} is null or jsonb_array_length(${deptIdsCol}) = 0)`
    )
  }
  return or(
    // Global: tidak ada filter departemen sama sekali
    and(
      isNull(deptIdCol),
      sql`(${deptIdsCol} is null or jsonb_array_length(${deptIdsCol}) = 0)`
    ),
    // Cocok di kolom single lama
    eq(deptIdCol, employeeDeptId),
    // Cocok di kolom array baru
    sql`${deptIdsCol} @> jsonb_build_array(${employeeDeptId}::integer)`
  )
}

// Cocokkan section: sama dengan dept, mendukung legacy single col + JSONB array.
function librarySectionMatches(secIdCol: AnyPgColumn, secIdsCol: AnyPgColumn, employeeSecId: number | null | undefined) {
  if (employeeSecId == null) {
    return and(
      isNull(secIdCol),
      sql`(${secIdsCol} is null or jsonb_array_length(${secIdsCol}) = 0)`
    )
  }
  return or(
    and(
      isNull(secIdCol),
      sql`(${secIdsCol} is null or jsonb_array_length(${secIdsCol}) = 0)`
    ),
    eq(secIdCol, employeeSecId),
    sql`${secIdsCol} @> jsonb_build_array(${employeeSecId}::integer)`
  )
}

const DAILY_ACTIVITY_REVALIDATE_PATHS = [
  '/dashboard/activity-hub/my-day',
  '/dashboard/activity-hub/team-board',
  '/dashboard/overtime-requests',
  '/dashboard/activity-hub/library',
  '/dashboard/activity-hub/routes',
  '/dashboard/activity-hub/blueprint',
  '/dashboard/activity-hub/configuration',
  '/dashboard/approval',
  '/dashboard/leaderboard',
  '/mobile',
  '/mobile/dashboard',
  '/mobile/activity',
  '/mobile/activity/input',
  '/mobile/overtime',
  '/mobile/gamification',
] as const

const DEFAULT_LIBRARY_SEEDS = [
  {
    activityCode: 'TS-001',
    activityName: 'Tyre inspection dan pressure check',
    category: 'Technical',
    departmentName: 'Central Service',
    basePoints: 10,
    complexityLevel: 2,
    requiresPhoto: true,
    requiresEquipmentNo: true,
    requiresDuration: true,
    requiresLocationGps: true,
    requiresMaterialUsed: false,
    maxDailyCount: 4,
    maxPointsPerDay: 40,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 12,
  },
  {
    activityCode: 'TS-002',
    activityName: 'Tyre change unit hauling',
    category: 'Technical',
    departmentName: 'Central Service',
    basePoints: 18,
    complexityLevel: 4,
    requiresPhoto: true,
    requiresEquipmentNo: true,
    requiresDuration: true,
    requiresLocationGps: true,
    requiresMaterialUsed: true,
    requiresTireCount: true,
    maxDailyCount: 2,
    maxPointsPerDay: 36,
    isAssignable: true,
    isSelfInput: false,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 8,
  },
  {
    activityCode: 'HSE-001',
    activityName: 'Safety toolbox meeting',
    category: 'HSE',
    departmentName: 'HSE',
    basePoints: 8,
    complexityLevel: 1,
    requiresPhoto: false,
    requiresEquipmentNo: false,
    requiresDuration: true,
    requiresLocationGps: false,
    requiresMaterialUsed: false,
    maxDailyCount: 1,
    maxPointsPerDay: 8,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 24,
  },
  {
    activityCode: 'ADM-001',
    activityName: 'Daily administration dan reporting',
    category: 'Administrative',
    departmentName: 'HC',
    basePoints: 6,
    complexityLevel: 1,
    requiresPhoto: false,
    requiresEquipmentNo: false,
    requiresDuration: true,
    requiresLocationGps: false,
    requiresMaterialUsed: false,
    maxDailyCount: 2,
    maxPointsPerDay: 12,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 24,
  },
  {
    activityCode: 'WLN-001',
    activityName: 'Stretching dan wellness check',
    category: 'Wellness',
    departmentName: 'HC',
    basePoints: 4,
    complexityLevel: 1,
    requiresPhoto: false,
    requiresEquipmentNo: false,
    requiresDuration: true,
    requiresLocationGps: false,
    requiresMaterialUsed: false,
    maxDailyCount: 1,
    maxPointsPerDay: 4,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: false,
    autoApproveIfGpsValid: false,
    slaHours: 24,
  },
  {
    activityCode: 'STD-001',
    activityName: 'Standby on call site support',
    category: 'Standby',
    departmentName: 'Central Service',
    basePoints: 5,
    complexityLevel: 1,
    requiresPhoto: false,
    requiresEquipmentNo: false,
    requiresDuration: true,
    requiresLocationGps: false,
    requiresMaterialUsed: false,
    maxDailyCount: 1,
    maxPointsPerDay: 5,
    isAssignable: true,
    isSelfInput: false,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 24,
  },
] as const

const DEFAULT_CONFIG_SEEDS = [
  {
    configKey: 'daily_cap_points',
    configLabel: 'Batas poin harian',
    configValue: '100',
    valueType: 'number',
    description: 'Batas akumulasi poin reward harian per karyawan.',
    isEditableBySectionHead: false,
  },
  {
    configKey: 'gps_radius_meters',
    configLabel: 'Radius GPS site',
    configValue: '500',
    valueType: 'number',
    description: 'Radius validasi GPS untuk auto-approval dan verifikasi lokasi.',
    isEditableBySectionHead: false,
  },
  {
    configKey: 'auto_approve_enabled',
    configLabel: 'Auto approval aktif',
    configValue: 'true',
    valueType: 'boolean',
    description: 'Mengizinkan auto-approval untuk aktivitas yang memenuhi syarat.',
    isEditableBySectionHead: true,
  },
  {
    configKey: 'penalty_pen_01',
    configLabel: 'PEN-01 No Daily Report',
    configValue: '-15',
    valueType: 'number',
    description: 'Penalty default bila karyawan tidak mengirim laporan harian.',
    isEditableBySectionHead: false,
  },
  {
    configKey: 'penalty_pen_02',
    configLabel: 'PEN-02 Terlambat Input Minor',
    configValue: '-2',
    valueType: 'number',
    description: 'Penalty aktivitas yang disubmit pukul 17.01 - 20.00.',
    isEditableBySectionHead: false,
  },
  {
    configKey: 'penalty_pen_03',
    configLabel: 'PEN-03 Terlambat Input Major',
    configValue: '-5',
    valueType: 'number',
    description: 'Penalty aktivitas yang disubmit pukul 20.01 - 23.59.',
    isEditableBySectionHead: false,
  },
  {
    configKey: 'penalty_pen_09',
    configLabel: 'PEN-09 Aktivitas Ditolak Foreman',
    configValue: '-5',
    valueType: 'number',
    description: 'Penalty default untuk aktivitas yang ditolak saat approval.',
    isEditableBySectionHead: false,
  },
  {
    configKey: 'custom_activity_daily_limit',
    configLabel: 'Batas custom activity per hari',
    configValue: '3',
    valueType: 'number',
    description: 'Jumlah maksimum custom activity yang dapat diajukan per karyawan per hari.',
    isEditableBySectionHead: false,
  },
] as const

function startOfDay(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
}

function endOfDay(reference = new Date()) {
  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    23,
    59,
    59,
    999
  )
}

function getShiftLabel(reference = new Date()) {
  const hour = reference.getHours()
  if (hour < 15) return 'Shift Pagi'
  if (hour < 23) return 'Shift Sore'
  return 'Shift Malam'
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
}

function formatDurationLabel(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} menit`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}j ${minutes}m` : `${hours} jam`
}

function normalizeStatusLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function normalizeRouteShiftToken(value?: string | null) {
  return value?.trim().toUpperCase().replace(/\s+/g, ' ') ?? ''
}

function getShiftAliases(reference = new Date()) {
  const hour = reference.getHours()

  if (hour < 15) {
    return new Set(['ALL', 'DAY', 'SHIFT PAGI', 'PAGI', 'MORNING'])
  }

  if (hour < 23) {
    return new Set(['ALL', 'SHIFT SORE', 'SORE', 'SWING', 'AFTERNOON'])
  }

  return new Set(['ALL', 'NIGHT', 'SHIFT MALAM', 'MALAM'])
}

function getRouteTemplateScore(
  template: {
    siteId: number | null
    departmentId: number | null
    sectionId: number | null
    positionId: number | null
    shiftCode: string
  },
  employee: DailyActivityEmployeeContext,
  shiftAliases: Set<string>
) {
  if (template.siteId != null && template.siteId !== employee.siteId) {
    return -1
  }

  if (template.departmentId != null && template.departmentId !== employee.departmentId) {
    return -1
  }

  if (template.sectionId != null && template.sectionId !== employee.sectionId) {
    return -1
  }

  if (template.positionId != null && template.positionId !== employee.positionId) {
    return -1
  }

  let score = 0
  score += template.siteId != null ? 32 : 4
  score += template.departmentId != null ? 16 : 2
  score += template.sectionId != null ? 8 : 1
  score += template.positionId != null ? 4 : 0

  const normalizedShift = normalizeRouteShiftToken(template.shiftCode)
  if (normalizedShift && normalizedShift !== 'ALL') {
    if (!shiftAliases.has(normalizedShift)) {
      return -1
    }

    score += 6
  } else {
    score += 1
  }

  return score
}

type MatchedRouteChecklist = {
  id: number
  routeCode: string
  routeName: string
  shiftCode: string
  versionLabel: string
  description: string | null
  mobileEnabled: boolean
  approvalRequired: boolean
  siteName: string | null
  departmentName: string | null
  sectionName: string | null
  positionName: string | null
  activeSpl: {
    id: number
    splNumber: string
    title: string
    status: string
    workDate: Date
    plannedStartAt: Date | null
    plannedEndAt: Date | null
    requestNotes: string
    executionNotes: string
    lineCount: number
    plannedPointsTotal: number
    items: Array<{
      id: number
      assignedEmployeeId: number | null
      routeTemplateId: number | null
      routeItemId: number | null
      libraryActivityId: number | null
      requiresPhoto: boolean
      lineLabel: string
      lineDescription: string
      targetUnit: string
      estimatedMinutes: number
      plannedPoints: number
      sortOrder: number
      isCustomLine: boolean
    }>
  } | null
  sessionId: number | null
  sessionStatus: string | null
  checkedCount: number
  groupCount: number
  itemCount: number
  groups: Array<{
    id: number
    groupKey: string
    groupName: string
    description: string | null
    sortOrder: number
    isRequired: boolean
    items: Array<{
      id: number
      sessionItemId: number | null
      itemCode: string | null
      itemLabel: string
      itemDescription: string | null
      pointOverride: number | null
      sortOrder: number
      requiresUnit: boolean
      requiresTime: boolean
      requiresRemark: boolean
      requiresPhoto: boolean
      requiresChecklistEvidence: boolean
      isOptional: boolean
      allowCustomUnit: boolean
      libraryActivityId: number | null
      libraryCode: string | null
      libraryName: string | null
      libraryPoints: number | null
      isChecked: boolean
      unitNumber: string
      remark: string
      startedAt: Date | null
      endedAt: Date | null
      checkedAt: Date | null
      actualPoints: number
      snapshotPayload: string
    }>
  }>
}

type DailyActivityEmployeeContext = Pick<
  typeof employees.$inferSelect,
  'id' | 'siteId' | 'departmentId' | 'sectionId' | 'positionId' | 'orgNodeId'
>

async function getActiveOvertimeCommandLetterForEmployee(
  employee: DailyActivityEmployeeContext,
  referenceDate = new Date()
) {
  const dayStart = startOfDay(new Date(referenceDate.getTime() - 2 * 86_400_000))
  const dayEnd = endOfDay(referenceDate)

  const splRows = await db
    .select({
      id: overtimeCommandLetters.id,
      splNumber: overtimeCommandLetters.splNumber,
      title: overtimeCommandLetters.title,
      status: overtimeCommandLetters.status,
      workDate: overtimeCommandLetters.workDate,
      plannedStartAt: overtimeCommandLetters.plannedStartAt,
      plannedEndAt: overtimeCommandLetters.plannedEndAt,
      requestNotes: overtimeCommandLetters.requestNotes,
      executionNotes: overtimeCommandLetters.executionNotes,
      sectionId: overtimeCommandLetters.sectionId,
      positionId: overtimeCommandLetters.positionId,
      updatedAt: overtimeCommandLetters.updatedAt,
    })
    .from(overtimeCommandLetters)
    .where(
      and(
        eq(overtimeCommandLetters.siteId, employee.siteId),
        gte(overtimeCommandLetters.workDate, dayStart),
        lte(overtimeCommandLetters.workDate, dayEnd),
        inArray(overtimeCommandLetters.status, ['submitted', 'approved'])
      )
    )
    .orderBy(
      desc(overtimeCommandLetters.workDate),
      desc(overtimeCommandLetters.updatedAt),
      desc(overtimeCommandLetters.id)
    )

  if (splRows.length === 0) {
    return null
  }

  const splIds = splRows.map((row) => row.id)
  const [itemRows, employeeSessionRows] = await Promise.all([
    db
      .select({
        id: overtimeCommandLetterItems.id,
        overtimeCommandLetterId: overtimeCommandLetterItems.overtimeCommandLetterId,
        assignedEmployeeId: overtimeCommandLetterItems.assignedEmployeeId,
        routeTemplateId: overtimeCommandLetterItems.routeTemplateId,
        routeItemId: overtimeCommandLetterItems.routeItemId,
        libraryActivityId: overtimeCommandLetterItems.libraryActivityId,
        requiresPhoto: sql<boolean>`coalesce(${activityLibraries.requiresPhoto}, false)`,
        requiresUnit: sql<boolean>`coalesce(${activityLibraries.requiresEquipmentNo}, false)`,
        requiresTime: sql<boolean>`coalesce(${activityLibraries.requiresDuration}, false)`,
        requiresLocationGps: sql<boolean>`coalesce(${activityLibraries.requiresLocationGps}, false)`,
        requiresMaterialUsed: sql<boolean>`coalesce(${activityLibraries.requiresMaterialUsed}, false)`,
        requiresTireCount: sql<boolean>`coalesce(${activityLibraries.requiresTireCount}, false)`,
        lineLabel: overtimeCommandLetterItems.lineLabel,
        lineDescription: overtimeCommandLetterItems.lineDescription,
        targetUnit: overtimeCommandLetterItems.targetUnit,
        estimatedMinutes: overtimeCommandLetterItems.estimatedMinutes,
        plannedPoints: overtimeCommandLetterItems.plannedPoints,
        sortOrder: overtimeCommandLetterItems.sortOrder,
        isCustomLine: overtimeCommandLetterItems.isCustomLine,
      })
      .from(overtimeCommandLetterItems)
      .leftJoin(
        activityLibraries,
        eq(overtimeCommandLetterItems.libraryActivityId, activityLibraries.id)
      )
      .where(inArray(overtimeCommandLetterItems.overtimeCommandLetterId, splIds))
      .orderBy(
        asc(overtimeCommandLetterItems.overtimeCommandLetterId),
        asc(overtimeCommandLetterItems.sortOrder),
        asc(overtimeCommandLetterItems.id)
      ),
    db
      .select({
        overtimeCommandLetterId: dailyActivitySessions.overtimeCommandLetterId,
        status: dailyActivitySessions.status,
      })
      .from(dailyActivitySessions)
      .where(
        and(
          eq(dailyActivitySessions.employeeId, employee.id),
          inArray(dailyActivitySessions.overtimeCommandLetterId, splIds)
        )
      ),
  ])
  const submittedSplIds = new Set(
    employeeSessionRows
      .filter((row) => ['submitted', 'approved'].includes(row.status.toLowerCase()))
      .map((row) => row.overtimeCommandLetterId)
  )

  const itemsBySplId = new Map<number, typeof itemRows>()
  for (const item of itemRows) {
    const list = itemsBySplId.get(item.overtimeCommandLetterId) ?? []
    list.push(item)
    itemsBySplId.set(item.overtimeCommandLetterId, list)
  }

  const selectedDocument =
    splRows
      .map((row) => {
        const items = itemsBySplId.get(row.id) ?? []
        const hasExplicitAssignments = items.some((item) => item.assignedEmployeeId != null)
        const matchesLegacyScope =
          (row.sectionId == null || row.sectionId === employee.sectionId) &&
          (row.positionId == null || row.positionId === employee.positionId)
        const relevantItems = hasExplicitAssignments
          ? items.filter((item) => item.assignedEmployeeId === employee.id)
          : matchesLegacyScope
            ? items
            : []
        const score =
          (relevantItems.length > 0 ? 20 : 0) +
          (hasExplicitAssignments ? 12 : 0) +
          (row.status === 'approved' ? 4 : row.status === 'submitted' ? 3 : 1) +
          (row.sectionId != null ? 2 : 0) +
          (row.positionId != null ? 1 : 0)

        return {
          ...row,
          items: relevantItems,
          score,
        }
      })
      .filter((row) => row.items.length > 0 && !submittedSplIds.has(row.id))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score
        }

        return right.updatedAt.getTime() - left.updatedAt.getTime()
      })[0] ?? null

  if (!selectedDocument) {
    return null
  }

  return {
    id: selectedDocument.id,
    splNumber: selectedDocument.splNumber,
    title: selectedDocument.title,
    status: selectedDocument.status,
    workDate: selectedDocument.workDate,
    plannedStartAt: selectedDocument.plannedStartAt,
    plannedEndAt: selectedDocument.plannedEndAt,
    requestNotes: selectedDocument.requestNotes,
    executionNotes: selectedDocument.executionNotes,
    lineCount: selectedDocument.items.length,
    plannedPointsTotal: selectedDocument.items.reduce(
      (total, item) => total + item.plannedPoints,
      0
    ),
    items: selectedDocument.items,
  }
}

async function getStandaloneOvertimeChecklistForEmployee(
  employee: DailyActivityEmployeeContext,
  referenceDate = new Date()
) {
  const activeSpl = await getActiveOvertimeCommandLetterForEmployee(employee, referenceDate)
  if (!activeSpl) {
    return null
  }

  const [existingSession] = await db
    .select({
      id: dailyActivitySessions.id,
      status: dailyActivitySessions.status,
    })
    .from(dailyActivitySessions)
    .where(
      and(
        eq(dailyActivitySessions.employeeId, employee.id),
        eq(dailyActivitySessions.overtimeCommandLetterId, activeSpl.id)
      )
    )
    .orderBy(desc(dailyActivitySessions.updatedAt))
    .limit(1)

  const sessionItemRows =
    existingSession == null
      ? []
      : await db
          .select({
            overtimeCommandLetterItemId: dailyActivitySessionItems.overtimeCommandLetterItemId,
            routeItemId: dailyActivitySessionItems.routeItemId,
            libraryActivityId: dailyActivitySessionItems.libraryActivityId,
            startedAt: dailyActivitySessionItems.startedAt,
            endedAt: dailyActivitySessionItems.endedAt,
            unitNumber: dailyActivitySessionItems.unitNumber,
            remark: dailyActivitySessionItems.remark,
            actualPoints: dailyActivitySessionItems.actualPoints,
            isChecked: dailyActivitySessionItems.isChecked,
          })
          .from(dailyActivitySessionItems)
          .where(eq(dailyActivitySessionItems.sessionId, existingSession.id))
          .orderBy(asc(dailyActivitySessionItems.sortOrder), asc(dailyActivitySessionItems.id))

  const unusedSessionItems = [...sessionItemRows]
  const items = activeSpl.items.map((item) => {
    const matchedIndex = unusedSessionItems.findIndex(
      (sessionItem) =>
        (sessionItem.overtimeCommandLetterItemId != null &&
          sessionItem.overtimeCommandLetterItemId === item.id) ||
        (sessionItem.routeItemId != null &&
          item.routeItemId != null &&
          sessionItem.routeItemId === item.routeItemId) ||
        (sessionItem.libraryActivityId != null &&
          item.libraryActivityId != null &&
          sessionItem.libraryActivityId === item.libraryActivityId)
    )
    const matched = matchedIndex >= 0 ? unusedSessionItems.splice(matchedIndex, 1)[0] : null

    return {
      ...item,
      isChecked: matched?.isChecked ?? false,
      unitNumber: matched?.unitNumber ?? item.targetUnit ?? '',
      remark: matched?.remark ?? '',
      startedAt: matched?.startedAt ?? null,
      endedAt: matched?.endedAt ?? null,
      actualPoints: matched?.actualPoints ?? item.plannedPoints,
    }
  })

  const checkedCount = items.filter((item) => item.isChecked).length

  return {
    ...activeSpl,
    sessionId: existingSession?.id ?? null,
    sessionStatus: existingSession?.status ?? null,
    checkedCount,
    progressPercent: items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0,
    items,
  }
}

async function getMatchedRouteChecklistForEmployee(
  employee: DailyActivityEmployeeContext,
  referenceDate = new Date()
): Promise<MatchedRouteChecklist | null> {
  const routeTemplateRows = await db
    .select({
      id: activityRouteTemplates.id,
      routeCode: activityRouteTemplates.routeCode,
      routeName: activityRouteTemplates.routeName,
      shiftCode: activityRouteTemplates.shiftCode,
      description: activityRouteTemplates.description,
      versionLabel: activityRouteTemplates.versionLabel,
      mobileEnabled: activityRouteTemplates.mobileEnabled,
      approvalRequired: activityRouteTemplates.approvalRequired,
      siteId: activityRouteTemplates.siteId,
      siteName: sites.name,
      departmentId: activityRouteTemplates.departmentId,
      departmentName: masterDepartments.name,
      sectionId: activityRouteTemplates.sectionId,
      sectionName: masterSections.name,
      positionId: activityRouteTemplates.positionId,
      positionName: masterPositions.name,
      effectiveFrom: activityRouteTemplates.effectiveFrom,
      createdAt: activityRouteTemplates.createdAt,
    })
    .from(activityRouteTemplates)
    .leftJoin(sites, eq(activityRouteTemplates.siteId, sites.id))
    .leftJoin(masterDepartments, eq(activityRouteTemplates.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(activityRouteTemplates.sectionId, masterSections.id))
    .leftJoin(masterPositions, eq(activityRouteTemplates.positionId, masterPositions.id))
    .where(eq(activityRouteTemplates.isActive, true))
    .orderBy(desc(activityRouteTemplates.mobileEnabled), desc(activityRouteTemplates.createdAt))

  const shiftAliases = getShiftAliases(referenceDate)
  const matchedRouteTemplate =
    routeTemplateRows
      .map((template) => ({
        ...template,
        score: getRouteTemplateScore(template, employee, shiftAliases),
      }))
      .filter((template) => template.score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score
        }

        return right.createdAt.getTime() - left.createdAt.getTime()
      })[0] ?? null

  if (!matchedRouteTemplate) {
    return null
  }

  const dayStart = startOfDay(referenceDate)
  const dayEnd = endOfDay(referenceDate)

  const [groupRows, itemRows, existingSession, activeSpl] = await Promise.all([
    db
      .select({
        id: activityRouteGroups.id,
        groupKey: activityRouteGroups.groupKey,
        groupName: activityRouteGroups.groupName,
        description: activityRouteGroups.description,
        sortOrder: activityRouteGroups.sortOrder,
        isRequired: activityRouteGroups.isRequired,
      })
      .from(activityRouteGroups)
      .where(eq(activityRouteGroups.routeTemplateId, matchedRouteTemplate.id))
      .orderBy(asc(activityRouteGroups.sortOrder), asc(activityRouteGroups.id)),
    db
      .select({
        id: activityRouteItems.id,
        routeGroupId: activityRouteItems.routeGroupId,
        libraryActivityId: activityRouteItems.libraryActivityId,
        itemCode: activityRouteItems.itemCode,
        itemLabel: activityRouteItems.itemLabel,
        itemDescription: activityRouteItems.itemDescription,
        pointOverride: activityRouteItems.pointOverride,
        sortOrder: activityRouteItems.sortOrder,
        requiresUnit: sql<boolean>`coalesce(${activityRouteItems.requiresUnit}, ${activityLibraries.requiresEquipmentNo}, false)`,
        requiresTime: sql<boolean>`coalesce(${activityRouteItems.requiresTime}, ${activityLibraries.requiresDuration}, false)`,
        requiresRemark: activityRouteItems.requiresRemark,
        requiresPhoto: sql<boolean>`coalesce(${activityRouteItems.requiresPhoto}, ${activityLibraries.requiresPhoto}, false)`,
        requiresLocationGps: sql<boolean>`coalesce(${activityLibraries.requiresLocationGps}, false)`,
        requiresMaterialUsed: sql<boolean>`coalesce(${activityLibraries.requiresMaterialUsed}, false)`,
        requiresTireCount: sql<boolean>`coalesce(${activityLibraries.requiresTireCount}, false)`,
        requiresChecklistEvidence: activityRouteItems.requiresChecklistEvidence,
        isOptional: activityRouteItems.isOptional,
        allowCustomUnit: activityRouteItems.allowCustomUnit,
        libraryCode: activityLibraries.activityCode,
        libraryName: activityLibraries.activityName,
        libraryPoints: activityLibraries.basePoints,
      })
      .from(activityRouteItems)
      .leftJoin(activityLibraries, eq(activityRouteItems.libraryActivityId, activityLibraries.id))
      .innerJoin(activityRouteGroups, eq(activityRouteItems.routeGroupId, activityRouteGroups.id))
      .where(eq(activityRouteGroups.routeTemplateId, matchedRouteTemplate.id))
      .orderBy(asc(activityRouteItems.sortOrder), asc(activityRouteItems.id)),
    db
      .select({
        id: dailyActivitySessions.id,
        status: dailyActivitySessions.status,
      })
      .from(dailyActivitySessions)
      .where(
        and(
          eq(dailyActivitySessions.employeeId, employee.id),
          eq(dailyActivitySessions.routeTemplateId, matchedRouteTemplate.id),
          gte(dailyActivitySessions.workDate, dayStart),
          lte(dailyActivitySessions.workDate, dayEnd)
        )
      )
      .orderBy(desc(dailyActivitySessions.updatedAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getActiveOvertimeCommandLetterForEmployee(employee, referenceDate),
  ])

  const sessionItemRows =
    existingSession == null
      ? []
      : await db
          .select({
            id: dailyActivitySessionItems.id,
            routeItemId: dailyActivitySessionItems.routeItemId,
            snapshotPayload: dailyActivitySessionItems.snapshotPayload,
            startedAt: dailyActivitySessionItems.startedAt,
            endedAt: dailyActivitySessionItems.endedAt,
            checkedAt: dailyActivitySessionItems.checkedAt,
            unitNumber: dailyActivitySessionItems.unitNumber,
            remark: dailyActivitySessionItems.remark,
            actualPoints: dailyActivitySessionItems.actualPoints,
            isChecked: dailyActivitySessionItems.isChecked,
          })
          .from(dailyActivitySessionItems)
          .where(eq(dailyActivitySessionItems.sessionId, existingSession.id))
          .orderBy(asc(dailyActivitySessionItems.sortOrder), asc(dailyActivitySessionItems.id))

  const sessionItemsByRouteItemId = new Map<number, (typeof sessionItemRows)[number]>()
  for (const item of sessionItemRows) {
    if (item.routeItemId != null) {
      sessionItemsByRouteItemId.set(item.routeItemId, item)
    }
  }

  const itemsByGroupId = new Map<number, MatchedRouteChecklist['groups'][number]['items']>()
  for (const item of itemRows) {
    const sessionState = sessionItemsByRouteItemId.get(item.id)
    const list = itemsByGroupId.get(item.routeGroupId) ?? []
    list.push({
      ...item,
      sessionItemId: sessionState?.id ?? null,
      isChecked: sessionState?.isChecked ?? false,
      unitNumber: sessionState?.unitNumber ?? '',
      remark: sessionState?.remark ?? '',
      startedAt: sessionState?.startedAt ?? null,
      endedAt: sessionState?.endedAt ?? null,
      checkedAt: sessionState?.checkedAt ?? null,
      actualPoints: sessionState?.actualPoints ?? item.pointOverride ?? item.libraryPoints ?? 0,
      snapshotPayload: sessionState?.snapshotPayload ?? '',
    })
    itemsByGroupId.set(item.routeGroupId, list)
  }

  const groups = groupRows.map((group) => ({
    ...group,
    items: itemsByGroupId.get(group.id) ?? [],
  }))

  return {
    id: matchedRouteTemplate.id,
    routeCode: matchedRouteTemplate.routeCode,
    routeName: matchedRouteTemplate.routeName,
    shiftCode: matchedRouteTemplate.shiftCode,
    versionLabel: matchedRouteTemplate.versionLabel,
    description: matchedRouteTemplate.description,
    mobileEnabled: matchedRouteTemplate.mobileEnabled,
    approvalRequired: matchedRouteTemplate.approvalRequired,
    siteName: matchedRouteTemplate.siteName,
    departmentName: matchedRouteTemplate.departmentName,
    sectionName: matchedRouteTemplate.sectionName,
    positionName: matchedRouteTemplate.positionName,
    activeSpl,
    sessionId: existingSession?.id ?? null,
    sessionStatus: existingSession?.status ?? null,
    checkedCount: sessionItemRows.filter((item) => item.isChecked).length,
    groupCount: groups.length,
    itemCount: itemRows.length,
    groups,
  }
}

function getCalendarDayKey(reference: Date) {
  const year = reference.getFullYear()
  const month = `${reference.getMonth() + 1}`.padStart(2, '0')
  const day = `${reference.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isCurrentNodeAssignment(
  assignment: {
    effectiveFrom: Date
    effectiveTo: Date | null
    isActive: boolean
  },
  reference = new Date()
) {
  if (!assignment.isActive) {
    return false
  }

  if (assignment.effectiveFrom > reference) {
    return false
  }

  if (assignment.effectiveTo && assignment.effectiveTo < reference) {
    return false
  }

  return true
}

async function getCurrentEmployeeByEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase()

  if (normalizedEmail) {
    // Resolve via better-auth user table (email matches session, not employees.email)
    const [authUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(sql`lower(${user.email}) = ${normalizedEmail}`)
      .limit(1)

    if (authUser?.id) {
      const [matchedEmployee] = await db
        .select({
          id: employees.id,
          authUserId: employees.authUserId,
          siteId: employees.siteId,
          name: employees.name,
          email: employees.email,
          employeeSn: employees.employeeSn,
          joinYear: employees.joinYear,
          birthPlaceDate: employees.birthPlaceDate,
          domicile: employees.domicile,
          directManagerId: employees.directManagerId,
          departmentId: employees.departmentId,
          sectionId: employees.sectionId,
          positionId: employees.positionId,
          orgNodeId: employees.orgNodeId,
          section: employees.section,
          role: employees.role,
          department: employees.department,
          jobTitle: employees.jobTitle,
          workLocation: employees.workLocation,
          phoneNumber: employees.phoneNumber,
          employmentStatus: employees.employmentStatus,
          employeeStatusType: employees.employeeStatusType,
          accessRole: employees.accessRole,
          levelName: employees.levelName,
          totalPoints: employees.totalPoints,
          fitStatus: employees.fitStatus,
          isActive: employees.isActive,
          invitationToken: employees.invitationToken,
          invitationExpiresAt: employees.invitationExpiresAt,
          invitationAcceptedAt: employees.invitationAcceptedAt,
          emailVerificationToken: employees.emailVerificationToken,
          emailVerificationExpiresAt: employees.emailVerificationExpiresAt,
          emailVerified: employees.emailVerified,
          faceEmbedding: employees.faceEmbedding,
          faceRegisteredAt: employees.faceRegisteredAt,
          createdAt: employees.createdAt,
          joinDate: employees.joinDate,
          contractDurationStart: employees.contractDurationStart,
          contractDurationEnd: employees.contractDurationEnd,
          permanentDate: employees.permanentDate,
          pointOfHire: employees.pointOfHire,
          birthDate: employees.birthDate,
          gender: employees.gender,
          maritalStatus: employees.maritalStatus,
          religion: employees.religion,
          education: employees.education,
        })
        .from(employees)
        .where(eq(employees.authUserId, authUser.id))
        .limit(1)

      if (matchedEmployee) {
        return matchedEmployee
      }
    }

    // Fallback: direct email match (for legacy records where corp email = auth email)
    const [matchedByEmail] = await db
      .select({
        id: employees.id,
        authUserId: employees.authUserId,
        siteId: employees.siteId,
        name: employees.name,
        email: employees.email,
        employeeSn: employees.employeeSn,
        joinYear: employees.joinYear,
        birthPlaceDate: employees.birthPlaceDate,
        domicile: employees.domicile,
        directManagerId: employees.directManagerId,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        positionId: employees.positionId,
        orgNodeId: employees.orgNodeId,
        section: employees.section,
        role: employees.role,
        department: employees.department,
        jobTitle: employees.jobTitle,
        workLocation: employees.workLocation,
        phoneNumber: employees.phoneNumber,
        employmentStatus: employees.employmentStatus,
        employeeStatusType: employees.employeeStatusType,
        accessRole: employees.accessRole,
        levelName: employees.levelName,
        totalPoints: employees.totalPoints,
        fitStatus: employees.fitStatus,
        isActive: employees.isActive,
        invitationToken: employees.invitationToken,
        invitationExpiresAt: employees.invitationExpiresAt,
        invitationAcceptedAt: employees.invitationAcceptedAt,
        emailVerificationToken: employees.emailVerificationToken,
        emailVerificationExpiresAt: employees.emailVerificationExpiresAt,
        emailVerified: employees.emailVerified,
        faceEmbedding: employees.faceEmbedding,
        faceRegisteredAt: employees.faceRegisteredAt,
        createdAt: employees.createdAt,
        joinDate: employees.joinDate,
        contractDurationStart: employees.contractDurationStart,
        contractDurationEnd: employees.contractDurationEnd,
        permanentDate: employees.permanentDate,
        pointOfHire: employees.pointOfHire,
        birthDate: employees.birthDate,
        gender: employees.gender,
        maritalStatus: employees.maritalStatus,
        religion: employees.religion,
        education: employees.education,
      })
      .from(employees)
      .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
      .limit(1)

    if (matchedByEmail) {
      return matchedByEmail
    }
  }

  return null
}

async function getManagedEmployeesForLead(currentEmployee: DailyActivityEmployeeContext) {
  const directReports = await db
    .select({
      id: employees.id,
      authUserId: employees.authUserId,
      siteId: employees.siteId,
      name: employees.name,
      email: employees.email,
      employeeSn: employees.employeeSn,
      joinYear: employees.joinYear,
      birthPlaceDate: employees.birthPlaceDate,
      domicile: employees.domicile,
      directManagerId: employees.directManagerId,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      positionId: employees.positionId,
      orgNodeId: employees.orgNodeId,
      section: employees.section,
      role: employees.role,
      department: employees.department,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      phoneNumber: employees.phoneNumber,
      employmentStatus: employees.employmentStatus,
      employeeStatusType: employees.employeeStatusType,
      accessRole: employees.accessRole,
      levelName: employees.levelName,
      totalPoints: employees.totalPoints,
      fitStatus: employees.fitStatus,
      isActive: employees.isActive,
      invitationToken: employees.invitationToken,
      invitationExpiresAt: employees.invitationExpiresAt,
      invitationAcceptedAt: employees.invitationAcceptedAt,
      emailVerificationToken: employees.emailVerificationToken,
      emailVerificationExpiresAt: employees.emailVerificationExpiresAt,
      emailVerified: employees.emailVerified,
      faceEmbedding: employees.faceEmbedding,
      faceRegisteredAt: employees.faceRegisteredAt,
      createdAt: employees.createdAt,
    })
    .from(employees)
    .where(and(eq(employees.directManagerId, currentEmployee.id), eq(employees.isActive, true)))
    .orderBy(asc(employees.name))

  const managedById = new Map(directReports.map((employee) => [employee.id, employee]))
  const managerNodeIds = new Set<number>()

  if (currentEmployee.orgNodeId != null) {
    managerNodeIds.add(currentEmployee.orgNodeId)
  }

  const [ownedNodes, assignedNodes] = await Promise.all([
    db
      .select({
        id: orgChartNodes.id,
      })
      .from(orgChartNodes)
      .where(
        and(eq(orgChartNodes.employeeId, currentEmployee.id), eq(orgChartNodes.isActive, true))
      ),
    db
      .select({
        nodeId: orgNodeAssignments.nodeId,
        effectiveFrom: orgNodeAssignments.effectiveFrom,
        effectiveTo: orgNodeAssignments.effectiveTo,
        isActive: orgNodeAssignments.isActive,
      })
      .from(orgNodeAssignments)
      .where(eq(orgNodeAssignments.employeeId, currentEmployee.id)),
  ])

  for (const node of ownedNodes) {
    managerNodeIds.add(node.id)
  }

  for (const assignment of assignedNodes) {
    if (isCurrentNodeAssignment(assignment)) {
      managerNodeIds.add(assignment.nodeId)
    }
  }

  if (managerNodeIds.size === 0) {
    return Array.from(managedById.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    )
  }

  const nodeRows = await db
    .select({
      id: orgChartNodes.id,
      structureId: orgChartNodes.structureId,
      parentNodeId: orgChartNodes.parentNodeId,
      employeeId: orgChartNodes.employeeId,
    })
    .from(orgChartNodes)
    .where(eq(orgChartNodes.isActive, true))

  const managerStructureIds = new Set(
    nodeRows.filter((node) => managerNodeIds.has(node.id)).map((node) => node.structureId)
  )
  const scopedNodes = nodeRows.filter((node) => managerStructureIds.has(node.structureId))
  const childrenByParent = new Map<number, number[]>()

  for (const node of scopedNodes) {
    if (node.parentNodeId == null) {
      continue
    }

    const children = childrenByParent.get(node.parentNodeId) ?? []
    children.push(node.id)
    childrenByParent.set(node.parentNodeId, children)
  }

  const descendantNodeIds = new Set<number>()
  const queue = Array.from(managerNodeIds)

  while (queue.length > 0) {
    const currentNodeId = queue.shift()
    if (currentNodeId == null) {
      continue
    }

    for (const childNodeId of childrenByParent.get(currentNodeId) ?? []) {
      if (managerNodeIds.has(childNodeId) || descendantNodeIds.has(childNodeId)) {
        continue
      }

      descendantNodeIds.add(childNodeId)
      queue.push(childNodeId)
    }
  }

  if (descendantNodeIds.size === 0) {
    return Array.from(managedById.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    )
  }

  const descendantNodeIdList = Array.from(descendantNodeIds)
  const [nodeBoundEmployees, nodeAssignments] = await Promise.all([
    db
      .select()
      .from(employees)
      .where(and(eq(employees.isActive, true), inArray(employees.orgNodeId, descendantNodeIdList))),
    db
      .select({
        employeeId: orgNodeAssignments.employeeId,
        effectiveFrom: orgNodeAssignments.effectiveFrom,
        effectiveTo: orgNodeAssignments.effectiveTo,
        isActive: orgNodeAssignments.isActive,
      })
      .from(orgNodeAssignments)
      .where(inArray(orgNodeAssignments.nodeId, descendantNodeIdList)),
  ])

  const descendantEmployeeIds = Array.from(
    new Set(
      scopedNodes
        .filter(
          (node) =>
            descendantNodeIds.has(node.id) &&
            node.employeeId != null &&
            node.employeeId !== currentEmployee.id
        )
        .map((node) => node.employeeId as number)
    )
  )

  if (descendantEmployeeIds.length > 0) {
    const descendantEmployees = await db
      .select()
      .from(employees)
      .where(and(eq(employees.isActive, true), inArray(employees.id, descendantEmployeeIds)))

    for (const employee of descendantEmployees) {
      managedById.set(employee.id, employee)
    }
  }

  for (const employee of nodeBoundEmployees) {
    if (employee.id !== currentEmployee.id) {
      managedById.set(employee.id, employee)
    }
  }

  const assignedEmployeeIds = Array.from(
    new Set(
      nodeAssignments
        .filter(
          (assignment) => assignment.employeeId != null && isCurrentNodeAssignment(assignment)
        )
        .map((assignment) => assignment.employeeId as number)
    )
  )

  if (assignedEmployeeIds.length > 0) {
    const assignedEmployees = await db
      .select()
      .from(employees)
      .where(and(eq(employees.isActive, true), inArray(employees.id, assignedEmployeeIds)))

    for (const employee of assignedEmployees) {
      if (employee.id !== currentEmployee.id) {
        managedById.set(employee.id, employee)
      }
    }
  }

  return Array.from(managedById.values()).sort((left, right) => left.name.localeCompare(right.name))
}

export async function getManagedEmployeeIdsForLead(leadEmployeeId: number) {
  await ensureDailyActivitySeedData()

  const [lead] = await db.select().from(employees).where(eq(employees.id, leadEmployeeId)).limit(1)

  if (!lead) {
    return []
  }

  const team = await getManagedEmployeesForLead(lead)
  return team.map((employee) => employee.id)
}

async function ensureDailyActivityTables() {
  await db.execute(sql`
    create table if not exists hero_activity_libraries (
      id serial primary key,
      site_id integer references hero_sites(id) on delete set null,
      activity_code text not null unique,
      activity_name text not null,
      category text not null default 'Technical',
      department_id integer,
      section_id integer,
      base_points integer not null default 5,
      complexity_level integer not null default 1,
      requires_photo boolean not null default false,
      requires_equipment_no boolean not null default false,
      requires_duration boolean not null default true,
      requires_location_gps boolean not null default false,
      requires_material_used boolean not null default false,
      max_daily_count integer not null default 3,
      max_points_per_day integer not null default 50,
      is_assignable boolean not null default true,
      is_self_input boolean not null default true,
      approval_required boolean not null default true,
      auto_approve_if_gps_valid boolean not null default false,
      sla_hours integer not null default 24,
      is_active boolean not null default true,
      created_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    alter table hero_activity_libraries add column if not exists site_id integer references hero_sites(id) on delete set null;
  `)

  await db.execute(sql`
    create table if not exists hero_job_assignments (
      id serial primary key,
      assigned_by_employee_id integer not null references hero_employees(id) on delete cascade,
      assigned_to_employee_id integer not null references hero_employees(id) on delete cascade,
      site_id integer not null references hero_sites(id) on delete cascade,
      library_activity_id integer references hero_activity_libraries(id) on delete set null,
      custom_job_name text not null default '',
      priority text not null default 'Normal',
      estimated_duration integer not null default 60,
      notes text not null default '',
      assignment_type text not null default 'individual',
      assigned_date timestamp not null default now(),
      deadline timestamp,
      status text not null default 'NOT_STARTED',
      is_mandatory boolean not null default false,
      is_recurring boolean not null default false,
      recurrence_rule text not null default '',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_activity_photos (
      id serial primary key,
      activity_id integer not null references hero_activities(id) on delete cascade,
      file_url text not null,
      caption text not null default '',
      uploaded_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_penalty_events (
      id serial primary key,
      employee_id integer not null references hero_employees(id) on delete cascade,
      activity_id integer references hero_activities(id) on delete set null,
      site_id integer not null references hero_sites(id) on delete cascade,
      activity_id integer references hero_activities(id) on delete set null,
      penalty_code text not null,
      penalty_type text not null,
      reference_date timestamp not null default now(),
      points_deducted integer not null default 0,
      description text not null default '',
      is_disputed boolean not null default false,
      dispute_status text not null default 'none',
      resolved_at timestamp,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    alter table hero_daily_activity_sessions
    add column if not exists activity_id integer references hero_activities(id) on delete set null;
  `)

  await db.execute(sql`
    create table if not exists hero_point_disputes (
      id serial primary key,
      penalty_event_id integer not null references hero_penalty_events(id) on delete cascade,
      employee_id integer not null references hero_employees(id) on delete cascade,
      reason text not null,
      evidence_urls text not null default '[]',
      status text not null default 'pending',
      resolved_by_employee_id integer references hero_employees(id) on delete set null,
      resolution_notes text not null default '',
      created_at timestamp not null default now(),
      resolved_at timestamp
    );
  `)

  await db.execute(sql`
    create table if not exists hero_streak_records (
      id serial primary key,
      employee_id integer not null references hero_employees(id) on delete cascade,
      streak_start_date timestamp not null default now(),
      current_streak_days integer not null default 0,
      longest_streak_days integer not null default 0,
      last_activity_date timestamp,
      streak_bonus_active boolean not null default false,
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_activity_modifiers (
      id serial primary key,
      site_id integer references hero_sites(id) on delete set null,
      event_name text not null,
      description text not null default '',
      multiplier integer not null default 100,
      start_date timestamp not null default now(),
      end_date timestamp,
      is_active boolean not null default true,
      created_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_daily_activity_configs (
      id serial primary key,
      site_id integer references hero_sites(id) on delete set null,
      config_key text not null unique,
      config_label text not null,
      config_value text not null default '',
      value_type text not null default 'number',
      description text not null default '',
      is_editable_by_section_head boolean not null default false,
      is_active boolean not null default true,
      updated_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_activity_route_templates (
      id serial primary key,
      site_id integer references hero_sites(id) on delete set null,
      department_id integer references hero_master_departments(id) on delete set null,
      section_id integer references hero_master_sections(id) on delete set null,
      position_id integer references hero_master_positions(id) on delete set null,
      route_code text not null unique,
      route_name text not null,
      shift_code text not null default 'ALL',
      description text not null default '',
      mobile_enabled boolean not null default true,
      approval_required boolean not null default false,
      version_label text not null default 'v1',
      effective_from timestamp not null default now(),
      effective_to timestamp,
      is_active boolean not null default true,
      created_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_activity_route_groups (
      id serial primary key,
      route_template_id integer not null references hero_activity_route_templates(id) on delete cascade,
      group_key text not null,
      group_name text not null,
      description text not null default '',
      sort_order integer not null default 1,
      is_required boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_activity_route_items (
      id serial primary key,
      route_group_id integer not null references hero_activity_route_groups(id) on delete cascade,
      library_activity_id integer references hero_activity_libraries(id) on delete set null,
      item_code text not null default '',
      item_label text not null,
      item_description text not null default '',
      point_override integer,
      requires_unit boolean not null default false,
      requires_time boolean not null default true,
      requires_remark boolean not null default false,
      requires_photo boolean not null default false,
      requires_checklist_evidence boolean not null default false,
      is_optional boolean not null default false,
      allow_custom_unit boolean not null default true,
      sort_order integer not null default 1,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_activity_section_point_overrides (
      id serial primary key,
      site_id integer references hero_sites(id) on delete set null,
      department_id integer references hero_master_departments(id) on delete set null,
      section_id integer references hero_master_sections(id) on delete set null,
      position_id integer references hero_master_positions(id) on delete set null,
      library_activity_id integer not null references hero_activity_libraries(id) on delete cascade,
      override_label text not null default '',
      override_points integer,
      reason text not null default '',
      is_active boolean not null default true,
      created_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_overtime_command_letters (
      id serial primary key,
      request_submission_id integer references hero_form_submissions(id) on delete set null,
      site_id integer not null references hero_sites(id) on delete cascade,
      department_id integer references hero_master_departments(id) on delete set null,
      section_id integer references hero_master_sections(id) on delete set null,
      position_id integer references hero_master_positions(id) on delete set null,
      requested_by_employee_id integer not null references hero_employees(id) on delete cascade,
      approved_by_employee_id integer references hero_employees(id) on delete set null,
      spl_number text not null unique,
      title text not null,
      work_date timestamp not null,
      planned_start_at timestamp,
      planned_end_at timestamp,
      status text not null default 'draft',
      request_notes text not null default '',
      execution_notes text not null default '',
      origin text not null default 'leader_command',
      request_kind text not null default 'base',
      parent_spl_id integer references hero_overtime_command_letters(id) on delete set null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(
    sql`alter table hero_overtime_command_letters add column if not exists origin text not null default 'leader_command'`
  )
  await db.execute(
    sql`alter table hero_overtime_command_letters add column if not exists request_kind text not null default 'base'`
  )
  await db.execute(
    sql`alter table hero_overtime_command_letters add column if not exists parent_spl_id integer references hero_overtime_command_letters(id) on delete set null`
  )

  await db.execute(sql`
    create table if not exists hero_overtime_command_letter_participants (
      id serial primary key,
      overtime_command_letter_id integer not null references hero_overtime_command_letters(id) on delete cascade,
      employee_id integer not null references hero_employees(id) on delete cascade,
      category text not null default 'after_mandatory_ot',
      shift_code text not null default 'DS',
      roster_type text not null default '5:2',
      schedule_code text not null default '',
      work_streak_days integer not null default 0,
      overtime_credit_minutes integer,
      replacement_off_date timestamp,
      work_period text not null default '',
      payroll_period text not null default '',
      evidence_status text not null default 'pending',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now(),
      unique (overtime_command_letter_id, employee_id)
    )
  `)

  await db.execute(sql`
    create table if not exists hero_overtime_command_letter_items (
      id serial primary key,
      overtime_command_letter_id integer not null references hero_overtime_command_letters(id) on delete cascade,
      route_template_id integer references hero_activity_route_templates(id) on delete set null,
      route_item_id integer references hero_activity_route_items(id) on delete set null,
      library_activity_id integer references hero_activity_libraries(id) on delete set null,
      line_label text not null,
      line_description text not null default '',
      target_unit text not null default '',
      estimated_minutes integer not null default 60,
      planned_points integer not null default 0,
      sort_order integer not null default 1,
      is_custom_line boolean not null default false,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_daily_activity_sessions (
      id serial primary key,
      site_id integer not null references hero_sites(id) on delete cascade,
      employee_id integer not null references hero_employees(id) on delete cascade,
      department_id integer references hero_master_departments(id) on delete set null,
      section_id integer references hero_master_sections(id) on delete set null,
      position_id integer references hero_master_positions(id) on delete set null,
      route_template_id integer references hero_activity_route_templates(id) on delete set null,
      overtime_command_letter_id integer references hero_overtime_command_letters(id) on delete set null,
      legacy_assignment_id integer references hero_job_assignments(id) on delete set null,
      session_code text not null unique,
      shift_code text not null default 'ALL',
      work_date timestamp not null,
      status text not null default 'draft',
      submission_source text not null default 'route',
      started_at timestamp,
      submitted_at timestamp,
      approved_at timestamp,
      summary_remark text not null default '',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_daily_activity_session_items (
      id serial primary key,
      session_id integer not null references hero_daily_activity_sessions(id) on delete cascade,
      route_item_id integer references hero_activity_route_items(id) on delete set null,
      library_activity_id integer references hero_activity_libraries(id) on delete set null,
      overtime_command_letter_item_id integer references hero_overtime_command_letter_items(id) on delete set null,
      snapshot_label text not null,
      snapshot_group_name text not null default '',
      snapshot_payload text not null default '{}',
      started_at timestamp,
      ended_at timestamp,
      checked_at timestamp,
      unit_number text not null default '',
      remark text not null default '',
      actual_points integer not null default 0,
      is_checked boolean not null default false,
      is_custom_item boolean not null default false,
      photo_count integer not null default 0,
      sort_order integer not null default 1,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    alter table hero_activities add column if not exists library_activity_id integer;
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists assignment_id integer;
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists source_mode text not null default 'self_input';
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists custom_activity_name text not null default '';
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists custom_activity_description text not null default '';
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists submission_time timestamp;
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists submission_category text not null default 'on_time';
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists equipment_no text not null default '';
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists material_used text not null default '';
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists gps_lat text not null default '';
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists gps_lng text not null default '';
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists gps_valid boolean not null default false;
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists photo_count integer not null default 0;
  `)
  await db.execute(sql`
    alter table hero_activities add column if not exists penalty_deducted integer not null default 0;
  `)

  await db.execute(sql`
    alter table hero_approvals add column if not exists points_override integer;
  `)
  await db.execute(sql`
    alter table hero_approvals add column if not exists rejection_reason text not null default '';
  `)
  await db.execute(sql`
    alter table hero_approvals add column if not exists points_override_reason text not null default '';
  `)
  await db.execute(sql`
    alter table hero_approvals add column if not exists created_at timestamp not null default now();
  `)

  await db.execute(sql`
    alter table hero_point_events add column if not exists transaction_type text not null default 'reward';
  `)
  await db.execute(sql`
    alter table hero_point_events add column if not exists source_type text not null default 'activity';
  `)
  await db.execute(sql`
    alter table hero_point_events add column if not exists source_id integer;
  `)
  await db.execute(sql`
    alter table hero_point_events add column if not exists balance_after integer;
  `)
  await db.execute(sql`
    alter table hero_point_events add column if not exists metadata text not null default '';
  `)
}

async function seedDailyActivityReferenceData() {
  const [
    employeeRows,
    departmentRows,
    sectionRows,
    positionRows,
    siteRows,
    libraryCount,
    routeTemplateCount,
    configCount,
    streakCount,
    modifierCount,
  ] = await Promise.all([
    db.select().from(employees).where(eq(employees.isActive, true)).orderBy(asc(employees.id)),
    db.select().from(masterDepartments).orderBy(asc(masterDepartments.id)),
    db.select().from(masterSections).orderBy(asc(masterSections.id)),
    db.select().from(masterPositions).orderBy(asc(masterPositions.id)),
    db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.id)),
    db.select({ count: sql<number>`count(*)::int` }).from(activityLibraries),
    db.select({ count: sql<number>`count(*)::int` }).from(activityRouteTemplates),
    db.select({ count: sql<number>`count(*)::int` }).from(dailyActivityConfigs),
    db.select({ count: sql<number>`count(*)::int` }).from(streakRecords),
    db.select({ count: sql<number>`count(*)::int` }).from(activityModifiers),
  ])

  const creatorEmployee =
    employeeRows.find((employee) => employee.accessRole.toLowerCase().includes('admin')) ??
    employeeRows[0] ??
    null
  const departmentByName = new Map(
    departmentRows.map((department) => [department.name.trim().toLowerCase(), department])
  )
  const defaultSite = siteRows[0] ?? null
  const defaultSection =
    sectionRows.find((section) => section.name.toLowerCase().includes('tire')) ??
    sectionRows.find((section) => section.name.toLowerCase().includes('service')) ??
    sectionRows[0] ??
    null
  const defaultPosition =
    positionRows.find((position) => position.name.toLowerCase().includes('tire')) ??
    positionRows.find((position) => position.name.toLowerCase().includes('technician')) ??
    positionRows.find((position) => position.name.toLowerCase().includes('staff')) ??
    positionRows[0] ??
    null

  if ((libraryCount[0]?.count ?? 0) === 0 && creatorEmployee) {
    await db.insert(activityLibraries).values(
      DEFAULT_LIBRARY_SEEDS.map((item) => ({
        activityCode: item.activityCode,
        siteId: defaultSite?.id ?? null,
        siteIds: defaultSite?.id ? [defaultSite.id] : [],
        activityName: item.activityName,
        category: item.category,
        departmentId: departmentByName.get(item.departmentName.trim().toLowerCase())?.id ?? null,
        sectionId: null,
        basePoints: item.basePoints,
        complexityLevel: item.complexityLevel,
        requiresPhoto: item.requiresPhoto,
        requiresEquipmentNo: item.requiresEquipmentNo,
        requiresDuration: item.requiresDuration,
        requiresLocationGps: item.requiresLocationGps,
        requiresMaterialUsed: item.requiresMaterialUsed,
        requiresTireCount: (item as any).requiresTireCount ?? false,
        maxDailyCount: item.maxDailyCount,
        maxPointsPerDay: item.maxPointsPerDay,
        isAssignable: item.isAssignable,
        isSelfInput: item.isSelfInput,
        approvalRequired: item.approvalRequired,
        autoApproveIfGpsValid: item.autoApproveIfGpsValid,
        slaHours: item.slaHours,
        isActive: true,
        createdByEmployeeId: creatorEmployee.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    )
  }

  if ((configCount[0]?.count ?? 0) === 0) {
    await db.insert(dailyActivityConfigs).values(
      DEFAULT_CONFIG_SEEDS.map((config) => ({
        siteId: defaultSite?.id ?? null,
        configKey: config.configKey,
        configLabel: config.configLabel,
        configValue: config.configValue,
        valueType: config.valueType,
        description: config.description,
        isEditableBySectionHead: config.isEditableBySectionHead,
        isActive: true,
        updatedByEmployeeId: creatorEmployee?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    )
  }

  if ((streakCount[0]?.count ?? 0) === 0 && employeeRows.length > 0) {
    await db.insert(streakRecords).values(
      employeeRows.slice(0, 8).map((employee, index) => ({
        employeeId: employee.id,
        streakStartDate: new Date(Date.now() - (index + 3) * 24 * 60 * 60 * 1000),
        currentStreakDays: Math.max(2, 9 - index),
        longestStreakDays: Math.max(5, 12 - index),
        lastActivityDate: new Date(),
        streakBonusActive: index < 3,
        updatedAt: new Date(),
      }))
    )
  }

  if ((modifierCount[0]?.count ?? 0) === 0 && creatorEmployee && defaultSite) {
    await db.insert(activityModifiers).values([
      {
        siteId: defaultSite.id,
        eventName: 'Site Competition Week',
        description: 'Multiplier reward untuk mendorong pelaporan disiplin selama kompetisi site.',
        multiplier: 150,
        startDate: startOfDay(new Date()),
        endDate: endOfDay(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        isActive: true,
        createdByEmployeeId: creatorEmployee.id,
        createdAt: new Date(),
      },
    ])
  }

  if ((routeTemplateCount[0]?.count ?? 0) === 0 && creatorEmployee) {
    const [libraryRows] = await Promise.all([
      db
        .select({
          id: activityLibraries.id,
          activityCode: activityLibraries.activityCode,
          activityName: activityLibraries.activityName,
          category: activityLibraries.category,
          requiresPhoto: activityLibraries.requiresPhoto,
          requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
          requiresDuration: activityLibraries.requiresDuration,
          basePoints: activityLibraries.basePoints,
        })
        .from(activityLibraries)
        .where(eq(activityLibraries.isActive, true))
        .orderBy(asc(activityLibraries.activityCode)),
    ])

    const [createdTemplate] = await db
      .insert(activityRouteTemplates)
      .values({
        siteId: defaultSite?.id ?? null,
        departmentId: defaultSection?.departmentId ?? defaultPosition?.departmentId ?? null,
        sectionId: defaultSection?.id ?? defaultPosition?.sectionId ?? null,
        positionId: defaultPosition?.id ?? null,
        routeCode: 'ROUTE-TS-001',
        routeName: 'Default Tire Service Daily Route',
        shiftCode: 'ALL',
        description: 'Route awal untuk demonstrasi nested checklist pekerjaan harian.',
        mobileEnabled: true,
        approvalRequired: false,
        versionLabel: 'v1',
        effectiveFrom: new Date(),
        effectiveTo: null,
        isActive: true,
        createdByEmployeeId: creatorEmployee.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: activityRouteTemplates.id })

    const [safetyGroup, inspectionGroup, executionGroup] = await db
      .insert(activityRouteGroups)
      .values([
        {
          routeTemplateId: createdTemplate.id,
          groupKey: 'safety-talk',
          groupName: 'Safety Talk',
          description: 'Kickoff, toolbox meeting, dan kesiapan kerja.',
          sortOrder: 1,
          isRequired: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          routeTemplateId: createdTemplate.id,
          groupKey: 'inspection',
          groupName: 'Inspection',
          description: 'Pemeriksaan awal unit dan tekanan ban.',
          sortOrder: 2,
          isRequired: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          routeTemplateId: createdTemplate.id,
          groupKey: 'execution',
          groupName: 'Execution',
          description: 'Perbaikan, mounting, dan clean up.',
          sortOrder: 3,
          isRequired: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .returning({ id: activityRouteGroups.id, groupKey: activityRouteGroups.groupKey })

    const groupByKey = new Map(
      [safetyGroup, inspectionGroup, executionGroup].map((group) => [group.groupKey, group])
    )
    const libraryByCode = new Map(libraryRows.map((item) => [item.activityCode, item]))

    await db.insert(activityRouteItems).values([
      {
        routeGroupId: groupByKey.get('safety-talk')!.id,
        libraryActivityId: libraryByCode.get('HSE-001')?.id ?? null,
        itemCode: 'RT-001',
        itemLabel: 'Toolbox meeting dan safety briefing',
        itemDescription: 'Pembukaan shift sebelum pekerjaan teknikal dimulai.',
        pointOverride: 8,
        requiresUnit: false,
        requiresTime: true,
        requiresRemark: true,
        requiresPhoto: false,
        requiresChecklistEvidence: false,
        isOptional: false,
        allowCustomUnit: false,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        routeGroupId: groupByKey.get('inspection')!.id,
        libraryActivityId: libraryByCode.get('TS-001')?.id ?? null,
        itemCode: 'RT-002',
        itemLabel: 'Tyre inspection dan pressure check',
        itemDescription: 'Centang bila inspeksi dan pressure check dilakukan pada unit terkait.',
        pointOverride: 10,
        requiresUnit: true,
        requiresTime: true,
        requiresRemark: false,
        requiresPhoto: true,
        requiresChecklistEvidence: false,
        isOptional: false,
        allowCustomUnit: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        routeGroupId: groupByKey.get('execution')!.id,
        libraryActivityId: libraryByCode.get('TS-002')?.id ?? null,
        itemCode: 'RT-003',
        itemLabel: 'Tyre change / repair execution',
        itemDescription: 'Dipakai untuk pekerjaan penggantian atau repair tyre pada unit.',
        pointOverride: 18,
        requiresUnit: true,
        requiresTime: true,
        requiresRemark: true,
        requiresPhoto: true,
        requiresChecklistEvidence: false,
        isOptional: true,
        allowCustomUnit: true,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        routeGroupId: groupByKey.get('execution')!.id,
        libraryActivityId: null,
        itemCode: 'RT-004',
        itemLabel: 'Housekeeping dan clean up area kerja',
        itemDescription: 'Item custom default untuk penutupan pekerjaan harian.',
        pointOverride: 4,
        requiresUnit: false,
        requiresTime: true,
        requiresRemark: false,
        requiresPhoto: false,
        requiresChecklistEvidence: false,
        isOptional: false,
        allowCustomUnit: false,
        sortOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  }
}

export async function ensureDailyActivitySeedData() {
  if (dailyActivitySeedPromise) {
    return dailyActivitySeedPromise
  }

  dailyActivitySeedPromise = (async () => {
    await ensureHeroGovernanceSeedData()
    await ensureDailyActivityTables()
    await seedDailyActivityReferenceData()
  })().catch((error) => {
    dailyActivitySeedPromise = null
    throw error
  })

  return dailyActivitySeedPromise
}

export async function getDailyActivityConfigMap() {
  await ensureDailyActivitySeedData()

  const rows = await db
    .select({
      configKey: dailyActivityConfigs.configKey,
      configValue: dailyActivityConfigs.configValue,
    })
    .from(dailyActivityConfigs)
    .where(eq(dailyActivityConfigs.isActive, true))

  return new Map(rows.map((row) => [row.configKey, Number.parseInt(row.configValue, 10) || 0]))
}

type DailyActivityReadOptions = {
  ensureSeed?: boolean
}

export type RouteFolder = {
  id: number
  routeCode: string
  routeName: string
  groups: Array<{
    id: number
    groupName: string
    items: Array<{
      id: number
      libraryActivityId: number | null
    }>
  }>
}

async function getAvailableRouteFoldersForEmployee(
  employee: DailyActivityEmployeeContext,
  referenceDate = new Date()
): Promise<RouteFolder[]> {
  const routeTemplateRows = await db
    .select({
      id: activityRouteTemplates.id,
      routeCode: activityRouteTemplates.routeCode,
      routeName: activityRouteTemplates.routeName,
      shiftCode: activityRouteTemplates.shiftCode,
      description: activityRouteTemplates.description,
      versionLabel: activityRouteTemplates.versionLabel,
      mobileEnabled: activityRouteTemplates.mobileEnabled,
      approvalRequired: activityRouteTemplates.approvalRequired,
      siteId: activityRouteTemplates.siteId,
      siteName: sites.name,
      departmentId: activityRouteTemplates.departmentId,
      departmentName: masterDepartments.name,
      sectionId: activityRouteTemplates.sectionId,
      sectionName: masterSections.name,
      positionId: activityRouteTemplates.positionId,
      positionName: masterPositions.name,
      effectiveFrom: activityRouteTemplates.effectiveFrom,
      createdAt: activityRouteTemplates.createdAt,
    })
    .from(activityRouteTemplates)
    .leftJoin(sites, eq(activityRouteTemplates.siteId, sites.id))
    .leftJoin(masterDepartments, eq(activityRouteTemplates.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(activityRouteTemplates.sectionId, masterSections.id))
    .leftJoin(masterPositions, eq(activityRouteTemplates.positionId, masterPositions.id))
    .where(eq(activityRouteTemplates.isActive, true))
    .orderBy(desc(activityRouteTemplates.mobileEnabled), desc(activityRouteTemplates.createdAt))

  const shiftAliases = getShiftAliases(referenceDate)
  const matchedRouteTemplates = routeTemplateRows
    .map((template) => ({
      ...template,
      score: getRouteTemplateScore(template, employee, shiftAliases),
    }))
    .filter((template) => template.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }
      return right.createdAt.getTime() - left.createdAt.getTime()
    })

  if (matchedRouteTemplates.length === 0) {
    return []
  }

  const templateIds = matchedRouteTemplates.map(t => t.id)

  const [groupRows, itemRows] = await Promise.all([
    db
      .select({
        id: activityRouteGroups.id,
        routeTemplateId: activityRouteGroups.routeTemplateId,
        groupKey: activityRouteGroups.groupKey,
        groupName: activityRouteGroups.groupName,
        description: activityRouteGroups.description,
        sortOrder: activityRouteGroups.sortOrder,
        isRequired: activityRouteGroups.isRequired,
      })
      .from(activityRouteGroups)
      .where(inArray(activityRouteGroups.routeTemplateId, templateIds))
      .orderBy(asc(activityRouteGroups.sortOrder), asc(activityRouteGroups.id)),
    db
      .select({
        id: activityRouteItems.id,
        routeGroupId: activityRouteItems.routeGroupId,
        libraryActivityId: activityRouteItems.libraryActivityId,
        itemCode: activityRouteItems.itemCode,
        itemLabel: activityRouteItems.itemLabel,
        itemDescription: activityRouteItems.itemDescription,
        pointOverride: activityRouteItems.pointOverride,
        sortOrder: activityRouteItems.sortOrder,
      })
      .from(activityRouteItems)
      .innerJoin(activityRouteGroups, eq(activityRouteItems.routeGroupId, activityRouteGroups.id))
      .where(inArray(activityRouteGroups.routeTemplateId, templateIds))
      .orderBy(asc(activityRouteItems.sortOrder), asc(activityRouteItems.id)),
  ])

  const itemsByGroupId = new Map<number, typeof itemRows>()
  for (const item of itemRows) {
    const list = itemsByGroupId.get(item.routeGroupId) ?? []
    list.push(item)
    itemsByGroupId.set(item.routeGroupId, list)
  }

  const groupsByTemplateId = new Map<number, any[]>()
  for (const group of groupRows) {
    const list = groupsByTemplateId.get(group.routeTemplateId) ?? []
    list.push({
      ...group,
      items: itemsByGroupId.get(group.id) ?? []
    })
    groupsByTemplateId.set(group.routeTemplateId, list)
  }

  return matchedRouteTemplates.map(t => ({
    id: t.id,
    routeCode: t.routeCode,
    routeName: t.routeName,
    groups: groupsByTemplateId.get(t.id) ?? []
  }))
}
export async function getDailyActivityEmployeeData(
  email?: string | null,
  options: DailyActivityReadOptions = {}
) {
  if (options.ensureSeed !== false) {
    await ensureDailyActivitySeedData()
  }

  const employee = await getCurrentEmployeeByEmail(email)
  if (!employee) {
    return null
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, employee.siteId)).limit(1)
  const dayStart = startOfDay()
  const dayEnd = endOfDay()

  const [assignmentRows, activityRows, pointRows, penaltyRows, streak, libraryRows, modifierRows] =
    await Promise.all([
      db
        .select({
          id: jobAssignments.id,
          priority: jobAssignments.priority,
          notes: jobAssignments.notes,
          status: jobAssignments.status,
          isMandatory: jobAssignments.isMandatory,
          estimatedDuration: jobAssignments.estimatedDuration,
          deadline: jobAssignments.deadline,
          createdAt: jobAssignments.createdAt,
          assignmentType: jobAssignments.assignmentType,
          customJobName: jobAssignments.customJobName,
          assignedByName: employees.name,
          libraryActivityId: activityLibraries.id,
          activityCode: activityLibraries.activityCode,
          activityName: activityLibraries.activityName,
          category: activityLibraries.category,
          requiresPhoto: activityLibraries.requiresPhoto,
          requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
          requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
          requiresTireCount: activityLibraries.requiresTireCount,
          basePoints: activityLibraries.basePoints,
        })
        .from(jobAssignments)
        .leftJoin(activityLibraries, eq(jobAssignments.libraryActivityId, activityLibraries.id))
        .innerJoin(employees, eq(jobAssignments.assignedByEmployeeId, employees.id))
        .where(
          and(
            eq(jobAssignments.assignedToEmployeeId, employee.id),
            gte(jobAssignments.assignedDate, dayStart),
            lte(jobAssignments.assignedDate, dayEnd)
          )
        )
        .orderBy(asc(jobAssignments.deadline), desc(jobAssignments.id)),
      db
        .select({
          id: activities.id,
          activityCode: activities.activityCode,
          activityType: activities.activityType,
          title: activities.title,
          unitNumber: activities.unitNumber,
          sourceMode: activities.sourceMode,
          status: activities.status,
          priority: activities.priority,
          startTime: activities.startTime,
          endTime: activities.endTime,
          submissionTime: activities.submissionTime,
          submissionCategory: activities.submissionCategory,
          pointsAwarded: activities.pointsAwarded,
          penaltyDeducted: activities.penaltyDeducted,
          equipmentNo: activities.equipmentNo,
          materialUsed: activities.materialUsed,
          gpsValid: activities.gpsValid,
          photoCount: activities.photoCount,
          remarks: activities.remarks,
          assignmentId: activities.assignmentId,
          isTeamActivity: activities.isTeamActivity,
          teamNameList: activities.teamNameList,
          libraryName: activityLibraries.activityName,
        })
        .from(activities)
        .leftJoin(activityLibraries, eq(activities.libraryActivityId, activityLibraries.id))
        .where(
          and(
            eq(activities.employeeId, employee.id),
            or(
              and(gte(activities.startTime, dayStart), lte(activities.startTime, dayEnd)),
              and(gte(activities.submissionTime, dayStart), lte(activities.submissionTime, dayEnd))
            )
          )
        )
        .orderBy(desc(activities.startTime), desc(activities.id)),
      db
        .select({
          id: pointEvents.id,
          category: pointEvents.category,
          label: pointEvents.label,
          points: pointEvents.points,
          transactionType: pointEvents.transactionType,
          createdAt: pointEvents.createdAt,
        })
        .from(pointEvents)
        .where(eq(pointEvents.employeeId, employee.id))
        .orderBy(desc(pointEvents.createdAt))
        .limit(8),
      db
        .select({
          id: penaltyEvents.id,
          penaltyCode: penaltyEvents.penaltyCode,
          penaltyType: penaltyEvents.penaltyType,
          pointsDeducted: penaltyEvents.pointsDeducted,
          description: penaltyEvents.description,
          disputeStatus: penaltyEvents.disputeStatus,
          isDisputed: penaltyEvents.isDisputed,
          createdAt: penaltyEvents.createdAt,
        })
        .from(penaltyEvents)
        .where(eq(penaltyEvents.employeeId, employee.id))
        .orderBy(desc(penaltyEvents.createdAt))
        .limit(5),
      db
        .select()
        .from(streakRecords)
        .where(eq(streakRecords.employeeId, employee.id))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select({
          id: activityLibraries.id,
          activityCode: activityLibraries.activityCode,
          activityName: activityLibraries.activityName,
          category: activityLibraries.category,
          siteId: activityLibraries.siteId,
          siteIds: activityLibraries.siteIds,
          siteName: sites.name,
          basePoints: activityLibraries.basePoints,
          complexityLevel: activityLibraries.complexityLevel,
          requiresPhoto: activityLibraries.requiresPhoto,
          requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
          requiresDuration: activityLibraries.requiresDuration,
          requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
          requiresLocationGps: activityLibraries.requiresLocationGps,
          requiresTireCount: activityLibraries.requiresTireCount,
          maxDailyCount: activityLibraries.maxDailyCount,
          maxPointsPerDay: activityLibraries.maxPointsPerDay,
          departmentId: activityLibraries.departmentId,
          departmentIds: activityLibraries.departmentIds,
          sectionId: activityLibraries.sectionId,
          sectionIds: activityLibraries.sectionIds,
          slaHours: activityLibraries.slaHours,
        })
        .from(activityLibraries)
        .leftJoin(sites, eq(activityLibraries.siteId, sites.id))
        .where(
          and(
            eq(activityLibraries.isActive, true),
            eq(activityLibraries.isSelfInput, true),
            librarySiteMatches(
              activityLibraries.siteId,
              activityLibraries.siteIds,
              employee.siteId ?? null
            ),
            // ponytail: upgrade path → split dept & section to separate permission tables
            libraryDeptMatches(
              activityLibraries.departmentId,
              activityLibraries.departmentIds,
              employee.departmentId ?? null
            ),
            librarySectionMatches(
              activityLibraries.sectionId,
              activityLibraries.sectionIds,
              employee.sectionId ?? null
            )
          )
        )
        .orderBy(desc(activityLibraries.basePoints), asc(activityLibraries.activityName)),
      db
        .select()
        .from(activityModifiers)
        .where(
          and(
            eq(activityModifiers.isActive, true),
            lte(activityModifiers.startDate, new Date()),
            or(isNull(activityModifiers.endDate), gte(activityModifiers.endDate, new Date()))
          )
        )
        .orderBy(desc(activityModifiers.multiplier), asc(activityModifiers.eventName)),
    ])
  const routeChecklist = await getMatchedRouteChecklistForEmployee(employee, new Date())
  const standaloneOvertimeChecklist =
    routeChecklist == null
      ? await getStandaloneOvertimeChecklistForEmployee(employee, new Date())
      : null
  const activityIds = activityRows.map((row) => row.id)
  const activityPhotoRows =
    activityIds.length === 0
      ? []
      : await db
          .select({
            id: activityPhotos.id,
            activityId: activityPhotos.activityId,
            fileUrl: activityPhotos.fileUrl,
            caption: activityPhotos.caption,
          })
          .from(activityPhotos)
          .where(inArray(activityPhotos.activityId, activityIds))
          .orderBy(asc(activityPhotos.uploadedAt), asc(activityPhotos.id))
  const photosByActivityId = new Map<number, Array<{ id: number; url: string; caption: string }>>()

  for (const photo of activityPhotoRows) {
    const photos = photosByActivityId.get(photo.activityId) ?? []
    photos.push({
      id: photo.id,
      url: resolveUploadUrl(photo.fileUrl),
      caption: photo.caption,
    })
    photosByActivityId.set(photo.activityId, photos)
  }

  const approvedOrSubmitted = activityRows.filter((row) =>
    ['approved', 'pending l1', 'pending approval', 'submitted'].includes(row.status.toLowerCase())
  ).length
  const pointsToday = pointRows
    .filter((row) => row.createdAt >= dayStart && row.createdAt <= dayEnd)
    .reduce((total, row) => total + row.points, 0)
  const penaltyToday = penaltyRows
    .filter((row) => row.createdAt >= dayStart && row.createdAt <= dayEnd)
    .reduce((total, row) => total + row.pointsDeducted, 0)

  const availableRouteFolders = await getAvailableRouteFoldersForEmployee(employee, new Date())

  // Route groups can map library activities that sit outside the employee's default
  // dept/site scope (explicitly linked by admin). Pull them in so they render in the
  // route folder tree AND remain selectable on submit.
  const routeLibraryIds = availableRouteFolders.flatMap((folder) =>
    folder.groups.flatMap((group) =>
      group.items.map((item) => item.libraryActivityId)
    )
  ).filter((id): id is number => id != null)
  const uniqueRouteLibraryIds = [...new Set(routeLibraryIds)]
  const extraRouteLibraries = uniqueRouteLibraryIds.length
    ? await db
        .select({
          id: activityLibraries.id,
          activityCode: activityLibraries.activityCode,
          activityName: activityLibraries.activityName,
          category: activityLibraries.category,
          siteId: activityLibraries.siteId,
          siteIds: activityLibraries.siteIds,
          siteName: sites.name,
          basePoints: activityLibraries.basePoints,
          complexityLevel: activityLibraries.complexityLevel,
          requiresPhoto: activityLibraries.requiresPhoto,
          requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
          requiresDuration: activityLibraries.requiresDuration,
          requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
          requiresLocationGps: activityLibraries.requiresLocationGps,
          requiresTireCount: activityLibraries.requiresTireCount,
          maxDailyCount: activityLibraries.maxDailyCount,
          maxPointsPerDay: activityLibraries.maxPointsPerDay,
          departmentId: activityLibraries.departmentId,
          sectionId: activityLibraries.sectionId,
          slaHours: activityLibraries.slaHours,
        })
        .from(activityLibraries)
        .leftJoin(sites, eq(activityLibraries.siteId, sites.id))
        .where(
          and(
            inArray(activityLibraries.id, uniqueRouteLibraryIds),
            eq(activityLibraries.isActive, true)
          )
        )
    : []
  const knownLibraryIds = new Set(libraryRows.map((row) => row.id))
  const mergedLibraryRows = [
    ...libraryRows,
    ...extraRouteLibraries.filter((row) => !knownLibraryIds.has(row.id)),
  ]

  return {
    employee,
    site,
    availableRouteFolders,
    summary: {
      shift: getShiftLabel(),
      jobsAssigned: assignmentRows.length,
      jobsCompleted: approvedOrSubmitted,
      pointsToday,
      penaltyToday,
      currentLevel: employee.levelName,
      streakDays: streak?.currentStreakDays ?? 0,
      syncAt: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      activeModifier:
        modifierRows[0] != null
          ? `${modifierRows[0].eventName} (${modifierRows[0].multiplier}%)`
          : null,
    },
    assignments: assignmentRows.map((row) => ({
      ...row,
      durationLabel: formatDurationLabel(row.estimatedDuration),
      statusLabel: normalizeStatusLabel(row.status),
    })),
    activities: activityRows.map((row) => ({
      ...row,
      photos: photosByActivityId.get(row.id) ?? [],
      durationMinutes: minutesBetween(row.startTime, row.endTime),
      durationLabel: formatDurationLabel(minutesBetween(row.startTime, row.endTime)),
      pointsNet: row.pointsAwarded - row.penaltyDeducted,
      statusLabel: row.status,
    })),
    pointsFeed: pointRows,
    penalties: penaltyRows,
    streak,
    availableLibrary: mergedLibraryRows,
    routeChecklist,
    standaloneOvertimeChecklist,
    revalidatePaths: DAILY_ACTIVITY_REVALIDATE_PATHS,
  }
}

export async function getDailyActivityTeamBoardData(email?: string | null) {
  await ensureDailyActivitySeedData()

  const currentEmployee = await getCurrentEmployeeByEmail(email)
  if (!currentEmployee) {
    return null
  }

  const team = await getManagedEmployeesForLead(currentEmployee)

  const teamIds = Array.from(new Set(team.map((member) => member.id)))
  const dayStart = startOfDay()
  const dayEnd = endOfDay()

  const [
    assignmentRows,
    activityRows,
    pendingApprovalsRows,
    disputeRows,
    splRows,
    splLineRows,
    splParticipantRows,
    routeTemplateRows,
    libraryRows,
  ] = await Promise.all([
    teamIds.length === 0
      ? []
      : db
          .select({
            id: jobAssignments.id,
            assignedToEmployeeId: jobAssignments.assignedToEmployeeId,
            status: jobAssignments.status,
            priority: jobAssignments.priority,
            deadline: jobAssignments.deadline,
            isMandatory: jobAssignments.isMandatory,
            activityName: activityLibraries.activityName,
            customJobName: jobAssignments.customJobName,
          })
          .from(jobAssignments)
          .leftJoin(activityLibraries, eq(jobAssignments.libraryActivityId, activityLibraries.id))
          .where(
            and(
              inArray(jobAssignments.assignedToEmployeeId, teamIds),
              gte(jobAssignments.assignedDate, dayStart),
              lte(jobAssignments.assignedDate, dayEnd)
            )
          ),
    teamIds.length === 0
      ? []
      : db
          .select({
            id: activities.id,
            employeeId: activities.employeeId,
            activityCode: activities.activityCode,
            title: activities.title,
            status: activities.status,
            priority: activities.priority,
            sourceMode: activities.sourceMode,
            unitNumber: activities.unitNumber,
            startTime: activities.startTime,
            endTime: activities.endTime,
            submissionTime: activities.submissionTime,
            pointsAwarded: activities.pointsAwarded,
            penaltyDeducted: activities.penaltyDeducted,
            photoCount: activities.photoCount,
            remarks: activities.remarks,
          })
          .from(activities)
          .where(
            and(
              inArray(activities.employeeId, teamIds),
              gte(activities.startTime, dayStart),
              lte(activities.startTime, dayEnd)
            )
          ),
    teamIds.length === 0
      ? []
      : db
          .select({
            approvalId: approvals.id,
            level: approvals.level,
            submittedAt: approvals.submittedAt,
            approverName: approvals.approverName,
            status: approvals.status,
            activityId: activities.id,
            activityTitle: activities.title,
            priority: activities.priority,
            requesterName: employees.name,
            requesterJobTitle: employees.jobTitle,
          })
          .from(approvals)
          .innerJoin(activities, eq(approvals.activityId, activities.id))
          .innerJoin(employees, eq(activities.employeeId, employees.id))
          .where(and(inArray(activities.employeeId, teamIds), eq(approvals.status, 'pending')))
          .orderBy(desc(approvals.submittedAt), desc(approvals.id)),
    teamIds.length === 0
      ? []
      : db
          .select({
            id: pointDisputes.id,
            employeeName: employees.name,
            status: pointDisputes.status,
            reason: pointDisputes.reason,
            createdAt: pointDisputes.createdAt,
            penaltyCode: penaltyEvents.penaltyCode,
          })
          .from(pointDisputes)
          .innerJoin(employees, eq(pointDisputes.employeeId, employees.id))
          .innerJoin(penaltyEvents, eq(pointDisputes.penaltyEventId, penaltyEvents.id))
          .where(inArray(pointDisputes.employeeId, teamIds))
          .orderBy(desc(pointDisputes.createdAt))
          .limit(4),
    db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
        plannedStartAt: overtimeCommandLetters.plannedStartAt,
        plannedEndAt: overtimeCommandLetters.plannedEndAt,
        status: overtimeCommandLetters.status,
        requestNotes: overtimeCommandLetters.requestNotes,
        executionNotes: overtimeCommandLetters.executionNotes,
        origin: overtimeCommandLetters.origin,
        requestKind: overtimeCommandLetters.requestKind,
        requestSubmissionId: overtimeCommandLetters.requestSubmissionId,
        pendingApproverName: approvals.approverName,
        parentSplId: overtimeCommandLetters.parentSplId,
        requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
        sectionId: overtimeCommandLetters.sectionId,
        sectionName: masterSections.name,
        positionId: overtimeCommandLetters.positionId,
        positionName: masterPositions.name,
        createdAt: overtimeCommandLetters.createdAt,
      })
      .from(overtimeCommandLetters)
      .leftJoin(masterSections, eq(overtimeCommandLetters.sectionId, masterSections.id))
      .leftJoin(masterPositions, eq(overtimeCommandLetters.positionId, masterPositions.id))
      .leftJoin(
        approvals,
        and(
          eq(approvals.submissionId, overtimeCommandLetters.requestSubmissionId),
          eq(approvals.status, 'pending')
        )
      )
      .where(eq(overtimeCommandLetters.siteId, currentEmployee.siteId))
      .orderBy(desc(overtimeCommandLetters.workDate), desc(overtimeCommandLetters.id))
      .limit(20),
    db
      .select({
        id: overtimeCommandLetterItems.id,
        overtimeCommandLetterId: overtimeCommandLetterItems.overtimeCommandLetterId,
        assignedEmployeeId: overtimeCommandLetterItems.assignedEmployeeId,
        assignedEmployeeName: employees.name,
        routeTemplateId: overtimeCommandLetterItems.routeTemplateId,
        routeTemplateName: activityRouteTemplates.routeName,
        routeItemId: overtimeCommandLetterItems.routeItemId,
        libraryActivityId: overtimeCommandLetterItems.libraryActivityId,
        libraryName: activityLibraries.activityName,
        requiresPhoto: sql<boolean>`coalesce(${activityLibraries.requiresPhoto}, false)`,
        lineLabel: overtimeCommandLetterItems.lineLabel,
        lineDescription: overtimeCommandLetterItems.lineDescription,
        targetUnit: overtimeCommandLetterItems.targetUnit,
        estimatedMinutes: overtimeCommandLetterItems.estimatedMinutes,
        plannedPoints: overtimeCommandLetterItems.plannedPoints,
        sortOrder: overtimeCommandLetterItems.sortOrder,
        isCustomLine: overtimeCommandLetterItems.isCustomLine,
      })
      .from(overtimeCommandLetterItems)
      .leftJoin(employees, eq(overtimeCommandLetterItems.assignedEmployeeId, employees.id))
      .leftJoin(
        activityRouteTemplates,
        eq(overtimeCommandLetterItems.routeTemplateId, activityRouteTemplates.id)
      )
      .leftJoin(
        activityLibraries,
        eq(overtimeCommandLetterItems.libraryActivityId, activityLibraries.id)
      )
      .orderBy(
        asc(overtimeCommandLetterItems.overtimeCommandLetterId),
        asc(overtimeCommandLetterItems.sortOrder),
        asc(overtimeCommandLetterItems.id)
      ),
    db
      .select({
        overtimeCommandLetterId: overtimeCommandLetterParticipants.overtimeCommandLetterId,
        employeeId: overtimeCommandLetterParticipants.employeeId,
        employeeName: employees.name,
        category: overtimeCommandLetterParticipants.category,
        shiftCode: overtimeCommandLetterParticipants.shiftCode,
        rosterType: overtimeCommandLetterParticipants.rosterType,
        scheduleCode: overtimeCommandLetterParticipants.scheduleCode,
        workStreakDays: overtimeCommandLetterParticipants.workStreakDays,
        overtimeCreditMinutes: overtimeCommandLetterParticipants.overtimeCreditMinutes,
        replacementOffDate: overtimeCommandLetterParticipants.replacementOffDate,
        workPeriod: overtimeCommandLetterParticipants.workPeriod,
        payrollPeriod: overtimeCommandLetterParticipants.payrollPeriod,
        evidenceStatus: overtimeCommandLetterParticipants.evidenceStatus,
      })
      .from(overtimeCommandLetterParticipants)
      .innerJoin(
        overtimeCommandLetters,
        eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, overtimeCommandLetters.id)
      )
      .innerJoin(employees, eq(overtimeCommandLetterParticipants.employeeId, employees.id))
      .where(eq(overtimeCommandLetters.siteId, currentEmployee.siteId)),
    db
      .select({
        id: activityRouteTemplates.id,
        routeCode: activityRouteTemplates.routeCode,
        routeName: activityRouteTemplates.routeName,
        sectionId: activityRouteTemplates.sectionId,
        sectionName: masterSections.name,
        positionId: activityRouteTemplates.positionId,
        positionName: masterPositions.name,
      })
      .from(activityRouteTemplates)
      .leftJoin(masterSections, eq(activityRouteTemplates.sectionId, masterSections.id))
      .leftJoin(masterPositions, eq(activityRouteTemplates.positionId, masterPositions.id))
      .where(
        and(
          eq(activityRouteTemplates.isActive, true),
          or(
            eq(activityRouteTemplates.siteId, currentEmployee.siteId),
            isNull(activityRouteTemplates.siteId)
          )
        )
      )
      .orderBy(asc(activityRouteTemplates.routeName)),
    db
      .select({
        id: activityLibraries.id,
        activityCode: activityLibraries.activityCode,
        activityName: activityLibraries.activityName,
        basePoints: activityLibraries.basePoints,
        requiresPhoto: activityLibraries.requiresPhoto,
        requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
        requiresDuration: activityLibraries.requiresDuration,
        requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
        requiresLocationGps: activityLibraries.requiresLocationGps,
        requiresTireCount: activityLibraries.requiresTireCount,
        maxDailyCount: activityLibraries.maxDailyCount,
        maxPointsPerDay: activityLibraries.maxPointsPerDay,
        departmentId: activityLibraries.departmentId,
        sectionId: activityLibraries.sectionId,
      })
      .from(activityLibraries)
      .where(
        and(
          eq(activityLibraries.isActive, true),
          eq(activityLibraries.isSelfInput, true),
          librarySiteMatches(
            activityLibraries.siteId,
            activityLibraries.siteIds,
            currentEmployee.siteId ?? null
          ),
          // ponytail: upgrade path → split dept & section to separate permission tables
          libraryDeptMatches(
            activityLibraries.departmentId,
            activityLibraries.departmentIds,
            currentEmployee.departmentId ?? null
          ),
          librarySectionMatches(
            activityLibraries.sectionId,
            activityLibraries.sectionIds,
            currentEmployee.sectionId ?? null
          )
        )
      )
      .orderBy(asc(activityLibraries.activityCode)),
  ])

  const splIds = splRows.map((row) => row.id)
  const [splSessionRows, splSessionItemRows] =
    splIds.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select({
              id: dailyActivitySessions.id,
              overtimeCommandLetterId: dailyActivitySessions.overtimeCommandLetterId,
              employeeId: dailyActivitySessions.employeeId,
              employeeName: employees.name,
              status: dailyActivitySessions.status,
              updatedAt: dailyActivitySessions.updatedAt,
              submittedAt: dailyActivitySessions.submittedAt,
              approvedAt: dailyActivitySessions.approvedAt,
            })
            .from(dailyActivitySessions)
            .innerJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
            .where(
              and(
                sql`${dailyActivitySessions.overtimeCommandLetterId} is not null`,
                inArray(dailyActivitySessions.overtimeCommandLetterId, splIds)
              )
            ),
          db
            .select({
              sessionId: dailyActivitySessionItems.sessionId,
              overtimeCommandLetterId: dailyActivitySessions.overtimeCommandLetterId,
              overtimeCommandLetterItemId: dailyActivitySessionItems.overtimeCommandLetterItemId,
              isChecked: dailyActivitySessionItems.isChecked,
              actualPoints: dailyActivitySessionItems.actualPoints,
              checkedAt: dailyActivitySessionItems.checkedAt,
              updatedAt: dailyActivitySessionItems.updatedAt,
            })
            .from(dailyActivitySessionItems)
            .innerJoin(
              dailyActivitySessions,
              eq(dailyActivitySessionItems.sessionId, dailyActivitySessions.id)
            )
            .where(
              and(
                sql`${dailyActivitySessions.overtimeCommandLetterId} is not null`,
                inArray(dailyActivitySessions.overtimeCommandLetterId, splIds)
              )
            ),
        ])

  const splLinesByHeaderId = new Map<number, typeof splLineRows>()
  for (const line of splLineRows) {
    const list = splLinesByHeaderId.get(line.overtimeCommandLetterId) ?? []
    list.push(line)
    splLinesByHeaderId.set(line.overtimeCommandLetterId, list)
  }

  const splSessionsByHeaderId = new Map<number, typeof splSessionRows>()
  for (const session of splSessionRows) {
    if (session.overtimeCommandLetterId == null) {
      continue
    }

    const list = splSessionsByHeaderId.get(session.overtimeCommandLetterId) ?? []
    list.push(session)
    splSessionsByHeaderId.set(session.overtimeCommandLetterId, list)
  }

  const splParticipantsByHeaderId = new Map<number, typeof splParticipantRows>()
  for (const participant of splParticipantRows) {
    const list = splParticipantsByHeaderId.get(participant.overtimeCommandLetterId) ?? []
    list.push(participant)
    splParticipantsByHeaderId.set(participant.overtimeCommandLetterId, list)
  }

  const splSessionItemsByHeaderId = new Map<number, typeof splSessionItemRows>()
  for (const sessionItem of splSessionItemRows) {
    if (sessionItem.overtimeCommandLetterId == null) {
      continue
    }

    const list = splSessionItemsByHeaderId.get(sessionItem.overtimeCommandLetterId) ?? []
    list.push(sessionItem)
    splSessionItemsByHeaderId.set(sessionItem.overtimeCommandLetterId, list)
  }

  const splDocuments = splRows.map((row) => {
    const items = splLinesByHeaderId.get(row.id) ?? []
    const sessions = splSessionsByHeaderId.get(row.id) ?? []
    const sessionItems = splSessionItemsByHeaderId.get(row.id) ?? []
    const participants = splParticipantsByHeaderId.get(row.id) ?? []
    const checkedLineIds = new Set(
      sessionItems
        .filter((item) => item.isChecked && item.overtimeCommandLetterItemId != null)
        .map((item) => item.overtimeCommandLetterItemId!)
    )
    const checkedSessionIds = new Set(
      sessionItems.filter((item) => item.isChecked).map((item) => item.sessionId)
    )
    const workerEntries: Array<readonly [number, string]> = [
      ...items
        .filter((item) => item.assignedEmployeeId != null && item.assignedEmployeeName)
        .map((item) => [item.assignedEmployeeId!, item.assignedEmployeeName!] as const),
      ...sessions.map((session) => [session.employeeId, session.employeeName] as const),
    ]
    const workers = Array.from(new Map<number, string>(workerEntries).entries()).map(
      ([employeeId, employeeName]) => ({
        employeeId,
        employeeName,
      })
    )
    const latestUpdateAtMs = Math.max(
      0,
      ...sessions
        .map((session) => session.approvedAt ?? session.submittedAt ?? session.updatedAt)
        .map((value) => value.getTime()),
      ...sessionItems
        .map((item) => item.checkedAt ?? item.updatedAt)
        .map((value) => value.getTime())
    )
    const progressPercent =
      items.length > 0 ? Math.round((checkedLineIds.size / items.length) * 100) : 0

    return {
      ...row,
      items: items.map((item) => ({
        ...item,
        isCheckedOnRoute: checkedLineIds.has(item.id),
      })),
      participants,
      workers,
      workerCount: workers.length,
      checkedLineCount: checkedLineIds.size,
      checkedItemCount: sessionItems.filter((item) => item.isChecked).length,
      checkedSessionCount: checkedSessionIds.size,
      actualPointsTotal: sessionItems.reduce(
        (total, item) => total + (item.isChecked ? item.actualPoints : 0),
        0
      ),
      progressPercent,
      latestUpdateAt: latestUpdateAtMs > 0 ? new Date(latestUpdateAtMs) : null,
      lineCount: items.length,
      plannedPointsTotal: items.reduce((total, item) => total + item.plannedPoints, 0),
      estimatedMinutesTotal: items.reduce((total, item) => total + item.estimatedMinutes, 0),
    }
  })

  const memberCards = team.map((member) => {
    const memberAssignments = assignmentRows.filter((row) => row.assignedToEmployeeId === member.id)
    const latestActivity =
      activityRows
        .filter((row) => row.employeeId === member.id)
        .sort((left, right) => right.startTime.getTime() - left.startTime.getTime())[0] ?? null
    const completedCount = activityRows.filter(
      (row) =>
        row.employeeId === member.id &&
        ['approved', 'pending l1', 'submitted'].includes(row.status.toLowerCase())
    ).length
    const progress =
      memberAssignments.length > 0
        ? Math.round((completedCount / memberAssignments.length) * 100)
        : latestActivity
          ? 100
          : 0

    const status = latestActivity?.status?.toLowerCase().includes('pending')
      ? 'Needs Review'
      : memberAssignments.some((row) => row.status === 'IN_PROGRESS')
        ? 'Working'
        : completedCount > 0
          ? 'On Site'
          : 'Traveling'

    return {
      id: member.id,
      name: member.name,
      role: member.jobTitle || member.role,
      currentJob:
        latestActivity?.title ??
        memberAssignments[0]?.activityName ??
        memberAssignments[0]?.customJobName ??
        'Belum ada aktivitas hari ini',
      status,
      progress,
      lastUpdate:
        latestActivity?.submissionTime?.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }) ?? 'Belum update',
      mandatoryCount: memberAssignments.filter((row) => row.isMandatory).length,
    }
  })

  const overdueAssignments = assignmentRows.filter(
    (row) =>
      row.deadline != null && row.deadline.getTime() < Date.now() && row.status !== 'APPROVED'
  ).length

  const activityGroups = team.map((member) => {
    const memberActivities = activityRows
      .filter((row) => row.employeeId === member.id)
      .sort((left, right) => right.startTime.getTime() - left.startTime.getTime())
    const dayMap = new Map<
      string,
      {
        key: string
        label: string
        activityCount: number
        pointsNet: number
        items: Array<{
          id: number
          activityCode: string
          title: string
          status: string
          statusLabel: string
          priority: string
          sourceMode: string
          unitNumber: string
          startTime: Date
          endTime: Date
          submissionTime: Date | null
          photoCount: number
          remarks: string
          pointsAwarded: number
          penaltyDeducted: number
          pointsNet: number
          durationLabel: string
        }>
      }
    >()

    for (const activity of memberActivities) {
      const dayKey = getCalendarDayKey(activity.startTime)
      const existingDay = dayMap.get(dayKey) ?? {
        key: dayKey,
        label: activity.startTime.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        activityCount: 0,
        pointsNet: 0,
        items: [],
      }
      const pointsNet = activity.pointsAwarded - activity.penaltyDeducted

      existingDay.activityCount += 1
      existingDay.pointsNet += pointsNet
      existingDay.items.push({
        id: activity.id,
        activityCode: activity.activityCode,
        title: activity.title,
        status: activity.status,
        statusLabel: normalizeStatusLabel(activity.status),
        priority: activity.priority,
        sourceMode: activity.sourceMode,
        unitNumber: activity.unitNumber,
        startTime: activity.startTime,
        endTime: activity.endTime,
        submissionTime: activity.submissionTime,
        photoCount: activity.photoCount,
        remarks: activity.remarks,
        pointsAwarded: activity.pointsAwarded,
        penaltyDeducted: activity.penaltyDeducted,
        pointsNet,
        durationLabel: formatDurationLabel(minutesBetween(activity.startTime, activity.endTime)),
      })
      dayMap.set(dayKey, existingDay)
    }

    return {
      employeeId: member.id,
      employeeName: member.name,
      employeeRole: member.jobTitle || member.role,
      totalActivities: memberActivities.length,
      totalPointsNet: memberActivities.reduce(
        (total, activity) => total + activity.pointsAwarded - activity.penaltyDeducted,
        0
      ),
      days: Array.from(dayMap.values()).sort((left, right) => right.key.localeCompare(left.key)),
    }
  })

  return {
    lead: currentEmployee,
    hasSubordinates: team.length > 0,
    summary: {
      activeWorkers: team.length,
      checkedIn:
        activityRows.length > 0 ? new Set(activityRows.map((row) => row.employeeId)).size : 0,
      pendingApproval: pendingApprovalsRows.length,
      emergencyJobs: assignmentRows.filter((row) => row.priority.toLowerCase() === 'emergency')
        .length,
      overtimeCandidates: activityRows.filter(
        (row) => minutesBetween(row.startTime, row.endTime) >= 8 * 60
      ).length,
      overdueAssignments,
      splOpen: splDocuments.filter(
        (row) => !['closed', 'cancelled'].includes(row.status.toLowerCase())
      ).length,
    },
    members: memberCards,
    splDocuments,
    splOptions: {
      routeTemplates: routeTemplateRows,
      libraryActivities: libraryRows,
    },
    pendingApprovals: pendingApprovalsRows.map((row) => ({
      ...row,
      risk:
        row.priority.toLowerCase() === 'emergency'
          ? 'Emergency'
          : row.level >= 2
            ? 'Escalation'
            : 'Routine',
    })),
    disputes: disputeRows,
    activityGroups,
    assignmentOptions: libraryRows,
    team,
  }
}

export async function getDailyActivityLibraryData(email?: string | null) {
  await ensureDailyActivitySeedData()

  const currentEmployee = await getCurrentEmployeeByEmail(email)
  const [rows, departmentsRows, sectionsRows, siteRows, creators] = await Promise.all([
    db
      .select({
        id: activityLibraries.id,
        activityCode: activityLibraries.activityCode,
        activityName: activityLibraries.activityName,
        category: activityLibraries.category,
        siteId: activityLibraries.siteId,
        siteIds: activityLibraries.siteIds,
        siteName: sites.name,
        departmentId: activityLibraries.departmentId,
        departmentIds: activityLibraries.departmentIds,
        sectionId: activityLibraries.sectionId,
        sectionIds: activityLibraries.sectionIds,
        departmentName: masterDepartments.name,
        sectionName: masterSections.name,
        basePoints: activityLibraries.basePoints,
        complexityLevel: activityLibraries.complexityLevel,
        requiresPhoto: activityLibraries.requiresPhoto,
        requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
        requiresDuration: activityLibraries.requiresDuration,
        requiresLocationGps: activityLibraries.requiresLocationGps,
        requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
        requiresTireCount: activityLibraries.requiresTireCount,
        maxDailyCount: activityLibraries.maxDailyCount,
        maxPointsPerDay: activityLibraries.maxPointsPerDay,
        isAssignable: activityLibraries.isAssignable,
        isSelfInput: activityLibraries.isSelfInput,
        approvalRequired: activityLibraries.approvalRequired,
        autoApproveIfGpsValid: activityLibraries.autoApproveIfGpsValid,
        slaHours: activityLibraries.slaHours,
        isActive: activityLibraries.isActive,
        createdAt: activityLibraries.createdAt,
        creatorName: employees.name,
      })
      .from(activityLibraries)
      .leftJoin(sites, eq(activityLibraries.siteId, sites.id))
      .leftJoin(masterDepartments, eq(activityLibraries.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(activityLibraries.sectionId, masterSections.id))
      .leftJoin(employees, eq(activityLibraries.createdByEmployeeId, employees.id))
      .orderBy(
        desc(activityLibraries.isActive),
        asc(activityLibraries.category),
        asc(activityLibraries.activityName)
      ),
    db.select().from(masterDepartments).orderBy(asc(masterDepartments.name)),
    db.select().from(masterSections).orderBy(asc(masterSections.name)),
    db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.name)),
    db
      .select({
        id: employees.id,
        name: employees.name,
        department: employees.department,
        role: employees.role,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
  ])

  const categoryCount = rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.category] = (accumulator[row.category] ?? 0) + 1
    return accumulator
  }, {})

  const routeFolders = await getActiveRouteFolders()
  const routeGroupMappings = await getLibraryRouteGroupMappings()
  const groupChildrenByCode = await getActivityLibraryGroupChildrenByCode()
  const siteNameById = new Map(siteRows.map((site) => [site.id, site.name]))
  const deptNameById = new Map(departmentsRows.map((dept) => [dept.id, dept.name]))
  const secNameById = new Map(sectionsRows.map((sec) => [sec.id, sec.name]))
  const libraryRows = rows.map((row) => {
    const rowSiteIds = row.siteIds ?? []
    const rowDeptIds = row.departmentIds ?? (row.departmentId ? [row.departmentId] : [])
    const rowSecIds = row.sectionIds ?? (row.sectionId ? [row.sectionId] : [])
    return {
      ...row,
      siteIds: rowSiteIds,
      siteNames:
        rowSiteIds.length > 0
          ? rowSiteIds
              .map((id) => siteNameById.get(id))
              .filter((name): name is string => Boolean(name))
              .join(', ') || null
          : null,
      departmentIds: rowDeptIds,
      departmentNames:
        rowDeptIds.length > 0
          ? rowDeptIds
              .map((id) => deptNameById.get(id))
              .filter((name): name is string => Boolean(name))
              .join(', ') || null
          : row.departmentName,
      sectionIds: rowSecIds,
      sectionNames:
        rowSecIds.length > 0
          ? rowSecIds
              .map((id) => secNameById.get(id))
              .filter((name): name is string => Boolean(name))
              .join(', ') || null
          : row.sectionName,
      children: groupChildrenByCode.get(row.activityCode) ?? [],
    }
  })

  return {
    currentEmployee,
    metrics: {
      total: rows.length,
      active: rows.filter((row) => row.isActive).length,
      selfInput: rows.filter((row) => row.isSelfInput).length,
      autoApproveReady: rows.filter((row) => row.autoApproveIfGpsValid).length,
    },
    categories: Object.entries(categoryCount)
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count),
    rows: libraryRows,
    departments: departmentsRows,
    sections: sectionsRows,
    sites: siteRows,
    creators,
    routeFolders,
    routeGroupMappings,
  }
}

export async function getDailyActivityRouteBuilderData(email?: string | null) {
  await ensureDailyActivitySeedData()

  const currentEmployee = await getCurrentEmployeeByEmail(email)
  const [
    templateRows,
    groupRows,
    itemRows,
    overrideRows,
    departmentsRows,
    sectionsRows,
    positionsRows,
    siteRows,
    libraryRows,
  ] = await Promise.all([
    db
      .select({
        id: activityRouteTemplates.id,
        routeCode: activityRouteTemplates.routeCode,
        routeName: activityRouteTemplates.routeName,
        shiftCode: activityRouteTemplates.shiftCode,
        description: activityRouteTemplates.description,
        versionLabel: activityRouteTemplates.versionLabel,
        mobileEnabled: activityRouteTemplates.mobileEnabled,
        approvalRequired: activityRouteTemplates.approvalRequired,
        isActive: activityRouteTemplates.isActive,
        siteId: activityRouteTemplates.siteId,
        siteName: sites.name,
        departmentId: activityRouteTemplates.departmentId,
        departmentName: masterDepartments.name,
        sectionId: activityRouteTemplates.sectionId,
        sectionName: masterSections.name,
        positionId: activityRouteTemplates.positionId,
        positionName: masterPositions.name,
        effectiveFrom: activityRouteTemplates.effectiveFrom,
        effectiveTo: activityRouteTemplates.effectiveTo,
        createdAt: activityRouteTemplates.createdAt,
      })
      .from(activityRouteTemplates)
      .leftJoin(sites, eq(activityRouteTemplates.siteId, sites.id))
      .leftJoin(masterDepartments, eq(activityRouteTemplates.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(activityRouteTemplates.sectionId, masterSections.id))
      .leftJoin(masterPositions, eq(activityRouteTemplates.positionId, masterPositions.id))
      .orderBy(desc(activityRouteTemplates.isActive), asc(activityRouteTemplates.routeName)),
    db
      .select({
        id: activityRouteGroups.id,
        routeTemplateId: activityRouteGroups.routeTemplateId,
        groupKey: activityRouteGroups.groupKey,
        groupName: activityRouteGroups.groupName,
        description: activityRouteGroups.description,
        sortOrder: activityRouteGroups.sortOrder,
        isRequired: activityRouteGroups.isRequired,
      })
      .from(activityRouteGroups)
      .orderBy(
        asc(activityRouteGroups.routeTemplateId),
        asc(activityRouteGroups.sortOrder),
        asc(activityRouteGroups.id)
      ),
    db
      .select({
        id: activityRouteItems.id,
        routeGroupId: activityRouteItems.routeGroupId,
        libraryActivityId: activityRouteItems.libraryActivityId,
        itemCode: activityRouteItems.itemCode,
        itemLabel: activityRouteItems.itemLabel,
        itemDescription: activityRouteItems.itemDescription,
        pointOverride: activityRouteItems.pointOverride,
        sortOrder: activityRouteItems.sortOrder,
        requiresUnit: sql<boolean>`coalesce(${activityRouteItems.requiresUnit}, ${activityLibraries.requiresEquipmentNo}, false)`,
        requiresTime: sql<boolean>`coalesce(${activityRouteItems.requiresTime}, ${activityLibraries.requiresDuration}, false)`,
        requiresRemark: activityRouteItems.requiresRemark,
        requiresPhoto: sql<boolean>`coalesce(${activityRouteItems.requiresPhoto}, ${activityLibraries.requiresPhoto}, false)`,
        requiresLocationGps: sql<boolean>`coalesce(${activityLibraries.requiresLocationGps}, false)`,
        requiresMaterialUsed: sql<boolean>`coalesce(${activityLibraries.requiresMaterialUsed}, false)`,
        requiresTireCount: sql<boolean>`coalesce(${activityLibraries.requiresTireCount}, false)`,
        requiresChecklistEvidence: activityRouteItems.requiresChecklistEvidence,
        isOptional: activityRouteItems.isOptional,
        allowCustomUnit: activityRouteItems.allowCustomUnit,
        libraryCode: activityLibraries.activityCode,
        libraryName: activityLibraries.activityName,
        libraryPoints: activityLibraries.basePoints,
      })
      .from(activityRouteItems)
      .leftJoin(activityLibraries, eq(activityRouteItems.libraryActivityId, activityLibraries.id))
      .orderBy(
        asc(activityRouteItems.routeGroupId),
        asc(activityRouteItems.sortOrder),
        asc(activityRouteItems.id)
      ),
    db
      .select({
        id: activitySectionPointOverrides.id,
        siteId: activitySectionPointOverrides.siteId,
        siteName: sites.name,
        departmentId: activitySectionPointOverrides.departmentId,
        departmentName: masterDepartments.name,
        sectionId: activitySectionPointOverrides.sectionId,
        sectionName: masterSections.name,
        positionId: activitySectionPointOverrides.positionId,
        positionName: masterPositions.name,
        libraryActivityId: activitySectionPointOverrides.libraryActivityId,
        libraryCode: activityLibraries.activityCode,
        libraryName: activityLibraries.activityName,
        overrideLabel: activitySectionPointOverrides.overrideLabel,
        overridePoints: activitySectionPointOverrides.overridePoints,
        reason: activitySectionPointOverrides.reason,
        isActive: activitySectionPointOverrides.isActive,
      })
      .from(activitySectionPointOverrides)
      .leftJoin(sites, eq(activitySectionPointOverrides.siteId, sites.id))
      .leftJoin(
        masterDepartments,
        eq(activitySectionPointOverrides.departmentId, masterDepartments.id)
      )
      .leftJoin(masterSections, eq(activitySectionPointOverrides.sectionId, masterSections.id))
      .leftJoin(masterPositions, eq(activitySectionPointOverrides.positionId, masterPositions.id))
      .leftJoin(
        activityLibraries,
        eq(activitySectionPointOverrides.libraryActivityId, activityLibraries.id)
      )
      .orderBy(desc(activitySectionPointOverrides.isActive), asc(activityLibraries.activityName)),
    db.select().from(masterDepartments).orderBy(asc(masterDepartments.name)),
    db.select().from(masterSections).orderBy(asc(masterSections.name)),
    db.select().from(masterPositions).orderBy(asc(masterPositions.name)),
    db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.name)),
    db
      .select({
        id: activityLibraries.id,
        activityCode: activityLibraries.activityCode,
        activityName: activityLibraries.activityName,
        category: activityLibraries.category,
        basePoints: activityLibraries.basePoints,
        sectionId: activityLibraries.sectionId,
        departmentId: activityLibraries.departmentId,
        isActive: activityLibraries.isActive,
      })
      .from(activityLibraries)
      .where(eq(activityLibraries.isActive, true))
      .orderBy(asc(activityLibraries.activityCode)),
  ])

  const itemsByGroupId = new Map<number, typeof itemRows>()
  for (const item of itemRows) {
    const list = itemsByGroupId.get(item.routeGroupId) ?? []
    list.push(item)
    itemsByGroupId.set(item.routeGroupId, list)
  }

  const groupsByTemplateId = new Map<
    number,
    Array<
      (typeof groupRows)[number] & {
        items: typeof itemRows
      }
    >
  >()
  for (const group of groupRows) {
    const list = groupsByTemplateId.get(group.routeTemplateId) ?? []
    list.push({
      ...group,
      items: itemsByGroupId.get(group.id) ?? [],
    })
    groupsByTemplateId.set(group.routeTemplateId, list)
  }

  const templates = templateRows.map((template) => ({
    ...template,
    groups: groupsByTemplateId.get(template.id) ?? [],
  }))

  return {
    currentEmployee,
    metrics: {
      templates: templates.length,
      activeTemplates: templates.filter((template) => template.isActive).length,
      groups: groupRows.length,
      items: itemRows.length,
      overrides: overrideRows.length,
    },
    templates,
    overrides: overrideRows,
    departments: departmentsRows,
    sections: sectionsRows,
    positions: positionsRows,
    sites: siteRows,
    library: libraryRows,
  }
}

export async function getDailyActivityConfigurationData(email?: string | null) {
  await ensureDailyActivitySeedData()

  const currentEmployee = await getCurrentEmployeeByEmail(email)
  const [configRows, modifierRows, penaltyRows, disputeRows, siteRows, employeeRows] =
    await Promise.all([
      db
        .select({
          id: dailyActivityConfigs.id,
          siteId: dailyActivityConfigs.siteId,
          configKey: dailyActivityConfigs.configKey,
          configLabel: dailyActivityConfigs.configLabel,
          configValue: dailyActivityConfigs.configValue,
          valueType: dailyActivityConfigs.valueType,
          description: dailyActivityConfigs.description,
          isEditableBySectionHead: dailyActivityConfigs.isEditableBySectionHead,
          isActive: dailyActivityConfigs.isActive,
          updatedAt: dailyActivityConfigs.updatedAt,
          siteName: sites.name,
          updatedByName: employees.name,
        })
        .from(dailyActivityConfigs)
        .leftJoin(sites, eq(dailyActivityConfigs.siteId, sites.id))
        .leftJoin(employees, eq(dailyActivityConfigs.updatedByEmployeeId, employees.id))
        .orderBy(asc(dailyActivityConfigs.configKey)),
      db
        .select({
          id: activityModifiers.id,
          siteId: activityModifiers.siteId,
          eventName: activityModifiers.eventName,
          description: activityModifiers.description,
          multiplier: activityModifiers.multiplier,
          startDate: activityModifiers.startDate,
          endDate: activityModifiers.endDate,
          isActive: activityModifiers.isActive,
          siteName: sites.name,
          creatorName: employees.name,
        })
        .from(activityModifiers)
        .leftJoin(sites, eq(activityModifiers.siteId, sites.id))
        .leftJoin(employees, eq(activityModifiers.createdByEmployeeId, employees.id))
        .orderBy(desc(activityModifiers.isActive), asc(activityModifiers.eventName)),
      db
        .select({
          id: penaltyEvents.id,
          penaltyCode: penaltyEvents.penaltyCode,
          penaltyType: penaltyEvents.penaltyType,
          pointsDeducted: penaltyEvents.pointsDeducted,
          description: penaltyEvents.description,
          disputeStatus: penaltyEvents.disputeStatus,
          employeeName: employees.name,
          createdAt: penaltyEvents.createdAt,
        })
        .from(penaltyEvents)
        .innerJoin(employees, eq(penaltyEvents.employeeId, employees.id))
        .orderBy(desc(penaltyEvents.createdAt))
        .limit(10),
      db
        .select({
          id: pointDisputes.id,
          employeeName: employees.name,
          status: pointDisputes.status,
          reason: pointDisputes.reason,
          resolutionNotes: pointDisputes.resolutionNotes,
          createdAt: pointDisputes.createdAt,
          resolvedAt: pointDisputes.resolvedAt,
          penaltyCode: penaltyEvents.penaltyCode,
        })
        .from(pointDisputes)
        .innerJoin(employees, eq(pointDisputes.employeeId, employees.id))
        .innerJoin(penaltyEvents, eq(pointDisputes.penaltyEventId, penaltyEvents.id))
        .orderBy(desc(pointDisputes.createdAt))
        .limit(10),
      db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.name)),
      db
        .select({
          id: employees.id,
          name: employees.name,
          role: employees.role,
        })
        .from(employees)
        .where(eq(employees.isActive, true))
        .orderBy(asc(employees.name)),
    ])

  return {
    currentEmployee,
    metrics: {
      settings: configRows.length,
      activeModifiers: modifierRows.filter((row) => row.isActive).length,
      penaltyEvents: penaltyRows.length,
      pendingDisputes: disputeRows.filter((row) => row.status === 'pending').length,
    },
    settings: configRows,
    modifiers: modifierRows,
    penaltyEvents: penaltyRows,
    disputes: disputeRows,
    sites: siteRows,
    employees: employeeRows,
  }
}

export { DAILY_ACTIVITY_REVALIDATE_PATHS }

export type AdminRouteFolderItem = {
  id: number
  itemLabel: string
}

export type AdminRouteFolderGroup = {
  id: number
  groupName: string
  items: AdminRouteFolderItem[]
}

export type AdminRouteFolder = {
  id: number
  routeName: string
  groups: AdminRouteFolderGroup[]
}

export async function getActiveRouteFolders(): Promise<AdminRouteFolder[]> {
  const [templates, groups, items] = await Promise.all([
    db
      .select({ id: activityRouteTemplates.id, routeName: activityRouteTemplates.routeName })
      .from(activityRouteTemplates)
      .where(eq(activityRouteTemplates.isActive, true))
      .orderBy(asc(activityRouteTemplates.routeName)),
    db
      .select({ id: activityRouteGroups.id, routeTemplateId: activityRouteGroups.routeTemplateId, groupName: activityRouteGroups.groupName })
      .from(activityRouteGroups)
      .orderBy(asc(activityRouteGroups.sortOrder)),
    db
      .select({ id: activityRouteItems.id, routeGroupId: activityRouteItems.routeGroupId, itemLabel: activityRouteItems.itemLabel })
      .from(activityRouteItems)
      .orderBy(asc(activityRouteItems.sortOrder)),
  ])

  return templates.map(template => {
    const templateGroups = groups.filter(g => g.routeTemplateId === template.id)
    return {
      id: template.id,
      routeName: template.routeName,
      groups: templateGroups.map(group => {
        const groupItems = items.filter(i => i.routeGroupId === group.id)
        return {
          id: group.id,
          groupName: group.groupName,
          items: groupItems.map(item => ({
            id: item.id,
            itemLabel: item.itemLabel,
          }))
        }
      })
    }
  })
}

export type ActivityLibraryGroupChild = {
  id: number
  activityCode: string
  activityName: string
}

async function getActivityLibraryGroupChildrenByCode(): Promise<Map<string, ActivityLibraryGroupChild[]>> {
  const childRows = await db
    .select({
      parentCode: activityRouteTemplates.routeCode,
      childId: activityLibraries.id,
      childCode: activityLibraries.activityCode,
      childName: activityLibraries.activityName,
    })
    .from(activityRouteTemplates)
    .innerJoin(activityRouteGroups, eq(activityRouteGroups.routeTemplateId, activityRouteTemplates.id))
    .innerJoin(activityRouteItems, eq(activityRouteItems.routeGroupId, activityRouteGroups.id))
    .innerJoin(activityLibraries, eq(activityRouteItems.libraryActivityId, activityLibraries.id))
    .where(like(activityRouteTemplates.routeCode, 'GRP-%'))
    .orderBy(asc(activityRouteItems.routeGroupId), asc(activityRouteItems.sortOrder), asc(activityRouteItems.id))

  const byCode = new Map<string, ActivityLibraryGroupChild[]>()
  for (const rowItem of childRows) {
    const parentCode = rowItem.parentCode.replace(/^GRP-/, '')
    const list = byCode.get(parentCode) ?? []
    if (list.some((child) => child.id === rowItem.childId)) continue
    list.push({
      id: rowItem.childId,
      activityCode: rowItem.childCode,
      activityName: rowItem.childName,
    })
    byCode.set(parentCode, list)
  }
  return byCode
}

export async function getLibraryRouteGroupMappings(): Promise<Record<number, number[]>> {
  const items = await db
    .select({ routeGroupId: activityRouteItems.routeGroupId, libraryActivityId: activityRouteItems.libraryActivityId })
    .from(activityRouteItems)
    .where(isNotNull(activityRouteItems.libraryActivityId))

  const mappings: Record<number, number[]> = {}
  for (const item of items) {
    if (item.libraryActivityId) {
      if (!mappings[item.libraryActivityId]) {
        mappings[item.libraryActivityId] = []
      }
      mappings[item.libraryActivityId].push(item.routeGroupId)
    }
  }
  return mappings
}

