import { db } from "@/db";
import { account, user } from "@/db/schema/auth";
import {
  employeeSiteAssignments,
  employees,
  hrEmployees,
  masterDepartments,
  masterPositions,
  masterSections,
  securityRoles,
  sites,
} from "@/db/schema/hero";
import { and, eq, isNotNull, sql } from "drizzle-orm";

export type MasterDataSyncIssue = {
  code: string;
  severity: "info" | "warning" | "critical";
  entity: string;
  entityId: string;
  label: string;
  detail: string;
};

export type MasterDataSyncAudit = {
  generatedAt: string;
  counts: Record<string, number>;
  issues: MasterDataSyncIssue[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function addIssue(
  issues: MasterDataSyncIssue[],
  issue: MasterDataSyncIssue,
) {
  issues.push(issue);
}

async function getSiteAssignmentRows() {
  try {
    return await db.select().from(employeeSiteAssignments);
  } catch (error) {
    const code = typeof error === "object" && error != null && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "42P01") return [];
    throw error;
  }
}

export async function runMasterDataSyncAudit(): Promise<MasterDataSyncAudit> {
  const [
    employeeRows,
    authUsers,
    credentialAccounts,
    hrEmployeeRows,
    roleRows,
    siteRows,
    departmentRows,
    sectionRows,
    positionRows,
    siteAssignmentRows,
  ] = await Promise.all([
    db.select().from(employees),
    db.select().from(user),
    db
      .select({ userId: account.userId, accountId: account.accountId })
      .from(account)
      .where(eq(account.providerId, "credential")),
    db.select().from(hrEmployees),
    db.select().from(securityRoles),
    db.select().from(sites),
    db.select().from(masterDepartments),
    db.select().from(masterSections),
    db.select().from(masterPositions),
    getSiteAssignmentRows(),
  ]);

  const issues: MasterDataSyncIssue[] = [];
  const employeeByAuthUserId = new Map(
    employeeRows
      .filter((employee) => employee.authUserId)
      .map((employee) => [employee.authUserId!, employee]),
  );
  const authById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  const authByEmail = new Map(authUsers.map((authUser) => [normalize(authUser.email), authUser]));
  const credentialByUserId = new Map(credentialAccounts.map((credential) => [credential.userId, credential]));
  const roleNames = new Set(roleRows.map((role) => normalize(role.name)));
  const siteIds = new Set(siteRows.map((site) => site.id));
  const departmentById = new Map(departmentRows.map((department) => [department.id, department]));
  const sectionById = new Map(sectionRows.map((section) => [section.id, section]));
  const positionById = new Map(positionRows.map((position) => [position.id, position]));
  const hrByEmployeeId = new Map(hrEmployeeRows.map((employee) => [normalize(employee.employeeId), employee]));
  const hrByEmail = new Map(
    hrEmployeeRows
      .filter((employee) => employee.email)
      .map((employee) => [normalize(employee.email), employee]),
  );
  const activeSiteAssignmentEmployeeIds = new Set(
    siteAssignmentRows
      .filter((assignment) => assignment.isActive)
      .map((assignment) => assignment.employeeId),
  );

  const emailCounts = new Map<string, number>();
  const snCounts = new Map<string, number>();
  for (const employee of employeeRows) {
    const email = normalize(employee.email);
    const sn = normalize(employee.employeeSn);
    if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    if (sn) snCounts.set(sn, (snCounts.get(sn) ?? 0) + 1);
  }

  for (const employee of employeeRows) {
    const label = `${employee.name} <${employee.email}>`;
    const entityId = String(employee.id);
    const normalizedEmail = normalize(employee.email);
    const normalizedSn = normalize(employee.employeeSn);

    if (!employee.authUserId) {
      addIssue(issues, {
        code: "employee_missing_auth_link",
        severity: employee.isActive ? "critical" : "warning",
        entity: "employee",
        entityId,
        label,
        detail: "Employee has no authUserId, so login/account lifecycle is not linked.",
      });
    } else if (!authById.has(employee.authUserId)) {
      addIssue(issues, {
        code: "employee_auth_link_missing_target",
        severity: "critical",
        entity: "employee",
        entityId,
        label,
        detail: `Employee authUserId ${employee.authUserId} does not exist in auth user table.`,
      });
    }

    if (employee.authUserId && !credentialByUserId.has(employee.authUserId) && employee.isActive) {
      addIssue(issues, {
        code: "employee_missing_credential_account",
        severity: "critical",
        entity: "employee",
        entityId,
        label,
        detail: "Employee has auth user but no credential account for password login.",
      });
    }

    const authMatch = authByEmail.get(normalizedEmail);
    if (!employee.authUserId && authMatch) {
      addIssue(issues, {
        code: "employee_auth_email_unlinked",
        severity: "warning",
        entity: "employee",
        entityId,
        label,
        detail: `Auth user exists with same email but employee is not linked: ${authMatch.id}.`,
      });
    }

    if ((emailCounts.get(normalizedEmail) ?? 0) > 1) {
      addIssue(issues, {
        code: "duplicate_employee_email",
        severity: "critical",
        entity: "employee",
        entityId,
        label,
        detail: `Employee email is duplicated: ${employee.email}.`,
      });
    }

    if (normalizedSn && (snCounts.get(normalizedSn) ?? 0) > 1) {
      addIssue(issues, {
        code: "duplicate_employee_sn",
        severity: "critical",
        entity: "employee",
        entityId,
        label,
        detail: `Employee SN is duplicated: ${employee.employeeSn}.`,
      });
    }

    if (!siteIds.has(employee.siteId)) {
      addIssue(issues, {
        code: "employee_missing_site",
        severity: "critical",
        entity: "employee",
        entityId,
        label,
        detail: `Employee siteId ${employee.siteId} does not exist.`,
      });
    }

    if (employee.isActive && !activeSiteAssignmentEmployeeIds.has(employee.id)) {
      addIssue(issues, {
        code: "employee_missing_site_assignment_history",
        severity: "info",
        entity: "employee",
        entityId,
        label,
        detail: "Active employee has no site assignment history row.",
      });
    }

    if (employee.departmentId && !departmentById.has(employee.departmentId)) {
      addIssue(issues, {
        code: "employee_missing_department_fk",
        severity: "warning",
        entity: "employee",
        entityId,
        label,
        detail: `Employee departmentId ${employee.departmentId} does not exist.`,
      });
    }

    if (employee.sectionId && !sectionById.has(employee.sectionId)) {
      addIssue(issues, {
        code: "employee_missing_section_fk",
        severity: "warning",
        entity: "employee",
        entityId,
        label,
        detail: `Employee sectionId ${employee.sectionId} does not exist.`,
      });
    }

    if (employee.positionId && !positionById.has(employee.positionId)) {
      addIssue(issues, {
        code: "employee_missing_position_fk",
        severity: "warning",
        entity: "employee",
        entityId,
        label,
        detail: `Employee positionId ${employee.positionId} does not exist.`,
      });
    }

    if (employee.accessRole && !roleNames.has(employee.accessRole)) {
      addIssue(issues, {
        code: "employee_role_not_found",
        severity: "critical",
        entity: "employee",
        entityId,
        label,
        detail: `Employee accessRole is not found in security roles: ${employee.accessRole}.`,
      });
    }

    const department = employee.departmentId ? departmentById.get(employee.departmentId) : null;
    if (department && normalize(department.name) !== normalize(employee.department)) {
      addIssue(issues, {
        code: "employee_department_text_drift",
        severity: "info",
        entity: "employee",
        entityId,
        label,
        detail: `Employee department text "${employee.department}" differs from FK master "${department.name}".`,
      });
    }

    const section = employee.sectionId ? sectionById.get(employee.sectionId) : null;
    if (section && normalize(section.name) !== normalize(employee.section)) {
      addIssue(issues, {
        code: "employee_section_text_drift",
        severity: "info",
        entity: "employee",
        entityId,
        label,
        detail: `Employee section text "${employee.section}" differs from FK master "${section.name}".`,
      });
    }

    const position = employee.positionId ? positionById.get(employee.positionId) : null;
    if (position && normalize(position.name) !== normalize(employee.jobTitle)) {
      addIssue(issues, {
        code: "employee_position_text_drift",
        severity: "info",
        entity: "employee",
        entityId,
        label,
        detail: `Employee jobTitle text "${employee.jobTitle}" differs from FK master "${position.name}".`,
      });
    }

    if (!hrByEmployeeId.has(normalizedSn) && !hrByEmail.has(normalizedEmail)) {
      addIssue(issues, {
        code: "employee_missing_hr_match",
        severity: "warning",
        entity: "employee",
        entityId,
        label,
        detail: "Employee has no matching HR employee by employeeSn/employeeId or email.",
      });
    }
  }

  for (const authUser of authUsers) {
    if (!employeeByAuthUserId.has(authUser.id)) {
      addIssue(issues, {
        code: "auth_user_missing_employee",
        severity: "warning",
        entity: "auth_user",
        entityId: authUser.id,
        label: `${authUser.name} <${authUser.email}>`,
        detail: "Auth user has no linked employee projection.",
      });
    }
  }

  for (const hrEmployee of hrEmployeeRows) {
    const hasProjection = employeeRows.some(
      (employee) =>
        normalize(employee.employeeSn) === normalize(hrEmployee.employeeId) ||
        normalize(employee.email) === normalize(hrEmployee.email),
    );
    if (!hasProjection && hrEmployee.isActive) {
      addIssue(issues, {
        code: "hr_employee_missing_projection",
        severity: "warning",
        entity: "hr_employee",
        entityId: String(hrEmployee.id),
        label: `${hrEmployee.fullName} <${hrEmployee.email ?? "no-email"}>`,
        detail: "Active HR employee has no matching hero_employees projection.",
      });
    }
  }

  const counts = issues.reduce<Record<string, number>>(
    (acc, issue) => {
      acc[issue.code] = (acc[issue.code] ?? 0) + 1;
      acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
      return acc;
    },
    {
      employees: employeeRows.length,
      authUsers: authUsers.length,
      hrEmployees: hrEmployeeRows.length,
      roles: roleRows.length,
      sites: siteRows.length,
      siteAssignments: siteAssignmentRows.length,
      issues: issues.length,
      info: 0,
      warning: 0,
      critical: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    counts,
    issues: issues.sort((left, right) => {
      const rank = { critical: 0, warning: 1, info: 2 } as const;
      return rank[left.severity] - rank[right.severity] || left.code.localeCompare(right.code);
    }),
  };
}

export async function getMasterDataUniquenessStats() {
  return db.execute(sql`
    select 'employee_email' as key, lower(trim(email)) as value, count(*)::int as count
    from hero_employees
    where nullif(trim(email), '') is not null
    group by lower(trim(email))
    having count(*) > 1
    union all
    select 'employee_sn' as key, lower(trim(employee_sn)) as value, count(*)::int as count
    from hero_employees
    where nullif(trim(employee_sn), '') is not null
    group by lower(trim(employee_sn))
    having count(*) > 1
  `);
}
