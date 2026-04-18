import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, Clock3, Flame, ListTodo, MapPinned, ShieldAlert, Sparkles, Trophy } from "lucide-react";
import { submitDailyActivityAction } from "@/app/dashboard/activity-hub/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[1.8rem] border-0 bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_52%,#052e2b_100%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-white/15 text-white">
                Daily Activity System
              </Badge>
              {data.summary.activeModifier ? (
                <Badge className="border-0 bg-amber-300/20 text-amber-100">
                  {data.summary.activeModifier}
                </Badge>
              ) : null}
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{data.site?.name ?? "Site"}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Tampilan karyawan untuk melihat job list hari ini, submit aktivitas dari lapangan,
                dan memantau dampaknya ke poin serta streak secara real-time.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/65">Shift</p>
                <p className="mt-2 text-lg font-semibold">{data.summary.shift}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/65">Job List</p>
                <p className="mt-2 text-lg font-semibold">
                  {data.summary.jobsCompleted}/{data.summary.jobsAssigned}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/65">Poin Hari Ini</p>
                <p className="mt-2 text-lg font-semibold">{data.summary.pointsToday}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/65">Streak</p>
                <p className="mt-2 text-lg font-semibold">{data.summary.streakDays} hari</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Card className="rounded-[1.4rem] border-0 bg-white/10 text-white shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="size-4" />
                  Hero Points Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Level saat ini</span>
                  <span className="font-semibold">{data.summary.currentLevel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Penalty hari ini</span>
                  <span className="font-semibold">-{data.summary.penaltyToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Sync terakhir</span>
                  <span className="font-semibold">{data.summary.syncAt}</span>
                </div>
                <Button asChild variant="secondary" className="w-full rounded-2xl">
                  <Link href="/dashboard/leaderboard">Buka leaderboard & point log</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[1.4rem] border-0 bg-white/10 text-white shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="size-4" />
                  Disiplin Pelaporan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-white/70">
                  Submit sebelum 12.00 dapat bonus pagi. Setelah 17.00, sistem mulai mengenakan penalty otomatis.
                </p>
                <div className="grid gap-2 text-xs text-white/80">
                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                    <span>On-time morning</span>
                    <span>+5 bonus</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                    <span>Late minor</span>
                    <span>-2</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                    <span>Late major</span>
                    <span>-5</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="size-5 text-primary" />
                Job List Hari Ini
              </CardTitle>
              <CardDescription>
                Assignment dari foreman atau section head yang sudah masuk ke queue kerja Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.assignments.length > 0 ? (
                data.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-[1.2rem] border border-border/70 bg-muted/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {assignment.activityCode ?? "Custom"} • {assignment.category ?? assignment.assignmentType}
                        </p>
                        <h3 className="text-base font-semibold text-foreground">
                          {(assignment.activityName ?? assignment.customJobName) || "Custom assignment"}
                        </h3>
                        <p className="text-sm text-muted-foreground">{assignment.notes || "Tanpa catatan tambahan."}</p>
                      </div>
                      <Badge className={statusBadgeClass(assignment.statusLabel)}>
                        {assignment.statusLabel}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Prioritas</p>
                        <p className="font-medium">{assignment.priority}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Durasi</p>
                        <p className="font-medium">{assignment.durationLabel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">PIC</p>
                        <p className="font-medium">{assignment.assignedByName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Wajib</p>
                        <p className="font-medium">{assignment.isMandatory ? "Ya" : "Opsional"}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Belum ada assignment untuk hari ini.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Aktivitas Tersedia untuk Self-Input
              </CardTitle>
              <CardDescription>
                Library aktivitas aktif yang bisa Anda input sendiri tanpa menunggu assignment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {data.availableLibrary.map((item) => (
                  <div key={item.id} className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {item.activityCode} • {item.category}
                        </p>
                        <h3 className="mt-1 font-semibold">{item.activityName}</h3>
                      </div>
                      <Badge variant="outline">{item.basePoints} pts</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">Complexity {item.complexityLevel}</Badge>
                      {item.requiresPhoto ? <Badge variant="secondary">Photo</Badge> : null}
                      {item.requiresEquipmentNo ? <Badge variant="secondary">Equipment</Badge> : null}
                      {item.requiresMaterialUsed ? <Badge variant="secondary">Material</Badge> : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle>Aktivitas Terkirim Hari Ini</CardTitle>
              <CardDescription>
                Riwayat aktivitas yang sudah Anda submit hari ini beserta status approval dan dampaknya ke poin.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableRow key={activity.id}>
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle>Submit Daily Activity</CardTitle>
              <CardDescription>
                Form cepat untuk assigned activity, self-input, maupun custom activity langsung dari lapangan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={submitDailyActivityAction} className="space-y-4">
                <input type="hidden" name="employeeId" value={data.employee.id} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Label className="grid gap-2">
                    Source mode
                    <select
                      name="sourceMode"
                      defaultValue="assigned"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
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
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
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
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
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

                <Label className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-3 text-sm">
                  <input type="checkbox" name="gpsValid" defaultChecked />
                  Tandai GPS valid di dalam radius site
                </Label>

                <Button type="submit" className="w-full rounded-2xl">
                  Kirim aktivitas
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="size-5 text-primary" />
                Point Feed
              </CardTitle>
              <CardDescription>Log perubahan poin terbaru untuk akun Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.pointsFeed.map((event) => (
                <div key={event.id} className="rounded-[1.1rem] border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{event.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.category} • {event.createdAt.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <Badge className={event.points >= 0 ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}>
                      {event.points >= 0 ? "+" : ""}
                      {event.points}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-5 text-primary" />
                Penalty & Dispute
              </CardTitle>
              <CardDescription>
                Audit penalty otomatis yang memengaruhi skor harian Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.penalties.length > 0 ? (
                data.penalties.map((penalty) => (
                  <div key={penalty.id} className="rounded-[1.1rem] border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {penalty.penaltyCode} • {penalty.penaltyType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {penalty.createdAt.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <Badge className="bg-rose-100 text-rose-900">-{penalty.pointsDeducted}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{penalty.description}</p>
                    {penalty.isDisputed ? (
                      <Badge variant="outline" className="mt-3">
                        Dispute {penalty.disputeStatus}
                      </Badge>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.1rem] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Belum ada penalty terbaru.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
