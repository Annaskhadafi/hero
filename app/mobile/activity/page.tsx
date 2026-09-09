import { redirect } from "next/navigation";
import { desc, eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { MobileDailyActivityClient } from "@/components/mobile/mobile-daily-activity-client";
import { db } from "@/db";
import { employeeMcu, employees, masterSections, masterDepartments, sites } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";
import { resolveEmployeeApproverHierarchy } from "@/lib/overtime-hierarchy";
import { getDailyActivityApprovalData } from "@/app/dashboard/activity-hub/actions";

async function withDbRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 450): Promise<T> {
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
  searchParams: Promise<{ submitted?: string; spl?: string; tab?: string; edit?: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");
  const query = await searchParams;
  const submitted = query.submitted === "1";
  const submittedSpl = submitted && query.spl === "1";
  const tabQuery = query.tab || (query.edit ? 'apply' : undefined);
  const editSessionId = query.edit;

  const [data, rawEmployees, rawSections, rawDepartments, rawSites] = await Promise.all([
    safeQuery(() => getDailyActivityEmployeeData(session.user.email, { ensureSeed: false }), null, "getDailyActivityEmployeeData"),
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
            signatureDataUrl: employees.signatureDataUrl,
            signatureRegisteredAt: employees.signatureRegisteredAt,
          })
          .from(employees)
          .where(eq(employees.isActive, true))
          .orderBy(asc(employees.name)),
      [],
      "rawEmployees"
    ),
    safeQuery(() => db.select({ id: masterSections.id, name: masterSections.name, headEmployeeId: masterSections.headEmployeeId }).from(masterSections), [], "rawSections"),
    safeQuery(() => db.select({ id: masterDepartments.id, name: masterDepartments.name, headEmployeeId: masterDepartments.headEmployeeId }).from(masterDepartments), [], "rawDepartments"),
    safeQuery(() => db.select({ id: sites.id, name: sites.name, headEmployeeId: sites.headEmployeeId }).from(sites), [], "rawSites"),
  ]);

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">
        Data employee belum tersedia untuk akun ini.
      </div>
    );
  }

  // Fetch latest MCU record for employee wellness integration
  const [latestMcu] = await db
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
    .limit(1);

  const sectionHeadById = new Map(rawSections.map((s) => [s.id, s.headEmployeeId]));
  const deptHeadById = new Map(rawDepartments.map((d) => [d.id, d.headEmployeeId]));
  const siteHeadById = new Map(rawSites.map((s) => [s.id, s.headEmployeeId]));

  const hierarchyEmployees = rawEmployees.map((e) => ({
    ...e,
    sectionHeadId: e.sectionId ? (sectionHeadById.get(e.sectionId) ?? null) : null,
    deptHeadId: e.departmentId ? (deptHeadById.get(e.departmentId) ?? null) : null,
    siteHeadId: e.siteId ? (siteHeadById.get(e.siteId) ?? null) : null,
  }));

  const hierarchy = resolveEmployeeApproverHierarchy(data.employee.id, hierarchyEmployees);

  const teamMembers = await safeQuery(
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
          data.employee.siteId && data.employee.sectionId
            ? eq(employees.siteId, data.employee.siteId)
            : eq(employees.isActive, true)
        ),
    [],
    "teamMembers"
  );

  const productivityPercent =
    data.summary.jobsAssigned > 0
      ? Math.round((data.summary.jobsCompleted / data.summary.jobsAssigned) * 100)
      : data.activities.length > 0 ? 100 : 0;
  const splToUpdate = data.routeChecklist?.activeSpl ?? data.standaloneOvertimeChecklist;

  // Fetch edit session data if edit parameter is provided
  let editSessionData = null;
  if (editSessionId) {
    const numericId = editSessionId.replace(/[^0-9]/g, "");
    const sessionIdVal = numericId && !isNaN(Number(numericId)) && Number(numericId) > 0
      ? Number(numericId)
      : editSessionId;
    try {
      editSessionData = await getDailyActivityApprovalData(sessionIdVal, session.user.email);
    } catch (err) {
      console.error("[MobileActivityPage] Failed to fetch edit session:", err);
    }
  }

  return (
    <MobileDailyActivityClient
      data={data}
      rawEmployees={rawEmployees}
      rawSections={rawSections}
      rawDepartments={rawDepartments}
      rawSites={rawSites}
      hierarchy={hierarchy}
      teamMembers={teamMembers}
      latestMcu={latestMcu}
      productivityPercent={productivityPercent}
      splToUpdate={splToUpdate}
      submitted={submitted}
      submittedSpl={submittedSpl}
      tabQuery={tabQuery}
      editSessionData={editSessionData}
    />
  );
}
