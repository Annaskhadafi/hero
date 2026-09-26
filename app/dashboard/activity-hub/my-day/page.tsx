import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  Clock3,
  FileSignature,
  Inbox,
  ListTodo,
  MapPin,
  MapPinned,
  ShieldAlert,
  Sparkles,
  Sun,
  Users,
  Activity as ActivityIcon,
  CheckCircle2,
} from "lucide-react";
import {
  submitDailyActivityWithStateAction,
  submitPointDisputeAction,
} from "@/app/dashboard/activity-hub/actions";
import { db } from "@/db";
import {
  activityLibraries,
  activityRouteGroups,
  activityRouteItems,
  activityRouteTemplates,
  employees,
  masterDepartments,
  masterSections,
  sites,
} from "@/db/schema/hero";
import { asc, eq } from "drizzle-orm";
import { ActivityTeamLogPanel } from "@/components/activity-team-log-panel";
import { MyDayActivityCreateTrigger } from "@/components/my-day-activity-create-trigger";
import { MyDayStatCards } from "@/components/my-day/my-day-stat-cards";
import { MyDayRouteChecklist } from "@/components/my-day/my-day-route-checklist";
import { MyDayFilterBar } from "@/components/my-day/my-day-filter-bar";
import { MyDayEmptyState } from "@/components/my-day/my-day-empty-state";
import { MyDayActivityLogTable } from "@/components/my-day/my-day-activity-log-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableFilterPresets } from "@/components/table-filter-presets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getServerSession } from "@/lib/auth-session";
import { getActivityPagePurpose } from "@/lib/activity-navigation";
import { getDailyActivityEmployeeData, getDailyActivityTeamBoardData, type RouteFolder } from "@/lib/daily-activity";
import { getCurrentMenuPermission } from "@/lib/hero-access";

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("approved") || normalized.includes("selesai") || normalized.includes("done")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50 font-semibold";
  }

  if (normalized.includes("pending") || normalized.includes("review") || normalized.includes("menunggu")) {
    return "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50 font-semibold";
  }

  if (normalized.includes("reject") || normalized.includes("tolak") || normalized.includes("batal")) {
    return "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50 font-semibold";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium";
}

function SelectFilter({
  filterKey,
  placeholder,
  options,
}: {
  filterKey: string;
  placeholder: string;
  options: string[];
}) {
  return (
    <select
      data-table-filter-key={filterKey}
      defaultValue=""
      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs transition-colors focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

type MyDaySearchParams = Promise<{
  view?: string | string[];
  siteId?: string | string[];
  sectionId?: string | string[];
}>;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MyDayPage({
  searchParams,
}: {
  searchParams?: MyDaySearchParams;
}) {
  const session = await getServerSession();
  const userEmail = session?.user?.email ?? "";
  const permission = await getCurrentMenuPermission("tire_service");

  if (!permission.canView) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const requestedView = firstSearchParam(params.view);
  const requestedSiteId = Number.parseInt(firstSearchParam(params.siteId) ?? "", 10);
  const requestedSectionId = Number.parseInt(firstSearchParam(params.sectionId) ?? "", 10);
  const canMonitor = permission.dataScope !== "own";
  const viewScope =
    requestedView === "site"
      ? canMonitor
        ? "site"
        : "own"
      : requestedView === "global" && permission.dataScope === "global"
        ? "global"
        : "own";

  let [
    data,
    teamData,
    rawEmployees,
    rawSites,
    rawSections,
    rawDepts,
    rawPresets,
    routeTemplateRows,
    routeGroupRows,
    routeItemRows,
  ] = await Promise.all([
    getDailyActivityEmployeeData(userEmail || null, {
      viewScope,
      siteId: Number.isFinite(requestedSiteId) ? requestedSiteId : undefined,
      sectionId: Number.isFinite(requestedSectionId) ? requestedSectionId : undefined,
    }),
    canMonitor ? getDailyActivityTeamBoardData(userEmail || null) : Promise.resolve(null),
    db
      .select({
        id: employees.id,
        name: employees.name,
        role: employees.role,
        department: employees.department,
        section: employees.section,
        siteId: employees.siteId,
        sectionId: employees.sectionId,
        departmentId: employees.departmentId,
        directManagerId: employees.directManagerId,
        employeeId: employees.employeeSn,
        jobTitle: employees.jobTitle,
        email: employees.email,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(employees.name),
    db
      .select({
        id: sites.id,
        name: sites.name,
        location: sites.location,
      })
      .from(sites)
      .where(eq(sites.isActive, true)),
    db.select().from(masterSections),
    db.select().from(masterDepartments),
    db
      .select({
        id: activityLibraries.id,
        code: activityLibraries.activityCode,
        name: activityLibraries.activityName,
        basePoints: activityLibraries.basePoints,
        category: activityLibraries.category,
        requiresPhoto: activityLibraries.requiresPhoto,
        requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
        requiresDuration: activityLibraries.requiresDuration,
        requiresLocationGps: activityLibraries.requiresLocationGps,
        requiresTireCount: activityLibraries.requiresTireCount,
        requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
      })
      .from(activityLibraries)
      .where(eq(activityLibraries.isActive, true))
      .orderBy(asc(activityLibraries.activityCode)),
    db
      .select({
        id: activityRouteTemplates.id,
        routeCode: activityRouteTemplates.routeCode,
        routeName: activityRouteTemplates.routeName,
      })
      .from(activityRouteTemplates)
      .where(eq(activityRouteTemplates.isActive, true))
      .orderBy(asc(activityRouteTemplates.routeName)),
    db
      .select({
        id: activityRouteGroups.id,
        routeTemplateId: activityRouteGroups.routeTemplateId,
        groupKey: activityRouteGroups.groupKey,
        groupName: activityRouteGroups.groupName,
        sortOrder: activityRouteGroups.sortOrder,
      })
      .from(activityRouteGroups)
      .orderBy(asc(activityRouteGroups.sortOrder), asc(activityRouteGroups.id)),
    db
      .select({
        id: activityRouteItems.id,
        routeGroupId: activityRouteItems.routeGroupId,
        libraryActivityId: activityRouteItems.libraryActivityId,
        itemCode: activityRouteItems.itemCode,
        itemLabel: activityRouteItems.itemLabel,
        sortOrder: activityRouteItems.sortOrder,
      })
      .from(activityRouteItems)
      .orderBy(asc(activityRouteItems.sortOrder), asc(activityRouteItems.id)),
  ]);

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/90">
        <MyDayEmptyState
          iconType="inbox"
          title="Data aktivitas harian tidak ditemukan"
          description="Silakan hubungi administrator atau pastikan data karyawan Anda telah terdaftar aktif pada sistem."
        />
      </div>
    );
  }

  const itemsByGroupId = new Map<number, any[]>();
  for (const item of routeItemRows || []) {
    const list = itemsByGroupId.get(item.routeGroupId) || [];
    list.push(item);
    itemsByGroupId.set(item.routeGroupId, list);
  }

  const groupsByTemplateId = new Map<number, any[]>();
  for (const group of routeGroupRows || []) {
    const list = groupsByTemplateId.get(group.routeTemplateId) || [];
    list.push({
      id: group.id,
      groupName: group.groupName,
      items: itemsByGroupId.get(group.id) || [],
    });
    groupsByTemplateId.set(group.routeTemplateId, list);
  }

  const availableRouteFolders: RouteFolder[] = (routeTemplateRows || [])
    .map((t) => ({
      id: t.id,
      routeCode: t.routeCode,
      routeName: t.routeName,
      groups: groupsByTemplateId.get(t.id) || [],
    }))
    .filter((t) => t.groups.length > 0);

  const sectionHeadMap: Record<string, number | null> = {};
  for (const s of rawSections || []) {
    if (s?.id) sectionHeadMap[String(s.id)] = s.headEmployeeId || null;
  }

  const deptHeadMap: Record<string, number | null> = {};
  for (const d of rawDepts || []) {
    if (d?.id) deptHeadMap[String(d.id)] = d.headEmployeeId || null;
  }

  const modalEmployees = (rawEmployees || []).map((e) => ({
    id: Number(e.id),
    name: e.name || "",
    employeeId: e.employeeId || "",
    email: e.email || "",
    jobTitle: e.jobTitle || "",
    department: e.department || "",
    section: e.section || "",
    siteId: e.siteId ? Number(e.siteId) : null,
    directManagerId: e.directManagerId ? Number(e.directManagerId) : null,
    sectionId: e.sectionId ? Number(e.sectionId) : null,
    departmentId: e.departmentId ? Number(e.departmentId) : null,
  }));

  const accessibleModalEmployees = modalEmployees.filter((employee) => {
    if (permission.dataScope === "global") return true;
    if (permission.dataScope === "site") return employee.siteId === data.employee.siteId;
    return employee.id === data.employee.id;
  });

  const modalSites = (rawSites || []).map((s) => ({
    id: Number(s.id),
    name: s.name || "",
    location: s.location || "",
  }));

  const permittedSectionIds = new Set(
    (permission.dataScope === "site"
      ? accessibleModalEmployees
      : permission.dataScope === "global" && Number.isFinite(requestedSiteId)
        ? modalEmployees.filter((employee) => employee.siteId === requestedSiteId)
        : modalEmployees)
      .filter((employee) => {
        if (permission.dataScope === "site") return employee.siteId === data.employee.siteId;
        if (permission.dataScope === "global" && Number.isFinite(requestedSiteId)) {
          return employee.siteId === requestedSiteId;
        }
        return true;
      })
      .map((employee) => employee.sectionId)
      .filter((sectionId): sectionId is number => sectionId != null)
  );

  const filterSections = (rawSections || []).filter(
    (section) => section.isActive && permittedSectionIds.has(Number(section.id))
  );

  const modalPresets = (rawPresets || []).map((p) => ({
    id: Number(p.id),
    code: p.code || "",
    name: p.name || "",
    basePoints: Number(p.basePoints) || 0,
    category: p.category || null,
    requiresPhoto: Boolean(p.requiresPhoto),
    requiresEquipmentNo: Boolean(p.requiresEquipmentNo),
    requiresDuration: Boolean(p.requiresDuration),
    requiresLocationGps: Boolean(p.requiresLocationGps),
    requiresTireCount: Boolean(p.requiresTireCount),
    requiresMaterialUsed: Boolean(p.requiresMaterialUsed),
  }));

  const assignmentStatuses: string[] = Array.from(
    new Set<string>(data.assignments.map((assignment: any) => String(assignment.statusLabel || "")))
  ).sort();
  const assignmentPriorities: string[] = Array.from(
    new Set<string>(data.assignments.map((assignment: any) => String(assignment.priority || "")))
  ).sort();
  const activityStatuses: string[] = Array.from(
    new Set<string>(data.activities.map((activity: any) => String(activity.statusLabel || "")))
  ).sort();
  const activitySources: string[] = Array.from(
    new Set<string>(data.activities.map((activity: any) => String(activity.sourceMode || "")))
  ).sort();
  const penaltyStatuses: string[] = Array.from(
    new Set<string>(data.penalties.map((penalty: any) => String(penalty.disputeStatus || "")))
  ).sort();

  const defaultTab = "activity-log";
  const pendingActivitiesCount = data.activities.filter((activity: any) =>
    String(activity.statusLabel || "").toLowerCase().includes("pending")
  ).length;

  return (
    <div className="space-y-4">
      {/* 1. Header Bar (Minimalist, Compact) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-0.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              History Aktivitas Harian Saya
            </h2>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <MapPin className="size-3 text-slate-400" />
              {data.site?.name ?? "Site"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Sun className="size-3 text-slate-400" />
              {data.summary.shift}
            </span>
            {data.summary.activeModifier ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                <Sparkles className="size-3 text-indigo-500" />
                {data.summary.activeModifier}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Riwayat pengerjaan, verifikasi lapangan, dan proses approval aktivitas harian Anda.
          </p>
        </div>

        <MyDayActivityCreateTrigger
          employees={accessibleModalEmployees}
          sites={modalSites}
          activityPresets={modalPresets}
          routeFolders={availableRouteFolders}
          sectionHeadMap={sectionHeadMap}
          deptHeadMap={deptHeadMap}
          currentEmployeeId={data.employee.id}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs px-3.5 py-1.5 rounded-lg text-xs font-semibold gap-1.5"
          label="+ Tambah Aktivitas"
        />
      </div>

      {/* 2. Stat Cards Grid (4 Kolom Responsive) */}
      <MyDayStatCards
        jobsCompleted={data.summary.jobsCompleted}
        jobsAssigned={data.summary.jobsAssigned}
        pointsToday={data.summary.pointsToday}
        pendingApprovalCount={pendingActivitiesCount}
        penaltyToday={data.summary.penaltyToday}
      />

      {/* 3. Route Checklist Aktif */}
      {data.routeChecklist ? (
        <MyDayRouteChecklist routeChecklist={data.routeChecklist} />
      ) : null}

      {/* 4. Filter Bar Horizontal */}
      {canMonitor ? (
        <MyDayFilterBar
          viewScope={viewScope}
          dataScope={permission.dataScope}
          requestedSiteId={requestedSiteId}
          requestedSectionId={requestedSectionId}
          sites={modalSites}
          sections={filterSections}
        />
      ) : null}

      {/* 5. Sub-Tabs Konten Data */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="inline-flex h-auto w-full flex-wrap items-center justify-start gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5 dark:border-slate-800 dark:bg-slate-900/80">
          {data.assignments.length > 0 ? (
            <TabsTrigger
              value="jobs"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <ListTodo className="size-3.5" />
              <span>Antrean tugas</span>
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] font-bold">
                {data.assignments.length}
              </Badge>
            </TabsTrigger>
          ) : null}

          <TabsTrigger
            value="activity-log"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
          >
            <ActivityIcon className="size-3.5" />
            <span>History Aktivitas</span>
            {data.activities.length > 0 ? (
              <Badge className="rounded-full bg-blue-600 px-2 py-0 text-[10px] font-bold text-white hover:bg-blue-700">
                {data.activities.length}
              </Badge>
            ) : null}
          </TabsTrigger>

          {canMonitor && teamData?.hasSubordinates ? (
            <TabsTrigger
              value="team-activity"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <Users className="size-3.5" />
              <span>Aktivitas Tim</span>
            </TabsTrigger>
          ) : null}

          <TabsTrigger
            value="points"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
          >
            <Sparkles className="size-3.5" />
            <span>Feed poin</span>
          </TabsTrigger>

          <TabsTrigger
            value="penalties"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
          >
            <ShieldAlert className="size-3.5" />
            <span>Audit penalty</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Antrean Tugas */}
        {data.assignments.length > 0 ? (
          <TabsContent value="jobs" className="space-y-4">
            <Card className="rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <MinimalTableShell
                  title="Antrean Tugas"
                  label="assignments"
                  fileName="my-day-assignments"
                  showImport={false}
                  searchPlaceholder="Cari tugas, prioritas, PIC..."
                  filters={
                    <>
                      <SelectFilter filterKey="status" placeholder="Semua status" options={assignmentStatuses} />
                      <SelectFilter filterKey="priority" placeholder="Semua prioritas" options={assignmentPriorities} />
                      <SelectFilter filterKey="mandatory" placeholder="Kewajiban" options={["yes", "optional"]} />
                    </>
                  }
                  presets={
                    <TableFilterPresets
                      presets={[
                        { label: "Prioritas tinggi", filters: { priority: "High" } },
                        { label: "Wajib", filters: { mandatory: "yes" } },
                      ]}
                    />
                  }
                >
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                        <TableRow className="border-b border-slate-200 dark:border-slate-700">
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Activity
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Status
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Priority
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Deadline
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            PIC
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Mandatory
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.assignments.length > 0 ? (
                          data.assignments.map((assignment) => (
                            <TableRow
                              key={assignment.id}
                              data-date-value={(assignment.deadline ?? assignment.createdAt).toISOString()}
                              data-filter-status={assignment.statusLabel}
                              data-filter-priority={assignment.priority}
                              data-filter-mandatory={assignment.isMandatory ? "yes" : "optional"}
                              className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/50"
                            >
                              <TableCell className="align-top py-3.5">
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {(assignment.activityName ?? assignment.customJobName) || "Custom assignment"}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {assignment.activityCode ?? "Custom"} • {assignment.category ?? assignment.assignmentType}
                                  </p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500">
                                    {assignment.notes || "Tanpa catatan tambahan."}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="align-top py-3.5">
                                <Badge className={`rounded-full px-2.5 py-0.5 text-xs ${statusBadgeClass(assignment.statusLabel)}`}>
                                  {assignment.statusLabel}
                                </Badge>
                              </TableCell>
                              <TableCell className="align-top py-3.5">
                                <div className="text-xs">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200">{assignment.priority}</p>
                                  <p className="text-slate-400 dark:text-slate-500">{assignment.durationLabel}</p>
                                </div>
                              </TableCell>
                              <TableCell className="align-top py-3.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                {assignment.deadline
                                  ? assignment.deadline.toLocaleString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "-"}
                              </TableCell>
                              <TableCell className="align-top py-3.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                {assignment.assignedByName}
                              </TableCell>
                              <TableCell className="align-top py-3.5">
                                <Badge variant="outline" className="rounded-md text-[11px] font-medium">
                                  {assignment.isMandatory ? "Wajib" : "Opsional"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8">
                              <MyDayEmptyState
                                iconType="jobs"
                                title="Belum ada antrean tugas"
                                description="Foreman belum memberikan tugas khusus untuk shift hari ini."
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </MinimalTableShell>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {/* Tab 2: Log Aktivitas */}
        <TabsContent value="activity-log">
          <Card className="rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <MinimalTableShell
                title="History Aktivitas Harian"
                label="aktivitas"
                fileName="history-aktivitas-harian"
                showImport={false}
                searchPlaceholder="Cari aktivitas, PIC approval, status, atau unit..."
                filters={
                  <>
                    <SelectFilter filterKey="status" placeholder="Semua status" options={activityStatuses} />
                    <SelectFilter filterKey="source" placeholder="Semua sumber" options={activitySources} />
                  </>
                }
                presets={
                  <TableFilterPresets
                    presets={[
                      { label: "Menunggu approval", filters: { status: "Pending" } },
                      { label: "Sudah disetujui", filters: { status: "Approved" } },
                      { label: "Self input", filters: { source: "self_input" } },
                    ]}
                  />
                }
              >
                <MyDayActivityLogTable
                  activities={data.activities}
                  employee={data.employee}
                  site={data.site}
                  emptyAction={
                    <MyDayActivityCreateTrigger
                      employees={accessibleModalEmployees}
                      sites={modalSites}
                      activityPresets={modalPresets}
                      routeFolders={availableRouteFolders}
                      sectionHeadMap={sectionHeadMap}
                      deptHeadMap={deptHeadMap}
                      currentEmployeeId={data.employee.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2"
                      label="Tambah Aktivitas Sekarang"
                    />
                  }
                />
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Aktivitas Tim */}
        {canMonitor && teamData?.hasSubordinates ? (
          <TabsContent value="team-activity">
            <Card className="rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Aktivitas Tim</h3>
                  <Button asChild variant="outline" size="sm" className="rounded-lg border-slate-200 dark:border-slate-700 text-xs font-medium">
                    <Link href="/dashboard/activity-hub/team-board">
                      Monitoring Tim & SPL
                    </Link>
                  </Button>
                </div>

                <ActivityTeamLogPanel
                  groups={teamData.activityGroups}
                  emptyMessage="Belum ada aktivitas tercatat dari bawahan Anda hari ini."
                />
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {/* Tab 4: Feed Poin */}
        <TabsContent value="points">
          <Card className="rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <MinimalTableShell
                title="Feed Poin"
                label="point events"
                fileName="my-day-point-feed"
                showImport={false}
                searchPlaceholder="Cari event, kategori..."
              >
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                      <TableRow className="border-b border-slate-200 dark:border-slate-700">
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Event
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Category
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Date & Time
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Points
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.pointsFeed.length > 0 ? (
                        data.pointsFeed.map((event) => (
                          <TableRow
                            key={event.id}
                            data-date-value={event.createdAt.toISOString()}
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/50"
                          >
                            <TableCell className="align-top py-3.5 font-semibold text-xs text-slate-900 dark:text-white">
                              {event.label}
                            </TableCell>
                            <TableCell className="align-top py-3.5 text-xs text-slate-600 dark:text-slate-400">
                              <Badge variant="outline" className="rounded-md font-medium text-[11px]">
                                {event.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-top py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {event.createdAt.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="align-top py-3.5">
                              <Badge
                                className={
                                  event.points >= 0
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50 font-bold text-xs"
                                    : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50 font-bold text-xs"
                                }
                              >
                                {event.points >= 0 ? "+" : ""}
                                {event.points} pts
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8">
                            <MyDayEmptyState
                              iconType="points"
                              title="Belum ada riwayat poin hari ini"
                              description="Poin akan masuk secara otomatis setelah aktivitas disetujui atasan."
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Audit Penalty */}
        <TabsContent value="penalties">
          <Card className="rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <MinimalTableShell
                title="Audit Penalty"
                label="penalties"
                fileName="my-day-penalties"
                showImport={false}
                searchPlaceholder="Cari kode penalty, tipe, alasan..."
                filters={
                  <SelectFilter filterKey="dispute" placeholder="Semua status dispute" options={penaltyStatuses} />
                }
                presets={
                  <TableFilterPresets
                    presets={[
                      { label: "Dispute aktif", filters: { dispute: "in_review" } },
                      { label: "Belum diajukan", filters: { dispute: "not_disputed" } },
                    ]}
                  />
                }
              >
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                      <TableRow className="border-b border-slate-200 dark:border-slate-700">
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Penalty
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Waktu
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Potongan
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Status Dispute
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Aksi
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.penalties.length > 0 ? (
                        data.penalties.map((penalty) => (
                          <TableRow
                            key={penalty.id}
                            data-date-value={penalty.createdAt.toISOString()}
                            data-filter-dispute={penalty.disputeStatus}
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/50"
                          >
                            <TableCell className="align-top py-3.5">
                              <div className="space-y-1">
                                <p className="font-semibold text-xs text-slate-900 dark:text-white">
                                  {penalty.penaltyCode} • {penalty.penaltyType}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{penalty.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {penalty.createdAt.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="align-top py-3.5">
                              <Badge className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50 font-bold text-xs">
                                -{penalty.pointsDeducted} pts
                              </Badge>
                            </TableCell>
                            <TableCell className="align-top py-3.5">
                              <Badge className={`rounded-full px-2.5 py-0.5 text-xs ${statusBadgeClass(penalty.disputeStatus)}`}>
                                {penalty.disputeStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-top py-3.5">
                              {penalty.isDisputed ? (
                                <Badge variant="outline" className="rounded-md text-[11px] font-medium text-slate-500">
                                  Sudah disputed
                                </Badge>
                              ) : (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="rounded-xl border-rose-200 bg-rose-50/60 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                                      <ShieldAlert className="size-3.5 mr-1" />
                                      Ajukan dispute
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-lg rounded-2xl">
                                    <DialogHeader>
                                      <DialogTitle className="text-lg font-bold">Ajukan Dispute Penalty</DialogTitle>
                                      <DialogDescription className="text-xs text-slate-500">
                                        Jelaskan kronologi kendala teknis/lapangan serta bukti pendukung agar pemotongan poin dapat ditinjau ulang oleh atasan.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <form action={submitPointDisputeAction} className="grid gap-4 mt-2">
                                      <input type="hidden" name="penaltyEventId" value={penalty.id} />
                                      <input type="hidden" name="employeeId" value={data.employee.id} />
                                      <div className="space-y-1.5">
                                        <Label htmlFor="dispute-reason" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                          Alasan dispute & kronologi kendala
                                        </Label>
                                        <Textarea
                                          id="dispute-reason"
                                          name="reason"
                                          rows={4}
                                          placeholder="Jelaskan alasan kronologi kendala sinyal site atau bukti verifikasi (minimal 20 karakter)..."
                                          required
                                          minLength={20}
                                          className="rounded-xl text-xs"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label htmlFor="dispute-evidence" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                          URL Bukti pendukung (opsional)
                                        </Label>
                                        <Input
                                          id="dispute-evidence"
                                          name="evidenceUrls"
                                          placeholder="URL foto/dokumen/berita acara, pisahkan dengan koma jika lebih dari satu"
                                          className="rounded-xl text-xs"
                                        />
                                      </div>
                                      <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5">
                                        Kirim Pengajuan Dispute
                                      </Button>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8">
                            <MyDayEmptyState
                              iconType="penalty"
                              title="Tidak ada catatan penalty"
                              description="Seluruh pekerjaan Anda tercatat dengan tertib tanpa ada pemotongan poin hari ini."
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
