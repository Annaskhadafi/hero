import { getDailyActivityApprovalData } from "@/app/dashboard/activity-hub/actions";
import { MobileDailyActivityForm } from "@/components/mobile/mobile-daily-activity-form";
import { getServerSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { employees, masterSections, masterDepartments, sites, activityLibraries } from "@/db/schema/hero";
import { and, eq, isNull, ne, asc } from "drizzle-orm";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";
import { resolveEmployeeApproverHierarchy } from "@/lib/overtime-hierarchy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Revisi & Approval Daily Activity - HERO Mobile",
};

async function withDbRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 450): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const errStr = String(err?.message || err?.cause?.message || err || "").toLowerCase();
      const isNetworkError =
        err?.code === "ECONNRESET" ||
        err?.code === "53300" ||
        errStr.includes("econnreset") ||
        errStr.includes("connection terminated") ||
        errStr.includes("timeout exceeded") ||
        errStr.includes("trying to connect") ||
        errStr.includes("too many clients") ||
        errStr.includes("sorry, too many clients") ||
        errStr.includes("connection reset") ||
        errStr.includes("remaining connection slots are reserved");
      if (attempt <= retries && isNetworkError) {
        await new Promise((res) => setTimeout(res, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await withDbRetry(fn);
  } catch (err) {
    console.error(`[MobileActivityApprovalPage] Warning in ${label}:`, (err as any)?.message || err);
    return fallback;
  }
}

export default async function MobileDailyActivityApprovalPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const { sessionId } = await params;
  const decodedSessionId = decodeURIComponent(sessionId);
  const numericOnly = decodedSessionId.replace(/[^0-9]/g, "");
  const sessionIdVal =
    numericOnly && !isNaN(Number(numericOnly)) && Number(numericOnly) > 0
      ? Number(numericOnly)
      : !isNaN(Number(decodedSessionId))
        ? Number(decodedSessionId)
        : decodedSessionId;

  const [approvalData, employeeData, rawEmps, rawSections, rawDepts, rawSites, fallbackLibraries] =
    await Promise.all([
      getDailyActivityApprovalData(sessionIdVal),
      getDailyActivityEmployeeData(session.user.email, { ensureSeed: false }).catch(() => null),
      safeQuery(
        () =>
          db
            .select({
              id: employees.id,
              name: employees.name,
              email: employees.email,
              employeeId: employees.employeeSn,
              position: employees.jobTitle,
              department: employees.department,
              section: employees.section,
              directManagerId: employees.directManagerId,
              sectionId: employees.sectionId,
              departmentId: employees.departmentId,
              siteId: employees.siteId,
            })
            .from(employees)
            .where(eq(employees.isActive, true))
            .orderBy(asc(employees.name)),
        [],
        "rawEmployees"
      ),
      safeQuery(
        () =>
          db
            .select({
              id: masterSections.id,
              name: masterSections.name,
              headEmployeeId: masterSections.headEmployeeId,
            })
            .from(masterSections),
        [],
        "rawSections"
      ),
      safeQuery(
        () =>
          db
            .select({
              id: masterDepartments.id,
              name: masterDepartments.name,
              headEmployeeId: masterDepartments.headEmployeeId,
            })
            .from(masterDepartments),
        [],
        "rawDepts"
      ),
      safeQuery(
        () =>
          db
            .select({
              id: sites.id,
              name: sites.name,
              headEmployeeId: sites.headEmployeeId,
            })
            .from(sites),
        [],
        "rawSites"
      ),
      safeQuery(
        () =>
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
            .where(eq(activityLibraries.isActive, true))
            .orderBy(asc(activityLibraries.activityCode)),
        [],
        "fallbackLibraries"
      ),
    ]);

  if (!approvalData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-800">Dokumen Daily Activity tidak ditemukan</h2>
        <p className="text-xs text-slate-500 mt-1">
          Sesi aktivitas dengan ID #{sessionId} tidak ada atau telah dihapus.
        </p>
      </div>
    );
  }

  const sectionHeadById = new Map(rawSections.map((s) => [s.id, s.headEmployeeId]));
  const deptHeadById = new Map(rawDepts.map((d) => [d.id, d.headEmployeeId]));
  const siteHeadById = new Map(rawSites.map((s) => [s.id, s.headEmployeeId]));

  const hierarchyEmployees = rawEmps.map((e) => ({
    ...e,
    sectionHeadId: e.sectionId ? sectionHeadById.get(e.sectionId) ?? null : null,
    deptHeadId: e.departmentId ? deptHeadById.get(e.departmentId) ?? null : null,
    siteHeadId: e.siteId ? siteHeadById.get(e.siteId) ?? null : null,
  }));

  const targetEmpId = approvalData.employee?.id || employeeData?.employee?.id || 0;
  const hierarchy = targetEmpId ? resolveEmployeeApproverHierarchy(targetEmpId, hierarchyEmployees) : null;
  const allEmployees = hierarchyEmployees;

  const activeSpl = employeeData?.routeChecklist?.activeSpl ?? employeeData?.standaloneOvertimeChecklist;
  const now = new Date();
  const dateTimeLocal = (reference: Date) => {
    const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };
  const defaultStartTime = dateTimeLocal(activeSpl?.plannedStartAt ?? activeSpl?.workDate ?? now);
  const defaultEndTime = dateTimeLocal(activeSpl?.plannedEndAt ?? activeSpl?.workDate ?? now);

  const mergedLibraries = employeeData?.availableLibrary?.length
    ? employeeData.availableLibrary
    : (fallbackLibraries as any[]);

  const teamMembers = rawEmps.filter((e) => e.id !== targetEmpId);

  return (
    <div className="pb-6">
      <MobileDailyActivityForm
        employeeId={targetEmpId}
        employee={{
          id: targetEmpId,
          name: employeeData?.employee?.name || approvalData.employee.name || '',
          employeeSn: employeeData?.employee?.employeeSn || (approvalData.employee as any).sn || (approvalData.employee as any).employeeId || '',
          jobTitle: employeeData?.employee?.jobTitle || (approvalData.employee as any).jobTitle || (approvalData.employee as any).position || '',
          department: employeeData?.employee?.department || approvalData.employee.department || '',
          section: employeeData?.employee?.section || approvalData.employee.section || '',
        }}
        hierarchy={hierarchy as any}
        assignments={employeeData?.assignments || []}
        availableLibrary={mergedLibraries}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
        availableRouteFolders={employeeData?.availableRouteFolders || []}
        routeChecklist={employeeData?.routeChecklist || null}
        standaloneOvertimeChecklist={employeeData?.standaloneOvertimeChecklist || null}
        site={employeeData?.site || null}
        teamMembers={teamMembers as any[]}
        allEmployees={allEmployees}
        revisionSessionId={approvalData.sessionId}
        initialSessionData={approvalData}
      />
    </div>
  );
}
