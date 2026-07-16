import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { employees, overtimeRequestLeaderPermissions, sites } from "@/db/schema/hero";
import { ensureDailyActivitySeedData, getDailyActivityTeamBoardData } from "@/lib/daily-activity";
import { getHeadLocationDescendantIds } from "@/lib/head-location-hierarchy";

function canManageSettings(accessRole: string) {
  return ["Super Admin", "Site Admin", "HC Manager"].includes(accessRole);
}

export async function getHeadLocationManagedEmployeeIds(siteId: number, leaderId: number) {
  const [site, rows] = await Promise.all([
    db.select({ headEmployeeId: sites.headEmployeeId }).from(sites).where(eq(sites.id, siteId)).limit(1).then((result) => result[0]),
    db.select({ id: employees.id, directManagerId: employees.directManagerId }).from(employees).where(and(eq(employees.siteId, siteId), eq(employees.isActive, true))),
  ]);
  if (!site?.headEmployeeId) return [];
  const headScope = new Set([site.headEmployeeId, ...getHeadLocationDescendantIds(rows, site.headEmployeeId)]);
  return headScope.has(leaderId) ? getHeadLocationDescendantIds(rows, leaderId) : [];
}

export async function getOvertimeRequestWorkspaceData(email?: string | null) {
  await ensureDailyActivitySeedData();

  const teamBoardData = await getDailyActivityTeamBoardData(email);
  if (!teamBoardData) {
    return null;
  }

  const currentEmployee = teamBoardData.lead;
  const [permission, siteRow, siteEmployees, permissionRows] = await Promise.all([
    db
      .select({
        id: overtimeRequestLeaderPermissions.id,
        isActive: overtimeRequestLeaderPermissions.isActive,
        note: overtimeRequestLeaderPermissions.note,
      })
      .from(overtimeRequestLeaderPermissions)
      .where(
        and(
          eq(overtimeRequestLeaderPermissions.siteId, currentEmployee.siteId),
          eq(overtimeRequestLeaderPermissions.leaderEmployeeId, currentEmployee.id),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({ headEmployeeId: sites.headEmployeeId, headEmployeeName: employees.name })
      .from(sites)
      .leftJoin(employees, eq(sites.headEmployeeId, employees.id))
      .where(eq(sites.id, currentEmployee.siteId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: employees.id,
        employeeSn: employees.employeeSn,
        directManagerId: employees.directManagerId,
        name: employees.name,
        role: employees.role,
        accessRole: employees.accessRole,
        department: employees.department,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(
        and(
          eq(employees.siteId, currentEmployee.siteId),
          eq(employees.isActive, true),
        ),
      )
      .orderBy(asc(employees.name)),
    db
      .select({
        leaderEmployeeId: overtimeRequestLeaderPermissions.leaderEmployeeId,
        isActive: overtimeRequestLeaderPermissions.isActive,
        note: overtimeRequestLeaderPermissions.note,
      })
      .from(overtimeRequestLeaderPermissions)
      .where(eq(overtimeRequestLeaderPermissions.siteId, currentEmployee.siteId)),
  ]);

  const permissionByLeaderId = new Map(permissionRows.map((row) => [row.leaderEmployeeId, row]));
  const headScopeIds = siteRow?.headEmployeeId
    ? new Set([siteRow.headEmployeeId, ...getHeadLocationDescendantIds(siteEmployees, siteRow.headEmployeeId)])
    : new Set<number>();
  const employeeById = new Map(siteEmployees.map((employee) => [employee.id, employee]));
  const leaderOptions = siteEmployees
    .filter((employee) => headScopeIds.has(employee.id))
    .map((employee) => ({ ...employee, subordinateIds: getHeadLocationDescendantIds(siteEmployees, employee.id) }))
    .filter((employee) => employee.subordinateIds.length > 0)
    .map((employee) => ({
      ...employee,
      subordinateCount: employee.subordinateIds.length,
      subordinateNames: employee.subordinateIds.map((id) => employeeById.get(id)?.name).filter(Boolean) as string[],
    }));
  const optionById = new Map(leaderOptions.map((employee) => [employee.id, employee]));
  const leaderCandidates = permissionRows
    .map((settings) => {
      const employee = optionById.get(settings.leaderEmployeeId);
      return employee ? { ...employee, isActive: settings.isActive, note: settings.note } : null;
    })
    .filter((employee): employee is NonNullable<typeof employee> => employee != null);

  const activeLeaderCount = leaderCandidates.filter((employee) => employee.isActive).length;
  const currentManagedIds = permission?.isActive && headScopeIds.has(currentEmployee.id)
    ? getHeadLocationDescendantIds(siteEmployees, currentEmployee.id)
    : [];
  const commandTeam = currentManagedIds
    .map((employeeId) => employeeById.get(employeeId))
    .filter((employee): employee is NonNullable<typeof employee> => employee != null);
  const managedEmployeeIds = new Set(currentManagedIds);
  const visibleSplDocuments = canManageSettings(currentEmployee.accessRole)
    ? teamBoardData.splDocuments
    : teamBoardData.splDocuments.filter(
        (document) =>
          document.requestedByEmployeeId === currentEmployee.id ||
          document.workers.some(
            (worker) => worker.employeeId === currentEmployee.id || managedEmployeeIds.has(worker.employeeId),
          ),
      );
  const totalAssignedLines = visibleSplDocuments.reduce((total, document) => total + document.lineCount, 0);
  const totalAssignedWorkers = visibleSplDocuments.reduce((total, document) => total + document.workerCount, 0);

  return {
    ...teamBoardData,
    team: commandTeam,
    splDocuments: visibleSplDocuments,
    permission,
    canManageSettings: canManageSettings(currentEmployee.accessRole),
    canCreateRequests: true,
    canCreateCommands: Boolean(permission?.isActive),
    metrics: {
      activeLeaders: activeLeaderCount,
      totalLeaders: leaderCandidates.length,
      totalDocuments: visibleSplDocuments.length,
      totalAssignedLines,
      totalAssignedWorkers,
    },
    leaderCandidates,
    leaderOptions,
    headLocation: siteRow,
  };
}
