import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, Flame, ListTodo, MapPinned, ShieldAlert, Sparkles, Trophy } from "lucide-react";
import { submitDailyActivityAction, submitPointDisputeAction } from "@/app/dashboard/activity-hub/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";

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

export default async function MyDayPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityEmployeeData(session.user.email);

  if (!data) {
    return null;
  }

  const now = new Date();
  const defaultStart = new Date(now.getTime() - 90 * 60 * 1000);

  return (
    <div className="space-y-5">
      <Card className="rounded-[1.5rem]">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">My Day Workspace</Badge>
              <Badge variant="outline">{data.site?.name ?? "Site"}</Badge>
              <Badge variant="outline">Shift {data.summary.shift}</Badge>
              {data.summary.activeModifier ? (
                <Badge className="border-0 bg-amber-100 text-amber-900">{data.summary.activeModifier}</Badge>
              ) : null}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl">Daily Activity Ringkas dan Fokus ke Table</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Halaman kerja harian sekarang dipusatkan ke queue assignment, log aktivitas, point feed, dan penalty
                audit. Input aktivitas dipindah ke modal supaya area utama tetap bersih dan cepat dipindai.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Job list" value={`${data.summary.jobsCompleted}/${data.summary.jobsAssigned}`} />
              <MetricPill label="Poin hari ini" value={data.summary.pointsToday} />
              <MetricPill label="Streak" value={`${data.summary.streakDays} hari`} />
              <MetricPill label="Penalty" value={`-${data.summary.penaltyToday}`} />
              <MetricPill label="Level" value={data.summary.currentLevel} />
              <MetricPill label="Sync" value={data.summary.syncAt} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <Sparkles className="size-4" />
                  Submit Activity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Submit Daily Activity</DialogTitle>
                  <DialogDescription>
                    Form tetap lengkap, tapi sekarang dibuka sebagai modal supaya halaman utama tetap fokus ke data.
                  </DialogDescription>
                </DialogHeader>
                <form action={submitDailyActivityAction} className="space-y-4">
                  <input type="hidden" name="employeeId" value={data.employee.id} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Label className="grid gap-2">
                      Source mode
                      <select
                        name="sourceMode"
                        defaultValue="assigned"
                        className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        <option value="assigned">Assigned activity</option>
                        <option value="self_input">Self-input activity</option>
                        <option value="custom">Custom activity</option>
                      </select>
                    </Label>
                    <Label className="grid gap-2">
                      Assignment
                      <select
                        name="assignmentId"
                        defaultValue={data.assignments[0]?.id ? `${data.assignments[0].id}` : ""}
                        className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Pilih assignment</option>
                        {data.assignments.map((assignment) => (
                          <option key={assignment.id} value={assignment.id}>
                            {assignment.activityName ?? assignment.customJobName}
                          </option>
                        ))}
                      </select>
                    </Label>
                    <Label className="grid gap-2">
                      Library activity
                      <select
                        name="libraryActivityId"
                        defaultValue={data.availableLibrary[0]?.id ? `${data.availableLibrary[0].id}` : ""}
                        className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Pilih activity library</option>
                        {data.availableLibrary.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.activityCode} - {item.activityName}
                          </option>
                        ))}
                      </select>
                    </Label>
                    <Label className="grid gap-2">
                      Equipment / unit no.
                      <Input name="equipmentNo" placeholder="Contoh: DT-451 / BAY-03" />
                    </Label>
                    <Label className="grid gap-2">
                      Start time
                      <Input name="startTime" type="datetime-local" defaultValue={dateTimeLocalValue(defaultStart)} />
                    </Label>
                    <Label className="grid gap-2">
                      End time
                      <Input name="endTime" type="datetime-local" defaultValue={dateTimeLocalValue(now)} />
                    </Label>
                    <Label className="grid gap-2">
                      GPS lat
                      <Input name="gpsLat" placeholder="-0.9123" />
                    </Label>
                    <Label className="grid gap-2">
                      GPS lng
                      <Input name="gpsLng" placeholder="119.8761" />
                    </Label>
                  </div>

                  <Label className="grid gap-2">
                    Material used
                    <Input name="materialUsed" placeholder="Contoh: patch kit, grease, torque wrench" />
                  </Label>

                  <Label className="grid gap-2">
                    Custom activity name
                    <Input name="customActivityName" placeholder="Isi jika memilih custom activity" />
                  </Label>

                  <Label className="grid gap-2">
                    Custom activity description
                    <Textarea
                      name="customActivityDescription"
                      rows={4}
                      placeholder="Jelaskan aktivitas custom minimal 80 karakter bila pekerjaan belum ada di library."
                    />
                  </Label>

                  <Label className="grid gap-2">
                    Notes / hasil kerja
                    <Textarea
                      name="notes"
                      rows={4}
                      placeholder="Ringkas apa yang dikerjakan, hasilnya, kendala, dan bukti penting."
                    />
                  </Label>

                  <Label className="grid gap-2">
                    Photo URL
                    <Input
                      name="photoUrl"
                      placeholder="https://... untuk simulasi upload dokumentasi"
                      defaultValue="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"
                    />
                  </Label>

                  <Label className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
                    <input type="checkbox" name="gpsValid" defaultChecked />
                    Tandai GPS valid di dalam radius site
                  </Label>

                  <Button type="submit" className="w-full rounded-2xl">
                    Kirim aktivitas
                  </Button>
                </form>
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
      </Card>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="jobs">Job Queue</TabsTrigger>
          <TabsTrigger value="activity-log">Activity Log</TabsTrigger>
          <TabsTrigger value="points">Point Feed</TabsTrigger>
          <TabsTrigger value="penalties">Penalty Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Job List Hari Ini"
                description="Assignment aktif dipindah ke table utama supaya lebih cepat dicari, difilter, dan diexport."
                label="assignments"
                fileName="my-day-assignments"
                searchPlaceholder="Cari assignment, activity, prioritas, atau PIC..."
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
                title="Library Self-Input"
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
                              {item.requiresPhoto ? <Badge variant="outline">Photo</Badge> : null}
                              {item.requiresEquipmentNo ? <Badge variant="outline">Equipment</Badge> : null}
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
                title="Aktivitas Terkirim Hari Ini"
                description="Log submit harian berikut status approval, durasi, dan dampak poin."
                label="activities"
                fileName="my-day-activity-log"
                searchPlaceholder="Cari aktivitas, status, submission, atau unit..."
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
                        <TableRow key={activity.id} data-date-value={activity.startTime.toISOString()}>
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

        <TabsContent value="points">
          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Point Feed"
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
                title="Penalty dan Dispute"
                description="Audit penalty harian dengan action modal untuk pengajuan dispute."
                label="penalties"
                fileName="my-day-penalties"
                searchPlaceholder="Cari kode penalty, type, alasan, atau status dispute..."
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
                        <TableRow key={penalty.id} data-date-value={penalty.createdAt.toISOString()}>
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
