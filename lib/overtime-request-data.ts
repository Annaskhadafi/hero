import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { employees, overtimeRequestLeaderPermissions } from "@/db/schema/hero";
import { ensureDailyActivitySeedData, getDailyActivityTeamBoardData, getManagedEmployeeIdsForLead } from "@/lib/daily-activity";

function canManageSettings(accessRole: string) {
  return ["Super Admin", "Site Admin", "HC Manager"].includes(accessRole);
}

export async function getOvertimeRequestWorkspaceData(email?: string | null) {
  await ensureDailyActivitySeedData();

  const teamBoardData = await getDailyActivityTeamBoardData(email);
  if (!teamBoardData) {
    return null;
  }

  const currentEmployee = teamBoardData.lead;
  const [permission, siteEmployees, permissionRows] = await Promise.all([
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
      .select({
        id: employees.id,
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
  const leaderCandidates = (
    await Promise.all(
      siteEmployees.map(async (employee) => {
        const managedEmployeeIds = await getManagedEmployeeIdsForLead(employee.id);
        const settings = permissionByLeaderId.get(employee.id);

        return {
          ...employee,
          subordinateCount: managedEmployeeIds.length,
          isActive: settings?.isActive ?? false,
          note: settings?.note ?? "",
          subordinateIds: managedEmployeeIds,
        };
      }),
    )
  ).filter((employee) => {
    if (employee.subordinateCount > 0) {
      return true;
    }

    const normalizedRole = `${employee.role} ${employee.accessRole}`.toLowerCase();
    return normalizedRole.includes("leader") || normalizedRole.includes("foreman");
  });

  const activeLeaderCount = leaderCandidates.filter((employee) => employee.isActive).length;
  const totalAssignedLines = teamBoardData.splDocuments.reduce((total, document) => total + document.lineCount, 0);
  const totalAssignedWorkers = teamBoardData.splDocuments.reduce((total, document) => total + document.workerCount, 0);

  return {
    ...teamBoardData,
    permission,
    canManageSettings: canManageSettings(currentEmployee.accessRole),
    canCreateRequests: canManageSettings(currentEmployee.accessRole) || Boolean(permission?.isActive),
    metrics: {
      activeLeaders: activeLeaderCount,
      totalLeaders: leaderCandidates.length,
      totalDocuments: teamBoardData.splDocuments.length,
      totalAssignedLines,
      totalAssignedWorkers,
    },
    leaderCandidates,
  };
}
