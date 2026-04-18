import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCheck, ClipboardList, Clock3, Users2 } from "lucide-react";
import { manageJobAssignmentAction } from "@/app/dashboard/activity-hub/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityTeamBoardData } from "@/lib/daily-activity";

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("working")) {
    return "bg-emerald-100 text-emerald-900";
  }
  if (normalized.includes("review")) {
    return "bg-amber-100 text-amber-900";
  }
  if (normalized.includes("travel")) {
    return "bg-sky-100 text-sky-900";
  }

  return "bg-slate-100 text-slate-800";
}

function dateTimeLocalValue(reference: Date) {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function TeamBoardPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityTeamBoardData(session.user.email);

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[1.8rem] border-0 bg-[linear-gradient(135deg,#3f2b00_0%,#8a5a00_40%,#0f172a_100%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <Badge className="w-fit border-0 bg-white/15 text-white">Foreman / Team Board</Badge>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Daily Activity Command Center</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Satu layar untuk memantau manpower, memastikan assignment jalan, dan memotong bottleneck approval
                sebelum shift berakhir.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/65">Workers</p>
                <p className="mt-2 text-lg font-semibold">{data.summary.activeWorkers}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/65">Checked-in</p>
                <p className="mt-2 text-lg font-semibold">{data.summary.checkedIn}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/65">Pending Approval</p>
                <p className="mt-2 text-lg font-semibold">{data.summary.pendingApproval}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/65">Emergency</p>
                <p className="mt-2 text-lg font-semibold">{data.summary.emergencyJobs}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Card className="rounded-[1.4rem] border-0 bg-white/10 text-white shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Approval Pressure</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                  <span>Pending approval</span>
                  <span className="font-semibold">{data.summary.pendingApproval}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                  <span>Overdue assignments</span>
                  <span className="font-semibold">{data.summary.overdueAssignments}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                  <span>Overtime candidates</span>
                  <span className="font-semibold">{data.summary.overtimeCandidates}</span>
                </div>
                <Button asChild variant="secondary" className="mt-2 rounded-2xl">
                  <Link href="/dashboard/approval">Buka approval inbox</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[1.4rem] border-0 bg-white/10 text-white shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lead Operator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-semibold">{data.lead.name}</p>
                <p className="text-white/70">{data.lead.jobTitle || data.lead.role}</p>
                <p className="text-white/70">Scope team: {data.lead.department}</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" />
                Buat Job Assignment
              </CardTitle>
              <CardDescription>
                Foreman dapat membuat job list harian untuk anggota tim dari library aktivitas yang aktif.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={manageJobAssignmentAction} className="space-y-4">
                <input type="hidden" name="intent" value="create" />
                <input type="hidden" name="assignedByEmployeeId" value={data.lead.id} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Label className="grid gap-2">
                    Assign to
                    <select name="assignedToEmployeeId" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {data.team.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.jobTitle || member.role}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Label className="grid gap-2">
                    Site
                    <Input name="siteId" defaultValue={data.lead.siteId} />
                  </Label>
                  <Label className="grid gap-2">
                    Activity library
                    <select name="libraryActivityId" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {data.assignmentOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.activityCode} - {item.activityName}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Label className="grid gap-2">
                    Priority
                    <select name="priority" defaultValue="Normal" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </Label>
                  <Label className="grid gap-2">
                    Estimasi durasi (menit)
                    <Input name="estimatedDuration" type="number" defaultValue={90} />
                  </Label>
                  <Label className="grid gap-2">
                    Deadline
                    <Input name="deadline" type="datetime-local" defaultValue={dateTimeLocalValue(new Date(Date.now() + 4 * 60 * 60 * 1000))} />
                  </Label>
                </div>

                <Label className="grid gap-2">
                  Catatan job
                  <Textarea
                    name="notes"
                    rows={4}
                    placeholder="Instruksi singkat, area kerja, material, atau perhatian keselamatan."
                  />
                </Label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Label className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-3 text-sm">
                    <input type="checkbox" name="isMandatory" />
                    Jadikan mandatory activity
                  </Label>
                  <Label className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-3 text-sm">
                    <input type="checkbox" name="isRecurring" />
                    Tandai recurring assignment
                  </Label>
                </div>

                <Button type="submit" className="w-full rounded-2xl">
                  Buat assignment
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="size-5 text-primary" />
                Status Tim Lapangan
              </CardTitle>
              <CardDescription>
                Ringkasan progress anggota tim dan job aktif yang sedang berjalan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.members.map((member) => (
                <div key={member.id} className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <Badge className={statusBadgeClass(member.status)}>{member.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-foreground">{member.currentJob}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress harian</span>
                      <span>{member.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-foreground" style={{ width: `${member.progress}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Mandatory jobs: {member.mandatoryCount}</span>
                    <span>Update terakhir {member.lastUpdate}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCheck className="size-5 text-primary" />
                Pending Approval Queue
              </CardTitle>
              <CardDescription>
                Aktivitas yang menunggu tindakan approval dari supervisor atau approver berikutnya.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pendingApprovals.length > 0 ? (
                    data.pendingApprovals.map((item) => (
                      <TableRow key={item.approvalId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.requesterName}</p>
                            <p className="text-xs text-muted-foreground">{item.requesterJobTitle}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.activityTitle}</p>
                            <p className="text-xs text-muted-foreground">Level {item.level} • {item.approverName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={item.risk === "Emergency" ? "bg-rose-100 text-rose-900" : item.risk === "Escalation" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-800"}>
                            {item.risk}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.submittedAt.toLocaleString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "short",
                          })}
                        </TableCell>
                        <TableCell>
                          <Button asChild size="sm" className="rounded-full">
                            <Link href="/dashboard/approval">Review</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Tidak ada approval pending saat ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-primary" />
                Penalty Disputes
              </CardTitle>
              <CardDescription>
                Keberatan penalty terbaru yang perlu ditindaklanjuti oleh lead atau admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.disputes.length > 0 ? (
                data.disputes.map((dispute) => (
                  <div key={dispute.id} className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{dispute.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {dispute.penaltyCode} • {dispute.createdAt.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <Badge className={dispute.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-800"}>
                        {dispute.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{dispute.reason}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Belum ada dispute penalty.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-5 text-primary" />
                Operasional Highlights
              </CardTitle>
              <CardDescription>Indikator cepat untuk planning sisa shift hari ini.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Overdue assignments</p>
                <p className="mt-2 text-3xl font-semibold">{data.summary.overdueAssignments}</p>
              </div>
              <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Overtime candidates</p>
                <p className="mt-2 text-3xl font-semibold">{data.summary.overtimeCandidates}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
