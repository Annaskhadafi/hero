import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCheck, ClipboardList } from "lucide-react";
import { manageJobAssignmentAction } from "@/app/dashboard/activity-hub/actions";
import { ActivityTeamLogPanel } from "@/components/activity-team-log-panel";
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
import { Label } from "@/components/ui/label";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function riskBadgeClass(risk: string) {
  if (risk === "Emergency") {
    return "bg-rose-100 text-rose-900";
  }

  if (risk === "Escalation") {
    return "bg-amber-100 text-amber-900";
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
    <div className="space-y-5">
      <Card className="rounded-[1.5rem]">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Team Board Workspace</Badge>
              <Badge variant="outline">{data.lead.department}</Badge>
              <Badge variant="outline">{data.lead.name}</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl">Lead Board Berbasis Table dan Tab</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Halaman foreman diringkas menjadi command surface yang fokus ke team status, approval queue, dan dispute
                audit. Pembuatan assignment dipindah ke modal agar area kerja utama tidak lagi dipenuhi grid card.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Workers" value={data.summary.activeWorkers} />
              <MetricPill label="Checked-in" value={data.summary.checkedIn} />
              <MetricPill label="Pending approval" value={data.summary.pendingApproval} />
              <MetricPill label="Overdue" value={data.summary.overdueAssignments} />
              <MetricPill label="Overtime candidates" value={data.summary.overtimeCandidates} />
              <MetricPill label="Emergency jobs" value={data.summary.emergencyJobs} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data.hasSubordinates ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="rounded-full">
                    <ClipboardList className="size-4" />
                    Buat assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Buat Job Assignment</DialogTitle>
                    <DialogDescription>
                      Assignment hanya bisa dibuat untuk bawahan yang tersambung di struktur organisasi.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={manageJobAssignmentAction} className="space-y-4">
                    <input type="hidden" name="intent" value="create" />
                    <input type="hidden" name="assignedByEmployeeId" value={data.lead.id} />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Label className="grid gap-2">
                        Assign to
                        <select name="assignedToEmployeeId" className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                          {data.team.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} - {member.jobTitle || member.role}
                            </option>
                          ))}
                        </select>
                      </Label>
                      <Label className="grid gap-2">
                        Site
                        <Input name="siteId" defaultValue={data.lead.siteId} readOnly />
                      </Label>
                      <Label className="grid gap-2">
                        Activity library
                        <select name="libraryActivityId" className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                          {data.assignmentOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.activityCode} - {item.activityName}
                            </option>
                          ))}
                        </select>
                      </Label>
                      <Label className="grid gap-2">
                        Priority
                        <select name="priority" defaultValue="Normal" className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
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
                        <Input
                          name="deadline"
                          type="datetime-local"
                          defaultValue={dateTimeLocalValue(new Date(Date.now() + 4 * 60 * 60 * 1000))}
                        />
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
                      <Label className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
                        <input type="checkbox" name="isMandatory" />
                        Jadikan mandatory activity
                      </Label>
                      <Label className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
                        <input type="checkbox" name="isRecurring" />
                        Tandai recurring assignment
                      </Label>
                    </div>

                    <Button type="submit" className="w-full rounded-2xl">
                      Buat assignment
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}

            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard/approval">
                <CheckCheck className="size-4" />
                Approval inbox
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="team" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="team">Team Status</TabsTrigger>
          <TabsTrigger value="activity-log">Activity Log Tim</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approval</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Status Tim Lapangan"
                description="Satu table untuk memantau anggota tim, pekerjaan aktif, progress, dan update terakhir."
                label="team members"
                fileName="team-board-members"
                searchPlaceholder="Cari nama, role, status, atau pekerjaan aktif..."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pekerjaan Aktif</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Mandatory</TableHead>
                      <TableHead>Last Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.members.length > 0 ? (
                      data.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge className={statusBadgeClass(member.status)}>{member.status}</Badge>
                          </TableCell>
                          <TableCell className="align-top">{member.currentJob}</TableCell>
                          <TableCell className="align-top">{member.progress}%</TableCell>
                          <TableCell className="align-top">{member.mandatoryCount}</TableCell>
                          <TableCell className="align-top">{member.lastUpdate}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Belum ada status anggota tim yang tersedia.
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
              <div>
                <h3 className="text-lg font-semibold text-foreground">Log Aktivitas Bawahan</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Group berdasarkan nama lalu hari, dan tiap nama bisa collapse supaya monitoring lebih rapi.
                </p>
              </div>

              <ActivityTeamLogPanel
                groups={data.activityGroups}
                emptyMessage="Belum ada aktivitas dari bawahan Anda."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Pending Approval Queue"
                description="Approval yang menunggu tindak lanjut kini dipusatkan ke satu table audit."
                label="pending approvals"
                fileName="team-board-approvals"
                searchPlaceholder="Cari requester, aktivitas, approver, atau risk..."
              >
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
                        <TableRow key={item.approvalId} data-date-value={item.submittedAt.toISOString()}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">{item.requesterName}</p>
                              <p className="text-xs text-muted-foreground">{item.requesterJobTitle}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">{item.activityTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                Level {item.level} • {item.approverName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge className={riskBadgeClass(item.risk)}>{item.risk}</Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            {item.submittedAt.toLocaleString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "short",
                            })}
                          </TableCell>
                          <TableCell className="align-top">
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
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes">
          <Card className="rounded-[1.4rem]">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Penalty Disputes"
                description="Dispute penalty ditampilkan sebagai audit table agar lead lebih mudah menindaklanjuti."
                label="disputes"
                fileName="team-board-disputes"
                searchPlaceholder="Cari karyawan, kode penalty, status, atau alasan..."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.disputes.length > 0 ? (
                      data.disputes.map((dispute) => (
                        <TableRow key={dispute.id} data-date-value={dispute.createdAt.toISOString()}>
                          <TableCell className="align-top font-medium">{dispute.employeeName}</TableCell>
                          <TableCell className="align-top">{dispute.penaltyCode}</TableCell>
                          <TableCell className="align-top">{dispute.reason}</TableCell>
                          <TableCell className="align-top">
                            <Badge className={dispute.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-800"}>
                              {dispute.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">{dispute.createdAt.toLocaleString("id-ID")}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Belum ada dispute penalty.
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
