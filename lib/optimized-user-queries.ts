import { db } from "@/db";
import { employees, hrDepartments, hrSections, hrPositions, hrSites } from "@/db/schema/hero";
import { eq, and, or, like, sql, desc, asc } from "drizzle-orm";
import { getOffset, calculatePagination, type PaginatedResult } from "@/lib/pagination";
import type { SecurityUserRecord } from "@/lib/hero-admin";

export type UserQueryFilters = {
  search?: string;
  departments?: string[];
  sections?: string[];
  positions?: string[];
  sites?: number[];
  roles?: string[];
  statuses?: string[];
  isActive?: boolean;
};

export async function getSecurityUsersDataPaginated(params: {
  page?: number;
  pageSize?: number;
  filters?: UserQueryFilters;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<PaginatedResult<SecurityUserRecord>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const offset = getOffset(page, pageSize);

  // Build WHERE conditions
  const conditions = [];

  if (params.filters?.search) {
    const searchTerm = `%${params.filters.search}%`;
    conditions.push(
      or(
        like(employees.name, searchTerm),
        like(employees.email, searchTerm),
        like(employees.employeeSn, searchTerm),
      ),
    );
  }

  if (params.filters?.departments && params.filters.departments.length > 0) {
    conditions.push(
      or(
        ...params.filters.departments.map((dept) => eq(employees.department, dept)),
      ),
    );
  }

  if (params.filters?.sections && params.filters.sections.length > 0) {
    conditions.push(
      or(
        ...params.filters.sections.map((section) => eq(employees.section, section)),
      ),
    );
  }

  if (params.filters?.positions && params.filters.positions.length > 0) {
    conditions.push(
      or(
        ...params.filters.positions.map((pos) => eq(employees.jobTitle, pos)),
      ),
    );
  }

  if (params.filters?.roles && params.filters.roles.length > 0) {
    conditions.push(
      or(
        ...params.filters.roles.map((role) => eq(employees.accessRole, role)),
      ),
    );
  }

  if (params.filters?.statuses && params.filters.statuses.length > 0) {
    conditions.push(
      or(
        ...params.filters.statuses.map((status) => eq(employees.employmentStatus, status)),
      ),
    );
  }

  if (params.filters?.isActive !== undefined) {
    conditions.push(eq(employees.isActive, params.filters.isActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const sortColumns = {
    name: employees.name,
    email: employees.email,
    employeeSn: employees.employeeSn,
    department: employees.department,
    section: employees.section,
    jobTitle: employees.jobTitle,
    workLocation: employees.workLocation,
    accessRole: employees.accessRole,
    employmentStatus: employees.employmentStatus,
  } as const;
  const sortColumn = sortColumns[params.sortBy as keyof typeof sortColumns] ?? employees.name;

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employees)
    .where(whereClause);

  const totalRows = countResult?.count ?? 0;

  // Get paginated data with optimized JOIN
  const data = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      employeeSn: employees.employeeSn,
      joinYear: employees.joinYear,
      name: employees.name,
      profileImage: sql<string | null>`COALESCE(auth_user.image, NULL)`,
      birthPlaceDate: employees.birthPlaceDate,
      domicile: employees.domicile,
      directManagerId: employees.directManagerId,
      directManagerName: sql<string | null>`manager.name`,
      section: employees.section,
      department: employees.department,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      phoneNumber: employees.phoneNumber,
      email: employees.email,
      status: employees.employmentStatus,
      role: employees.role,
      accessRole: employees.accessRole,
      employeeStatusType: employees.employeeStatusType,
      levelName: employees.levelName,
      fitStatus: employees.fitStatus,
      isActive: employees.isActive,
      siteName: sql<string>`COALESCE(hero_hr_sites.name, '')`,
      totalPoints: employees.totalPoints,
    })
    .from(employees)
    .leftJoin(
      sql`auth_user`,
      sql`auth_user.id = ${employees.authUserId}`,
    )
    .leftJoin(
      sql`hero_employees as manager`,
      sql`manager.id = ${employees.directManagerId}`,
    )
    .leftJoin(
      hrSites,
      eq(hrSites.id, employees.siteId),
    )
    .where(whereClause)
    .orderBy(params.sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn))
    .limit(pageSize)
    .offset(offset);

  return {
    data: data as SecurityUserRecord[],
    pagination: calculatePagination({ page, pageSize, totalRows }),
  };
}

export async function getUserActivityStats(employeeId: number) {
  const [stats] = await db
    .select({
      lastLogin: sql<Date | null>`MAX(hero_user_activity_log.created_at)`,
      loginCount: sql<number>`COUNT(CASE WHEN hero_user_activity_log.activity_type = 'login' THEN 1 END)::int`,
      lastActivity: sql<Date | null>`MAX(hero_user_activity_log.created_at)`,
    })
    .from(sql`hero_user_activity_log`)
    .where(sql`hero_user_activity_log.employee_id = ${employeeId}`);

  return stats;
}

