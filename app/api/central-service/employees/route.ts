import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { centralServiceEmployees } from '@/db/schema/central-service'
import { employees as heroEmployees, sites as heroSites } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { isNonLocalEmployee } from '@/lib/timesheet/employee-benefit-policy'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'

async function requireCentralServiceAccess() {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const [employee] = await db
    .select({ accessRole: heroEmployees.accessRole })
    .from(heroEmployees)
    .where(eq(heroEmployees.email, session.user.email.trim().toLowerCase()))
    .limit(1)

  const allowedRoles = new Set(['Super Admin', 'Admin', 'HC Admin', 'HR Admin', 'Site Admin'])
  if (!employee?.accessRole || !allowedRoles.has(employee.accessRole)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { session }
}

/**
 * GET /api/central-service/employees
 * List all Central Service employees with filters.
 * Section is enriched from hero_employees (User Management) matched by email.
 */
export async function GET(request: NextRequest) {
  try {
    const access = await requireCentralServiceAccess()
    if (access.error) return access.error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const syncStatus = searchParams.get('syncStatus') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const conditions = []

    // Filter active employees only
    conditions.push(eq(centralServiceEmployees.isActive, true))

    // Always filter by Central Service department (with variations)
    conditions.push(
      or(
        eq(centralServiceEmployees.department, 'Central Services'),
        eq(centralServiceEmployees.department, 'CENTRAL SERVICES'),
        eq(centralServiceEmployees.department, 'Central Service')
      )
    )

    if (search) {
      conditions.push(
        or(
          ilike(centralServiceEmployees.fullName, `%${search}%`),
          ilike(centralServiceEmployees.employeeSn, `%${search}%`),
          ilike(centralServiceEmployees.email, `%${search}%`)
        )
      )
    }

    if (status) {
      conditions.push(eq(centralServiceEmployees.employmentStatus, status))
    }

    if (syncStatus === 'synced') {
      conditions.push(eq(centralServiceEmployees.isSyncedToUserManagement, true))
    } else if (syncStatus === 'unsynced') {
      conditions.push(eq(centralServiceEmployees.isSyncedToUserManagement, false))
    }

    const whereClause = and(...conditions)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(centralServiceEmployees)
      .where(whereClause)

    const [syncedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(centralServiceEmployees)
      .where(and(whereClause, eq(centralServiceEmployees.isSyncedToUserManagement, true)))

    const total = countResult?.count ?? 0
    const syncedCount = syncedResult?.count ?? 0
    const unsyncedCount = total - syncedCount

    // Apply pagination
    const offset = (page - 1) * limit

    // Enrich fields from User Management (hero_employees) matched by employeeSn.
    // Use LEFT JOIN instead of separate query for performance
    const enrichAlias = (sn: string) => {
      const plain = sn.replace(/^EMP-/i, '')
      return or(
        eq(heroEmployees.employeeSn, sn),
        eq(heroEmployees.employeeSn, `EMP-${sn}`),
        eq(heroEmployees.employeeSn, plain)
      )
    }

    const raw = await db
      .select({
        id: centralServiceEmployees.id,
        employeeSn: centralServiceEmployees.employeeSn,
        fullName: centralServiceEmployees.fullName,
        nickname: centralServiceEmployees.nickname,
        email: centralServiceEmployees.email,
        phoneNumber: centralServiceEmployees.phoneNumber,
        siteId: centralServiceEmployees.siteId,
        siteName: centralServiceEmployees.siteName,
        department: centralServiceEmployees.department,
        section: centralServiceEmployees.section,
        position: centralServiceEmployees.position,
        employmentStatus: centralServiceEmployees.employmentStatus,
        employmentType: centralServiceEmployees.employmentType,
        idCardNumber: centralServiceEmployees.idCardNumber,
        birthDate: centralServiceEmployees.birthDate,
        birthPlace: centralServiceEmployees.birthPlace,
        address: centralServiceEmployees.address,
        joinDate: centralServiceEmployees.joinDate,
        resignDate: centralServiceEmployees.resignDate,
        authUserId: centralServiceEmployees.authUserId,
        isSyncedToUserManagement: centralServiceEmployees.isSyncedToUserManagement,
        syncedAt: centralServiceEmployees.syncedAt,
        importBatchId: centralServiceEmployees.importBatchId,
        importedAt: centralServiceEmployees.importedAt,
        notes: centralServiceEmployees.notes,
        isActive: centralServiceEmployees.isActive,
        createdAt: centralServiceEmployees.createdAt,
        updatedAt: centralServiceEmployees.updatedAt,
        // Enriched fields from hero_employees
        enrichEmail: heroEmployees.email,
        enrichSection: heroEmployees.section,
        enrichGender: heroEmployees.gender,
        enrichReligion: heroEmployees.religion,
        enrichEducation: heroEmployees.education,
        enrichLevelName: heroEmployees.levelName,
        enrichPointOfHire: heroEmployees.pointOfHire,
        enrichWorkLocation: heroEmployees.workLocation,
        enrichSiteLocation: heroSites.location,
        enrichManpower: heroEmployees.manpower,
        enrichMaritalStatus: heroEmployees.maritalStatus,
        enrichJoinDate: heroEmployees.joinDate,
        enrichContractDurationStart: heroEmployees.contractDurationStart,
        enrichContractDurationEnd: heroEmployees.contractDurationEnd,
        enrichPermanentDate: heroEmployees.permanentDate,
        enrichBirthDate: heroEmployees.birthDate,
      })
      .from(centralServiceEmployees)
      .leftJoin(
        heroEmployees,
        or(
          eq(heroEmployees.employeeSn, centralServiceEmployees.employeeSn),
          eq(heroEmployees.employeeSn, sql`concat('EMP-', ${centralServiceEmployees.employeeSn})`),
          eq(
            centralServiceEmployees.employeeSn,
            sql`regexp_replace(${heroEmployees.employeeSn}, '^EMP-', '')`
          )
        )
      )
      .leftJoin(heroSites, eq(heroSites.id, heroEmployees.siteId))
      .where(whereClause)
      .orderBy(desc(centralServiceEmployees.createdAt))
      .limit(limit)
      .offset(offset)

    // Deduplicate by id since LEFT JOIN may produce duplicates
    const seen = new Set<number>()
    const deduped = raw.filter((row) => {
      if (seen.has(row.id)) return false
      seen.add(row.id)
      return true
    })

    const result = deduped.map((row) => {
      const pointOfHire = row.enrichPointOfHire ?? ''
      const workLocation = row.enrichWorkLocation || row.siteName || ''
      const manpower = isNonLocalEmployee({
        manpower: row.enrichManpower,
        pointOfHire,
        workLocations: [workLocation, row.enrichSiteLocation],
      })
        ? 'Non Lokal'
        : 'Lokal'

      return {
        ...row,
        email: row.email || row.enrichEmail || null,
        section: row.enrichSection || row.section || '',
        gender: row.enrichGender ?? '',
        religion: row.enrichReligion ?? '',
        education: row.enrichEducation ?? '',
        levelName: row.enrichLevelName ?? '',
        pointOfHire,
        manpower,
        maritalStatus: row.enrichMaritalStatus ?? '',
        joinDate: row.enrichJoinDate ?? null,
        contractDurationStart: row.enrichContractDurationStart ?? null,
        contractDurationEnd: row.enrichContractDurationEnd ?? null,
        permanentDate: row.enrichPermanentDate ?? null,
        birthDate: row.enrichBirthDate ?? null,
        enrichEmail: undefined,
        enrichSection: undefined,
        enrichGender: undefined,
        enrichReligion: undefined,
        enrichEducation: undefined,
        enrichLevelName: undefined,
        enrichPointOfHire: undefined,
        enrichWorkLocation: undefined,
        enrichSiteLocation: undefined,
        enrichManpower: undefined,
        enrichMaritalStatus: undefined,
        enrichJoinDate: undefined,
        enrichContractDurationStart: undefined,
        enrichContractDurationEnd: undefined,
        enrichPermanentDate: undefined,
        enrichBirthDate: undefined,
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        synced: syncedCount,
        unsynced: unsyncedCount,
      },
    })
  } catch (error) {
    console.error('List employees error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list employees' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/central-service/employees
 * Create new employee
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requireCentralServiceAccess()
    if (access.error) return access.error

    const body = await request.json()

    const [employee] = await db
      .insert(centralServiceEmployees)
      .values({
        employeeSn: body.employeeSn,
        fullName: body.fullName,
        nickname: body.nickname,
        email: body.email,
        phoneNumber: body.phoneNumber,
        siteId: body.siteId,
        siteName: body.siteName,
        department: body.department,
        section: body.section,
        position: body.position,
        employmentStatus: body.employmentStatus || 'active',
        employmentType: body.employmentType || 'permanent',
        idCardNumber: body.idCardNumber,
        birthDate: body.birthDate,
        birthPlace: body.birthPlace,
        address: body.address,
        joinDate: body.joinDate,
        notes: body.notes || '',
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: employee,
    })
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create employee' },
      { status: 500 }
    )
  }
}
