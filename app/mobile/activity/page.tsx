import { redirect } from "next/navigation";
import { desc, eq, asc, and, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { MobileDailyActivityClient } from "@/components/mobile/mobile-daily-activity-client";
import { db } from "@/db";
import { employeeMcu, employees, masterSections, masterDepartments, sites } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";
import { resolveEmployeeApproverHierarchy } from "@/lib/overtime-hierarchy";
import { getDailyActivityApprovalData } from "@/app/dashboard/activity-hub/actions";
import { getApprovalCenterData } from "@/lib/approval-workspace";

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 300): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const errStr = String(err?.message || err?.cause?.message || err || '').toLowerCase();
      const isNetworkError =
        err?.code === 'ECONNRESET' ||
        err?.code === '53300' ||
        errStr.includes('econnreset') ||
        errStr.includes('connection terminated') ||
        errStr.includes('timeout exceeded') ||
        errStr.includes('trying to connect') ||
        errStr.includes('too many clients') ||
        errStr.includes('sorry, too many clients') ||
        errStr.includes('connection reset') ||
        errStr.includes('remaining connection slots are reserved');
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
    console.error(`[MobileActivityPage] Warning in ${label}:`, (err as any)?.message || err);
    return fallback;
  }
}

export default async function MobileActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; spl?: string; tab?: string; edit?: string; draft?: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");
  const query = await searchParams;
  const submitted = query.submitted === "1";
  const submittedSpl = submitted && query.spl === "1";
  const tabQuery = query.tab || (query.edit || query.draft ? 'apply' : undefined);
  const editSessionId = query.edit;
  const draftQuery = query.draft;

  // Step 1: Core parallel fetch for employee DAR data, DAR approval center, and master references
  const [data, rawSections, rawDepartments, rawSites, approvals] = await Promise.all([
    safeQuery(
      () => getDailyActivityEmployeeData(session.user.email, { ensureSeed: false, limit: 25 }),
      null,
      "getDailyActivityEmployeeData"
    ),
    safeQuery(
      () => db.select({ id: masterSections.id, headEmployeeId: masterSections.headEmployeeId }).from(masterSections),
      [],
      "rawSections"
    ),
    safeQuery(
      () => db.select({ id: masterDepartments.id, headEmployeeId: masterDepartments.headEmployeeId }).from(masterDepartments),
      [],
      "rawDepartments"
    ),
    safeQuery(
      () => db.select({ id: sites.id, headEmployeeId: sites.headEmployeeId }).from(sites),
      [],
      "rawSites"
    ),
    safeQuery(
      () => getApprovalCenterData(session.user.email, { categoryFilter: 'DAILY_ACTIVITY', skipHistory: true }),
      null,
      "getApprovalCenterData"
    ),
  ]);

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">
        Data employee belum tersedia untuk akun ini.
      </div>
    );
  }

  const sectionHeadById = new Map(rawSections.map((s) => [s.id, s.headEmployeeId]));
  const deptHeadById = new Map(rawDepartments.map((d) => [d.id, d.headEmployeeId]));
  const siteHeadById = new Map(rawSites.map((s) => [s.id, s.headEmployeeId]));

  const secHeadId = data.employee.sectionId ? (sectionHeadById.get(data.employee.sectionId) ?? null) : null;
  const deptHeadId = data.employee.departmentId ? (deptHeadById.get(data.employee.departmentId) ?? null) : null;
  const siteHeadId = data.employee.siteId ? (siteHeadById.get(data.employee.siteId) ?? null) : null;

  const candidateApproverIds = Array.from(
    new Set(
      [data.employee.id, data.employee.directManagerId, secHeadId, deptHeadId, siteHeadId].filter(
        (id): id is number => Boolean(id)
      )
    )
  );

  // Parse edit session ID if present
  let editSessionPromise: Promise<any> = Promise.resolve(null);
  if (editSessionId) {
    const numericId = editSessionId.replace(/[^0-9]/g, "");
    const sessionIdVal = numericId && !isNaN(Number(numericId)) && Number(numericId) > 0
      ? Number(numericId)
      : editSessionId;
    editSessionPromise = safeQuery(
      () => getDailyActivityApprovalData(sessionIdVal, session.user.email),
      null,
      "getDailyActivityApprovalData"
    );
  }

  // Step 2: Parallel fetch for targeted MCU, team members (same site/section), and hierarchy approvers
  const [latestMcu, teamMembers, approverEmps, editSessionData] = await Promise.all([
    safeQuery(
      () =>
        db
          .select({
            id: employeeMcu.id,
            mcuDate: employeeMcu.mcuDate,
            status: employeeMcu.status,
            aiKategori: employeeMcu.aiKategori,
            aiKesimpulan: employeeMcu.aiKesimpulan,
            resultFileUrl: employeeMcu.resultFileUrl,
            resultFileName: employeeMcu.resultFileName,
          })
          .from(employeeMcu)
          .where(eq(employeeMcu.employeeId, data.employee.id))
          .orderBy(desc(employeeMcu.mcuDate), desc(employeeMcu.createdAt))
          .limit(1)
          .then((rows) => rows[0] || null),
      null,
      "latestMcu"
    ),

    safeQuery(
      () =>
        db
          .select({
            id: employees.id,
            name: employees.name,
            role: employees.role,
            department: employees.department,
            siteId: employees.siteId,
            sectionId: employees.sectionId,
            employeeId: employees.employeeSn,
            jobTitle: employees.jobTitle,
          })
          .from(employees)
          .where(
            and(
              eq(employees.isActive, true),
              data.employee.siteId && data.employee.sectionId
                ? and(eq(employees.siteId, data.employee.siteId), eq(employees.sectionId, data.employee.sectionId))
                : data.employee.siteId
                  ? eq(employees.siteId, data.employee.siteId)
                  : undefined
            )
          )
          .orderBy(asc(employees.name)),
      [],
      "teamMembers"
    ),

    candidateApproverIds.length > 0
      ? safeQuery(
          () =>
            db
              .select({
                id: employees.id,
                name: employees.name,
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
              .where(inArray(employees.id, candidateApproverIds)),
          [],
          "approverEmps"
        )
      : Promise.resolve([]),

    editSessionPromise,
  ]);

  const hierarchyEmployees = approverEmps.map((e) => ({
    ...e,
    sectionHeadId: e.sectionId ? (sectionHeadById.get(e.sectionId) ?? null) : null,
    deptHeadId: e.departmentId ? (deptHeadById.get(e.departmentId) ?? null) : null,
    siteHeadId: e.siteId ? (siteHeadById.get(e.siteId) ?? null) : null,
  }));

  const hierarchy = resolveEmployeeApproverHierarchy(data.employee.id, hierarchyEmployees);

  const productivityPercent =
    data.summary.jobsAssigned > 0
      ? Math.round((data.summary.jobsCompleted / data.summary.jobsAssigned) * 100)
      : data.activities.length > 0 ? 100 : 0;
  const splToUpdate = data.routeChecklist?.activeSpl ?? data.standaloneOvertimeChecklist;

  return (
    <MobileDailyActivityClient
      data={data}
      rawEmployees={[]}
      rawSections={[]}
      rawDepartments={[]}
      rawSites={[]}
      hierarchy={hierarchy}
      teamMembers={teamMembers}
      latestMcu={latestMcu}
      productivityPercent={productivityPercent}
      splToUpdate={splToUpdate}
      submitted={submitted}
      submittedSpl={submittedSpl}
      tabQuery={tabQuery}
      draftQuery={draftQuery}
      editSessionData={editSessionData}
      approvals={approvals}
    />
  );
}
