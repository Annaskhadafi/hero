// Mobile Daily Activity Input Route
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, UserRound } from "lucide-react";

import { MobileDailyActivityForm } from "@/components/mobile/mobile-daily-activity-form";
import { db } from "@/db";
import { employees, masterSections, masterDepartments, sites } from "@/db/schema/hero";
import { and, eq, isNull, ne, asc } from "drizzle-orm";
import { getActivityPagePurpose } from "@/lib/activity-navigation";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";
import { resolveEmployeeApproverHierarchy } from "@/lib/overtime-hierarchy";

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
    console.error(`[MobileActivityInputPage] Warning in ${label}:`, (err as any)?.message || err);
    return fallback;
  }
}

function dateTimeLocalValue(reference: Date) {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function MobileActivityInputPage({
  searchParams,
}: {
  searchParams?: Promise<{ sessionId?: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");
  const query = searchParams ? await searchParams : {};
  if (query?.sessionId) {
    redirect(`/mobile/activity/document/${query.sessionId}/approval`);
  }

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

  // Team members must belong to the same site AND section as the account so
  // "tambah anggota" (team logging) only offers colleagues in the same scope.
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
          section: employees.section,
        })
        .from(employees)
        .where(
          and(
            eq(employees.isActive, true),
            eq(employees.siteId, data.employee.siteId),
            data.employee.sectionId != null
              ? eq(employees.sectionId, data.employee.sectionId)
              : isNull(employees.sectionId),
            ne(employees.id, data.employee.id)
          )
        )
        .orderBy(asc(employees.name)),
    [],
    "teamMembers"
  );

  const activeSpl = data.routeChecklist?.activeSpl ?? data.standaloneOvertimeChecklist;
  const now = new Date();
  const defaultStartTime = dateTimeLocalValue(activeSpl?.plannedStartAt ?? activeSpl?.workDate ?? now);
  const defaultEndTime = dateTimeLocalValue(activeSpl?.plannedEndAt ?? activeSpl?.workDate ?? now);
  const pagePurpose = getActivityPagePurpose("input");

  return (
    <div className="space-y-4 pb-6">
      {/* Back link */}
      <Link prefetch={false} href="/mobile/activity"
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
        <ArrowLeft className="size-4" /> Kembali ke aktivitas harian
      </Link>

      {/* Header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Aktivitas Harian</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900">{pagePurpose.title}</h1>
      </div>



      {/* Current Context */}
      <section className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Current Context</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{data.employee.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              {data.site?.name ?? "Site"}
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {data.assignments.length} assignment
            </span>
          </div>
        </div>

      </section>

      {/* Daily Route */}
      {data.routeChecklist ? (
        <section className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Matched Daily Route</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{data.routeChecklist.routeName}</p>
              <p className="mt-2 text-xs text-gray-500">
                {data.routeChecklist.groupCount} group &bull; {data.routeChecklist.itemCount} item &bull; {data.routeChecklist.shiftCode}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{data.routeChecklist.routeCode}</span>
              {data.routeChecklist.activeSpl ? (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{data.routeChecklist.activeSpl.splNumber}</span>
              ) : null}
              {data.routeChecklist.positionName ? (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{data.routeChecklist.positionName}</span>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* SPL Checklist */}
      {data.standaloneOvertimeChecklist ? (
        <section className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Checklist SPL Aktif</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{data.standaloneOvertimeChecklist.title}</p>
              <p className="mt-2 text-xs text-gray-500">
                {data.standaloneOvertimeChecklist.splNumber} &bull; {data.standaloneOvertimeChecklist.lineCount} line
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{data.standaloneOvertimeChecklist.progressPercent}% progress</span>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{data.standaloneOvertimeChecklist.plannedPointsTotal} pts</span>
            </div>
          </div>
        </section>
      ) : null}

      <MobileDailyActivityForm
        employeeId={data.employee.id}
        employee={data.employee}
        hierarchy={hierarchy}
        assignments={data.assignments}
        availableLibrary={data.availableLibrary}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
        routeChecklist={data.routeChecklist}
        availableRouteFolders={data.availableRouteFolders}
        standaloneOvertimeChecklist={data.standaloneOvertimeChecklist}
        site={data.site}
        teamMembers={teamMembers}
        allEmployees={hierarchyEmployees}
      />
    </div>
  );
}
