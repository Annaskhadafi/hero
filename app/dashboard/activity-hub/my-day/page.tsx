import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, FileSignature, ListChecks, MapPinned, ShieldAlert, Sparkles, Trophy } from "lucide-react";
import {
  submitDailyActivityWithStateAction,
  submitPointDisputeAction,
} from "@/app/dashboard/activity-hub/actions";
import { ActivityTeamLogPanel } from "@/components/activity-team-log-panel";
import { DailyActivitySubmitForm } from "@/components/daily-activity-submit-form";
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
import { getDailyActivityEmployeeData, getDailyActivityTeamBoardData } from "@/lib/daily-activity";

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("approved")) {
    return "bg-emerald-100 text-emerald-900";
  }

  if (normalized.includes("pending")) {
    return "bg-amber-100 text-amber-900";
  }

  if (normalized.includes("reject")) {
    return "bg-rose-100 text-rose-900";
  }

  return "bg-slate-100 text-slate-800";
}

function dateTimeLocalValue(reference: Date) {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-full bg-surface-container-low px-4 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2 font-semibold text-foreground">{value}</span>
    </div>
  );
}

function WorkspaceTabBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className="rounded-full px-3 py-1 text-[0.68rem]">
      {value}
    </Badge>
  );
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
      className="h-9 rounded-xl border-0 bg-surface-container-lowest px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
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

export default async function MyDayPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const [data, teamData] = await Promise.all([
    getDailyActivityEmployeeData(session.user.email),
    getDailyActivityTeamBoardData(session.user.email),
  ]);

  if (!data) {
    return null;
  }

  const now = new Date();
  const defaultDateTime = dateTimeLocalValue(now);
  const assignmentStatuses = Array.from(new Set(data.assignments.map((assignment) => assignment.statusLabel))).sort();
  const assignmentPriorities = Array.from(new Set(data.assignments.map((assignment) => assignment.priority))).sort();
  const activityStatuses = Array.from(new Set(data.activities.map((activity) => activity.statusLabel))).sort();
  const activitySources = Array.from(new Set(data.activities.map((activity) => activity.sourceMode))).sort();
  const penaltyStatuses = Array.from(new Set(data.penalties.map((penalty) => penalty.disputeStatus))).sort();

  return (
    <div className="space-y-5">
      <Card className="rounded-[1.5rem] border-0 shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Workspace Aktivitas Harian</Badge>
              <Badge variant="outline">{data.site?.name ?? "Site"}</Badge>
              <Badge variant="outline">Shift {data.summary.shift}</Badge>
              {data.summary.activeModifier ? (
                <Badge className="border-0 bg-amber-100 text-amber-900">{data.summary.activeModifier}</Badge>
              ) : null}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl">Checklist Harian, Aktivitas, dan Feed Poin</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Workspace harian untuk cek assignment yang harus dikerjakan, submit aktivitas, lalu pantau status approval,
                poin, dan penalty tanpa pindah halaman.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Job list" value={`${data.summary.jobsCompleted}/${data.summary.jobsAssigned}`} />
              <MetricPill label="Poin hari ini" value={data.summary.pointsToday} />
              <MetricPill
                label="Pending approval"
                value={data.activities.filter((activity) => activity.statusLabel.toLowerCase().includes("pending")).length}
              />
              <MetricPill label="Penalty" value={`-${data.summary.penaltyToday}`} />
              <MetricPill label="Sync" value={data.summary.syncAt} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <Sparkles className="size-4" />
                  Submit aktivitas
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Submit aktivitas harian</DialogTitle>
                  <DialogDescription>
                    Form tetap lengkap, tapi sekarang dibuka sebagai modal supaya halaman utama tetap fokus ke data.
                  </DialogDescription>
                </DialogHeader>
                <DailyActivitySubmitForm
                  action={submitDailyActivityWithStateAction}
                  employeeId={data.employee.id}
                  assignments={data.assignments}
                  availableLibrary={data.availableLibrary}
                  defaultStartTime={defaultDateTime}
                  defaultEndTime={defaultDateTime}
                  defaultSourceMode="assigned"
                  routeChecklist={data.routeChecklist}
                />
              </DialogContent>
            </Dialog>

            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard/leaderboard">
                <Trophy className="size-4" />
                Buka leaderboard
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <WorkspaceTabBadge value="1. Cek assignment" />
            <WorkspaceTabBadge value="2. Submit activity" />
            <WorkspaceTabBadge value="3. Pantau status" />
            <WorkspaceTabBadge value="4. Review poin & penalty" />
          </div>
        </CardContent>
      </Card>

      {data.routeChecklist ? (
        <Card className="rounded-[1.4rem] border-0 shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{data.routeChecklist.routeCode}</Badge>
                  <Badge variant="outline">{data.routeChecklist.shiftCode}</Badge>
                  <Badge variant="outline">{data.routeChecklist.sectionName ?? "Semua section"}</Badge>
                  <Badge variant="outline">{data.routeChecklist.positionName ?? "Semua jabatan"}</Badge>
                  {data.routeChecklist.activeSpl ? <Badge variant="outline">{data.routeChecklist.activeSpl.splNumber}</Badge> : null}
                </div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ListChecks className="size-5 text-primary" />
                    Route checklist aktif
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-sm leading-6">
                    {data.routeChecklist.routeName}.{" "}
                    {data.routeChecklist.description || "Gunakan blok ini sebagai konteks kerja aktif untuk section dan jabatan Anda."}
                  </CardDescription>
                {data.routeChecklist.activeSpl ? (
                  <p className="text-sm font-medium text-[#486275]">
                    SPL aktif: {data.routeChecklist.activeSpl.title} • {data.routeChecklist.activeSpl.lineCount} line
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{data.routeChecklist.groupCount} group</Badge>
                <Badge variant="outline">{data.routeChecklist.itemCount} item</Badge>
                {data.routeChecklist.mobileEnabled ? <Badge variant="outline">Mobile ready</Badge> : null}
                {data.routeChecklist.sessionId ? (
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href={`/dashboard/activity-hub/document/${data.routeChecklist.sessionId}`}>
                      <FileSignature className="size-4" />
                      Dokumen user
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.routeChecklist.activeSpl ? (
              <div className="rounded-[1.1rem] bg-[#fff8e8] px-4 py-3 text-sm text-[#8a5a00]">
                <p className="font-semibold">{data.routeChecklist.activeSpl.splNumber}</p>
                <div className="mt-2 space-y-2">
                  {data.routeChecklist.activeSpl.items.map((item) => (
                    <div key={item.id}>
                      <p className="font-medium">{item.lineLabel}</p>
                      <p className="text-xs">{item.targetUnit || "-"} • {item.plannedPoints} pts</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-2">
              {data.routeChecklist.groups.map((group) => (
                <details
                  key={group.id}
                  className="rounded-[1.1rem] bg-surface-container-low px-4 py-3"
                  open={group.sortOrder === 1}
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">
                          {group.groupKey}
                        </p>
                        <p className="mt-1 text-base font-black text-[#082033]">{group.groupName}</p>
                        <p className="mt-1 text-sm text-[#486275]">{group.description || "Tanpa deskripsi group."}</p>
                      </div>
                      <Badge variant="outline">{group.items.length} item</Badge>
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <div key={item.id} className="rounded-xl bg-white px-4 py-3 shadow-[0_10px_22px_rgba(8,32,51,0.05)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                              {item.itemCode || item.libraryCode || "ROUTE ITEM"}
                            </p>
                            <p className="mt-1 font-semibold text-[#082033]">{item.itemLabel}</p>
                            <p className="mt-1 text-sm text-[#486275]">
                              {item.itemDescription || item.libraryName || "Tanpa deskripsi item."}
                            </p>
                          </div>
                          <Badge variant="outline">{item.pointOverride ?? item.libraryPoints ?? 0} pts</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="jobs">Antrean checklist</TabsTrigger>
          <TabsTrigger value="activity-log">Log aktivitas</TabsTrigger>
          {teamData?.hasSubordinates ? <TabsTrigger value="team-activity">Aktivitas Tim</TabsTrigger> : null}
          <TabsTrigger value="points">Feed poin</TabsTrigger>
          <TabsTrigger value="penalties">Audit penalty</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Antrean kerja hari ini"
                description="Mulai dari assignment yang wajib diselesaikan lebih dulu, lalu susun prioritas kerja dari tabel utama."
                label="assignments"
                fileName="my-day-assignments"
                searchPlaceholder="Cari assignment, activity, prioritas, atau PIC..."
                filters={<><SelectFilter filterKey="status" placeholder="Semua status" options={assignmentStatuses} /><SelectFilter filterKey="priority" placeholder="Semua prioritas" options={assignmentPriorities} /><SelectFilter filterKey="mandatory" placeholder="Semua kewajiban" options={["ya", "opsional"]} /></>}
                presets={<TableFilterPresets presets={[{ label: "Prioritas tinggi", filters: { priority: "High" } }, { label: "Wajib", filters: { mandatory: "ya" } }]} />}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aktivitas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioritas</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>PIC</TableHead>
                      <TableHead>Mandatory</TableHead>
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
                          data-filter-mandatory={assignment.isMandatory ? "ya" : "opsional"}
                        >
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {(assignment.activityName ?? assignment.customJobName) || "Custom assignment"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {assignment.activityCode ?? "Custom"} • {assignment.category ?? assignment.assignmentType}
                              </p>
                              <p className="text-xs text-muted-foreground">{assignment.notes || "Tanpa catatan tambahan."}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge className={statusBadgeClass(assignment.statusLabel)}>{assignment.statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="text-sm">
                              <p>{assignment.priority}</p>
                              <p className="text-xs text-muted-foreground">{assignment.durationLabel}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            {assignment.deadline
                              ? assignment.deadline.toLocaleString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="align-top">{assignment.assignedByName}</TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline">{assignment.isMandatory ? "Ya" : "Opsional"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Belum ada assignment untuk hari ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>

          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Library input mandiri"
                description="Pilihan aktivitas self-input ditampilkan sebagai table agar tidak memenuhi layar dengan card grid."
                label="library activities"
                fileName="my-day-library"
                searchPlaceholder="Cari activity code, nama activity, kategori, atau requirement..."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Validasi</TableHead>
                      <TableHead>SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.availableLibrary.length > 0 ? (
                      data.availableLibrary.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">{item.activityName}</p>
                              <p className="text-xs text-muted-foreground">{item.activityCode}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">{item.category}</TableCell>
                          <TableCell className="align-top">
                            <div className="text-sm">
                              <p>{item.basePoints} pts</p>
                              <p className="text-xs text-muted-foreground">Complexity {item.complexityLevel}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-2">
                              {item.requiresPhoto ? <Badge variant="outline">Foto</Badge> : null}
                              {item.requiresEquipmentNo ? <Badge variant="outline">Unit/alat</Badge> : null}
                              {item.requiresMaterialUsed ? <Badge variant="outline">Material</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">{item.slaHours} jam</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Belum ada library self-input yang aktif.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity-log">
          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Log aktivitas terkirim"
                description="Pantau aktivitas yang sudah masuk, status approval, dan dampak poin tanpa pindah ke halaman lain."
                label="activities"
                fileName="my-day-activity-log"
                searchPlaceholder="Cari aktivitas, status, submission, atau unit..."
                filters={<><SelectFilter filterKey="status" placeholder="Semua status" options={activityStatuses} /><SelectFilter filterKey="source" placeholder="Semua sumber" options={activitySources} /></>}
                presets={<TableFilterPresets presets={[{ label: "Pending approval", filters: { status: "Pending" } }, { label: "Self input", filters: { source: "self_input" } }]} />}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aktivitas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Durasi</TableHead>
                      <TableHead>Submission</TableHead>
                      <TableHead>Poin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.activities.length > 0 ? (
                      data.activities.map((activity) => (
                        <TableRow
                          key={activity.id}
                          data-date-value={activity.startTime.toISOString()}
                          data-filter-status={activity.statusLabel}
                          data-filter-source={activity.sourceMode}
                        >
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">{activity.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {activity.activityCode} • {activity.sourceMode} • {activity.unitNumber}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge className={statusBadgeClass(activity.statusLabel)}>{activity.statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="text-sm">
                              <p>{activity.durationLabel}</p>
                              <p className="text-xs text-muted-foreground">
                                <Clock3 className="mr-1 inline size-3.5" />
                                {activity.startTime.toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                -{" "}
                                {activity.endTime.toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="text-sm">
                              <p>{activity.submissionCategory}</p>
                              <p className="text-xs text-muted-foreground">
                                {activity.gpsValid ? (
                                  <>
                                    <MapPinned className="mr-1 inline size-3.5" />
                                    GPS valid
                                  </>
                                ) : (
                                  "GPS perlu review"
                                )}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="text-sm">
                              <p className="font-medium">+{activity.pointsAwarded}</p>
                              {activity.penaltyDeducted > 0 ? (
                                <p className="text-xs text-rose-700">Penalty -{activity.penaltyDeducted}</p>
                              ) : null}
                              <p className="text-xs text-muted-foreground">Net {activity.pointsNet}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Belum ada aktivitas yang disubmit hari ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        {teamData?.hasSubordinates ? (
          <TabsContent value="team-activity">
            <Card className="rounded-[1.4rem]">
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Aktivitas Bawahan</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Hanya bawahan yang terhubung ke atasan ini lewat struktur organisasi atau atasan langsung yang
                      tampil di sini. Group per nama, lalu per hari, dan bisa collapse.
                    </p>
                  </div>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/dashboard/activity-hub/team-board">Buka Team Board</Link>
                  </Button>
                </div>

                <ActivityTeamLogPanel
                  groups={teamData.activityGroups}
                  emptyMessage="Belum ada activity dari bawahan Anda hari ini."
                />
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="points">
          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Feed poin"
                description="Perubahan poin terbaru untuk akun Anda dalam bentuk audit table yang lebih mudah diurutkan."
                label="point events"
                fileName="my-day-point-feed"
                searchPlaceholder="Cari label, kategori, atau perubahan poin..."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Poin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pointsFeed.length > 0 ? (
                      data.pointsFeed.map((event) => (
                        <TableRow key={event.id} data-date-value={event.createdAt.toISOString()}>
                          <TableCell className="align-top font-medium">{event.label}</TableCell>
                          <TableCell className="align-top">{event.category}</TableCell>
                          <TableCell className="align-top">{event.createdAt.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="align-top">
                            <Badge className={event.points >= 0 ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}>
                              {event.points >= 0 ? "+" : ""}
                              {event.points}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          Belum ada perubahan poin terbaru.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penalties">
          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Penalty dan dispute"
                description="Audit penalty yang mempengaruhi poin hari ini, lalu ajukan dispute bila perlu klarifikasi."
                label="penalties"
                fileName="my-day-penalties"
                searchPlaceholder="Cari kode penalty, type, alasan, atau status dispute..."
                filters={<SelectFilter filterKey="dispute" placeholder="Semua status dispute" options={penaltyStatuses} />}
                presets={<TableFilterPresets presets={[{ label: "Dispute aktif", filters: { dispute: "in_review" } }, { label: "Belum diajukan", filters: { dispute: "not_disputed" } }]} />}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Poin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.penalties.length > 0 ? (
                      data.penalties.map((penalty) => (
                        <TableRow
                          key={penalty.id}
                          data-date-value={penalty.createdAt.toISOString()}
                          data-filter-dispute={penalty.disputeStatus}
                        >
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {penalty.penaltyCode} • {penalty.penaltyType}
                              </p>
                              <p className="text-xs text-muted-foreground">{penalty.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">{penalty.createdAt.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="align-top">
                            <Badge className="bg-rose-100 text-rose-900">-{penalty.pointsDeducted}</Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge className={statusBadgeClass(penalty.disputeStatus)}>{penalty.disputeStatus}</Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            {penalty.isDisputed ? (
                              <Badge variant="outline">Sudah disputed</Badge>
                            ) : (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="rounded-full">
                                    <ShieldAlert className="size-4" />
                                    Ajukan dispute
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Ajukan Dispute Penalty</DialogTitle>
                                    <DialogDescription>
                                      Jelaskan kronologi dan bukti pendukung agar audit penalty bisa direview.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <form action={submitPointDisputeAction} className="grid gap-4">
                                    <input type="hidden" name="penaltyEventId" value={penalty.id} />
                                    <input type="hidden" name="employeeId" value={data.employee.id} />
                                    <Label className="grid gap-2 text-sm">
                                      Alasan keberatan
                                      <Textarea
                                        name="reason"
                                        rows={4}
                                        placeholder="Jelaskan kronologi, kendala sinyal/site, atau alasan kenapa penalty perlu direview."
                                        required
                                        minLength={20}
                                      />
                                    </Label>
                                    <Label className="grid gap-2 text-sm">
                                      Bukti pendukung
                                      <Input
                                        name="evidenceUrls"
                                        placeholder="URL foto/chat/berita acara, pisahkan dengan koma bila lebih dari satu."
                                      />
                                    </Label>
                                    <Button type="submit" className="w-full rounded-xl">
                                      Kirim dispute
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
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Belum ada penalty terbaru.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


