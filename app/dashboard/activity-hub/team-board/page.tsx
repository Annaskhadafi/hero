import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCheck, ClipboardList, Eye, Pencil, Trash2 } from "lucide-react";
import { manageOvertimeCommandLetterAction } from "@/app/dashboard/activity-hub/actions";
import { ActivityTeamLogPanel } from "@/components/activity-team-log-panel";
import { OvertimeCommandLetterComposer } from "@/components/overtime-command-letter-composer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/lib/auth-session";
import { getActivityPagePurpose } from "@/lib/activity-navigation";
import { getDailyActivityTeamBoardData } from "@/lib/daily-activity";

type TeamBoardData = NonNullable<Awaited<ReturnType<typeof getDailyActivityTeamBoardData>>>;

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (["draft", "submitted"].includes(normalized)) {
    return "bg-amber-100 text-amber-900";
  }
  if (["approved", "closed"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-900";
  }
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

function SplLinesDialog({
  document,
}: {
  document: TeamBoardData["splDocuments"][number];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl text-primary hover:bg-surface-container-low"
          aria-label={`Lihat line ${document.title}`}
          title={`Lihat line ${document.title}`}
        >
          <Eye className="size-4" />
          <span className="sr-only">Lihat line</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Line SPL</DialogTitle>
          <DialogDescription>
            {document.title} • {document.lineCount} line • {document.estimatedMinutesTotal} menit • {document.plannedPointsTotal} pts
          </DialogDescription>
        </DialogHeader>

        <Accordion type="single" collapsible className="rounded-xl bg-surface-container-low px-4">
          {document.items.map((item, index) => (
            <AccordionItem key={item.id} value={`line-${item.id}`} className="border-[rgba(66,71,80,0.08)]">
              <AccordionTrigger className="hover:no-underline">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Line {index + 1}</p>
                  <p className="mt-2 font-semibold text-foreground">{item.lineLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.targetUnit || "-"} • {item.estimatedMinutes} menit • {item.plannedPoints} pts
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="rounded-xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Detail line</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Target Unit</p>
                      <p className="font-medium text-foreground">{item.targetUnit || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estimasi</p>
                      <p className="font-medium text-foreground">{item.estimatedMinutes} menit</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Planned Point</p>
                      <p className="font-medium text-foreground">{item.plannedPoints} pts</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}

function EditSplDialog({
  document,
  routeTemplates,
  libraryActivities,
  teamMembers,
}: {
  document: TeamBoardData["splDocuments"][number];
  routeTemplates: TeamBoardData["splOptions"]["routeTemplates"];
  libraryActivities: TeamBoardData["splOptions"]["libraryActivities"];
  teamMembers: Array<{ id: number; name: string; role: string }>;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl text-primary hover:bg-surface-container-low"
          aria-label={`Edit SPL ${document.title}`}
          title={`Edit SPL ${document.title}`}
        >
          <Pencil className="size-4" />
          <span className="sr-only">Edit SPL</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,1180px)] max-w-[min(96vw,1180px)] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Edit SPL</DialogTitle>
          <DialogDescription>
            Update header, line kerja, peserta, dan rencana point untuk {document.title}.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-6 pb-6">
          <OvertimeCommandLetterComposer
            action={manageOvertimeCommandLetterAction}
            intent="update"
            submitLabel="Update SPL"
            routeTemplates={routeTemplates}
            libraryActivities={libraryActivities}
            teamMembers={teamMembers}
            defaults={document}
          />
          <form action={manageOvertimeCommandLetterAction} className="mt-4">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={document.id} />
            <Button type="submit" variant="outline" className="w-full rounded-xl text-rose-700">
              <Trash2 className="size-4" />
              Hapus SPL
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
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

  const pagePurpose = getActivityPagePurpose("teamBoard");

  return (
    <div className="space-y-5">
      <Card className="surface-module-card rounded-[1.1rem] border-0">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Monitoring, bukan approval resmi</Badge>
              <Badge variant="outline">{data.lead.department}</Badge>
              <Badge variant="outline">{data.lead.name}</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">{pagePurpose.title}</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {pagePurpose.description} Penugasan tetap satu pintu, tapi istilah kerja lapangan sekarang diselaraskan ke SPL.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Workers" value={data.summary.activeWorkers} />
              <MetricPill label="Checked-in" value={data.summary.checkedIn} />
              <MetricPill label="Pending approval" value={data.summary.pendingApproval} />
              <MetricPill label="SPL Overdue" value={data.summary.overdueAssignments} />
              <MetricPill label="Open SPL" value={data.summary.splOpen} />
              <MetricPill label="Overtime candidates" value={data.summary.overtimeCandidates} />
              <MetricPill label="Emergency jobs" value={data.summary.emergencyJobs} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data.hasSubordinates ? (
              <Button asChild className="rounded-full">
                <Link href="/dashboard/overtime-requests">
                  <ClipboardList className="size-4" />
                  Buat SPL
                </Link>
              </Button>
            ) : null}

            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard/approval">
                <CheckCheck className="size-4" />
                {pagePurpose.primaryAction.label}
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="spl" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="spl">Dokumen SPL</TabsTrigger>
          <TabsTrigger value="team">Team Status</TabsTrigger>
          <TabsTrigger value="activity-log">Activity Log Tim</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approval</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="spl">
          <Card className="surface-module-card rounded-[1.1rem] border-0">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Dokumen SPL"
                description="Monitor Overtime Command Letter documents complete with work lines, minute estimates, and planned points."
                label="spl documents"
                fileName="team-board-spl-docs"
                searchPlaceholder="Search SPL number, title, status, section, or line..."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dokumen</TableHead>
                      <TableHead>Window</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.splDocuments.length > 0 ? (
                      data.splDocuments.map((document) => (
                        <TableRow key={document.id}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">{document.title}</p>
                              <p className="text-xs text-muted-foreground">{document.splNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                Dibuat {document.createdAt.toLocaleString("id-ID")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1 text-sm">
                              <p>
                                {document.workDate.toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {document.plannedStartAt
                                  ? document.plannedStartAt.toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "--:--"}{" "}
                                -{" "}
                                {document.plannedEndAt
                                  ? document.plannedEndAt.toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "--:--"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1 text-sm">
                              <p>{document.sectionName ?? "Semua section"}</p>
                              <p className="text-xs text-muted-foreground">{document.positionName ?? "Semua jabatan"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1 text-sm">
                              <p>{document.lineCount} line</p>
                              <p className="text-xs text-muted-foreground">
                                {document.estimatedMinutesTotal} menit • {document.plannedPointsTotal} pts
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge className={statusBadgeClass(document.status)}>{document.status}</Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex items-center gap-1">
                              <SplLinesDialog document={document} />
                              <EditSplDialog
                                document={document}
                                routeTemplates={data.splOptions.routeTemplates}
                                libraryActivities={data.splOptions.libraryActivities}
                                teamMembers={data.team.map((member) => ({
                                  id: member.id,
                                  name: member.name,
                                  role: member.jobTitle || member.role,
                                }))}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Belum ada dokumen SPL di site ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="surface-module-card rounded-[1.1rem] border-0">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Field Team Status"
                description="One table to monitor team members, active jobs, progress, and latest updates."
                label="team members"
                fileName="team-board-members"
                searchPlaceholder="Search name, role, status, or active job..."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active Job</TableHead>
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
          <Card className="surface-module-card rounded-[1.1rem] border-0">
            <CardContent className="space-y-4 pt-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Log Aktivitas Bawahan</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Group berdasarkan nama lalu hari, dan tiap nama bisa collapse supaya monitoring lebih rapi.
                </p>
              </div>

              <ActivityTeamLogPanel
                groups={data.activityGroups}
                emptyMessage="No activities from your subordinates yet."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card className="surface-module-card rounded-[1.1rem] border-0">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Pending Approval Queue"
                description="Daftar ini hanya monitoring cepat. Klik Review untuk membuka Approval Inbox sebagai tempat keputusan resmi."
                label="pending approvals"
                fileName="team-board-approvals"
                searchPlaceholder="Search requester, activity, approver, or risk..."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Activity</TableHead>
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
          <Card className="surface-module-card rounded-[1.1rem] border-0">
            <CardContent className="space-y-4 pt-6">
              <MinimalTableShell
                title="Penalty Disputes"
                description="Dispute penalty ditampilkan sebagai audit table agar lead lebih mudah menindaklanjuti."
                label="disputes"
                fileName="team-board-disputes"
                searchPlaceholder="Search employee, penalty code, status, or reason..."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
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
