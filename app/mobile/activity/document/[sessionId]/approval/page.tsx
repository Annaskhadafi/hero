import { getDailyActivityApprovalData } from "@/app/dashboard/activity-hub/actions";
import { MobileDailyActivityApprovalClient } from "@/components/mobile/mobile-daily-activity-approval-client";
import { getServerSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { employees, masterSections, masterDepartments, sites } from "@/db/schema/hero";
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

  const [approvalData, employeeData] = await Promise.all([
    getDailyActivityApprovalData(sessionIdVal),
    getDailyActivityEmployeeData(session.user.email, { ensureSeed: false }).catch(() => null),
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

  // Fetch hierarchy and team members if employeeData is available
  let hierarchy = null;
  let teamMembers: any[] = [];
  let allEmployees: any[] = [];
  let rawEmployees: any[] = [];
  let defaultStartTime = "";
  let defaultEndTime = "";

  if (employeeData) {
    const [rawEmps, rawSections, rawDepts, rawSites] = await Promise.all([
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
    ]);

    rawEmployees = rawEmps;
    const sectionHeadById = new Map(rawSections.map((s) => [s.id, s.headEmployeeId]));
    const deptHeadById = new Map(rawDepts.map((d) => [d.id, d.headEmployeeId]));
    const siteHeadById = new Map(rawSites.map((s) => [s.id, s.headEmployeeId]));

    const hierarchyEmployees = rawEmps.map((e) => ({
      ...e,
      sectionHeadId: e.sectionId ? sectionHeadById.get(e.sectionId) ?? null : null,
      deptHeadId: e.departmentId ? deptHeadById.get(e.departmentId) ?? null : null,
      siteHeadId: e.siteId ? siteHeadById.get(e.siteId) ?? null : null,
    }));

    hierarchy = resolveEmployeeApproverHierarchy(employeeData.employee.id, hierarchyEmployees);
    allEmployees = hierarchyEmployees;

    teamMembers = await safeQuery(
      () =>
        db
          .select({
            id: employees.id,
            name: employees.name,
            role: employees.role,
            department: employees.department,
            siteId: employees.siteId,
            sectionId: employees.sectionId,
            section: employees.section,
          })
          .from(employees)
          .where(
            and(
              eq(employees.isActive, true),
              eq(employees.siteId, employeeData.employee.siteId),
              employeeData.employee.sectionId != null
                ? eq(employees.sectionId, employeeData.employee.sectionId)
                : isNull(employees.sectionId),
              ne(employees.id, employeeData.employee.id)
            )
          )
          .orderBy(asc(employees.name)),
      [],
      "teamMembers"
    );

    const activeSpl = employeeData.routeChecklist?.activeSpl ?? employeeData.standaloneOvertimeChecklist;
    const now = new Date();
    const dateTimeLocal = (reference: Date) => {
      const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    };
    defaultStartTime = dateTimeLocal(activeSpl?.plannedStartAt ?? activeSpl?.workDate ?? now);
    defaultEndTime = dateTimeLocal(activeSpl?.plannedEndAt ?? activeSpl?.workDate ?? now);
  }

  return (
    <div className="pb-6">
      <MobileDailyActivityApprovalClient
        data={approvalData as any}
        employeeData={employeeData as any}
        hierarchy={hierarchy as any}
        teamMembers={teamMembers}
        allEmployees={allEmployees}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
      />
    </div>
  );
}
