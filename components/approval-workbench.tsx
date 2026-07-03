import { approveApprovalGroupAction, reviewApprovalAction } from "@/app/dashboard/admin-actions";
import { AdminDetailDrawer } from "@/components/admin/admin-detail-drawer";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { TableFilterPresets } from "@/components/table-filter-presets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { getApprovalCenterData } from "@/lib/approval-workspace";
import Link from "next/link";

type ApprovalCenterData = Awaited<ReturnType<typeof getApprovalCenterData>>;

function ApprovalFilterBar({
  sites,
  priorities,
  statusOptions,
}: {
  sites: string[];
  priorities: string[];
  statusOptions: string[];
}) {
  return (
    <>
      <select
        data-table-filter-key="site"
        defaultValue=""
        className="h-9 rounded-xl border-0 bg-surface-container-lowest px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
      >
        <option value="">Semua site</option>
        {sites.map((site) => (
          <option key={site} value={site}>
            {site}
          </option>
        ))}
      </select>
      <select
        data-table-filter-key="priority"
        defaultValue=""
        className="h-9 rounded-xl border-0 bg-surface-container-lowest px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
      >
        <option value="">Semua prioritas</option>
        {priorities.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
      <select
        data-table-filter-key="status"
        defaultValue=""
        className="h-9 rounded-xl border-0 bg-surface-container-lowest px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
      >
        <option value="">Semua status</option>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </>
  );
}

function InboxTab({ groups }: { groups: ApprovalCenterData["inboxGroups"] }) {
  if (groups.length === 0) {
    return (
      <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle>Inbox approval</CardTitle>
          <CardDescription>Belum ada pengajuan yang menunggu keputusan Anda.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sites = Array.from(new Set(groups.map((group) => group.siteName))).sort();
  const priorities = Array.from(
    new Set(groups.flatMap((group) => group.items.map((item) => item.priority))),
  ).sort();

  return (
    <Card className="rounded-[1.4rem] border-0 bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
      <CardContent className="pt-6">
        <MinimalTableShell
          title="Tugas yang harus saya approve"
          description="Approval Inbox hanya berisi tugas approval yang menunggu keputusan Anda. Request yang Anda buat ada di Request Center."
          label="approval items"
          fileName="approval-inbox"
          searchPlaceholder="Cari requester, site, pengajuan, unit/area, atau step approval..."
          dateFilter
          filters={<ApprovalFilterBar sites={sites} priorities={priorities} statusOptions={["on_track", "due_soon", "overdue"]} />}
          presets={<TableFilterPresets presets={[{ label: "Terlambat", filters: { status: "overdue" } }, { label: "Segera jatuh tempo", filters: { status: "due_soon" } }]} />}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Pengajuan</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.flatMap((group) =>
                group.items.map((item) => (
                  <TableRow
                    key={item.approvalId}
                    data-date-value={item.submittedAt.toISOString()}
                    data-filter-site={group.siteName}
                    data-filter-priority={item.priority}
                    data-filter-status={item.dueState}
                  >
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{group.requesterName}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.requesterJobTitle || "-"} • {group.workDateLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">{group.activityCount} item dalam grup ini</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-sm text-foreground">{group.siteName}</p>
                        <p className="text-xs text-muted-foreground">Overtime {group.totalOvertimeLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.activityType} • {item.unitNumber} • {item.timeRange}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <AdminStatusBadge value={item.priority} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{item.currentStepLabel}</p>
                        <p className="text-xs text-muted-foreground">Submit {item.submittedAt.toLocaleString("id-ID")}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <AdminStatusBadge value={item.dueState} />
                        <p className="text-xs text-muted-foreground">Due {item.dueAt.toLocaleString("id-ID")}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <AdminDetailDrawer
                        title={`Review ${item.title}`}
                        description={`${group.requesterName} • ${group.siteName} • ${item.currentStepLabel}`}
                        width="wide"
                        trigger={
                          <Button type="button" variant="outline" size="dense">
                            Review
                          </Button>
                        }
                      >
                        <form action={reviewApprovalAction} className="space-y-3">
                          <input type="hidden" name="approvalId" value={item.approvalId} />
                          <div className="rounded-lg bg-surface-container-low p-3 text-sm text-foreground">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">Ringkasan kerja</p>
                              {item.activityType === "Request APD" && (
                                <Button type="button" variant="outline" size="sm" asChild>
                                  <Link href={`/dashboard/apd/${item.activityId}`} target="_blank">
                                    Preview Dokumen
                                  </Link>
                                </Button>
                              )}
                            </div>
                            <p className="mt-1 text-muted-foreground">{item.remarks || "Tanpa catatan tambahan dari requester."}</p>
                          </div>
                          <div className="rounded-lg bg-surface-container-low p-3 text-sm text-foreground">
                            <p className="font-semibold">Catatan terakhir</p>
                            <p className="mt-1 text-muted-foreground">
                              {item.lastNote ? item.lastNote.message : "Belum ada komentar approval sebelumnya."}
                            </p>
                          </div>
                          <Textarea
                            name="note"
                            rows={3}
                            placeholder="Isi komentar bila reject atau revisi. Approve boleh kosong atau beri konteks singkat."
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button type="submit" name="decision" value="approved" size="dense">
                              Setujui
                            </Button>
                            <Button type="submit" name="decision" value="needs_correction" variant="outline" size="dense">
                              Minta revisi
                            </Button>
                            <Button type="submit" name="decision" value="rejected" variant="secondary" size="dense">
                              Tolak
                            </Button>
                          </div>
                        </form>
                        {group.items.length > 1 ? (
                          <form action={approveApprovalGroupAction} className="mt-3 border-t border-outline-ghost/70 pt-3">
                            {group.items.map((approvalItem) => (
                              <input key={approvalItem.approvalId} type="hidden" name="approvalIds" value={approvalItem.approvalId} />
                            ))}
                            <Button type="submit" variant="outline" size="dense">
                              Setujui semua milik {group.requesterName}
                            </Button>
                          </form>
                        ) : null}
                      </AdminDetailDrawer>
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </CardContent>
    </Card>
  );
}

function HistoryTab({ groups }: { groups: ApprovalCenterData["historyGroups"] }) {
  if (groups.length === 0) {
    return (
      <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle>Riwayat approval</CardTitle>
          <CardDescription>Belum ada pengajuan Anda yang masuk ke workflow approval.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sites = Array.from(new Set(groups.flatMap((group) => group.items.map((item) => item.siteName)))).sort();
  const priorities = Array.from(new Set(groups.flatMap((group) => group.items.map((item) => item.priority)))).sort();
  const statuses = Array.from(new Set(groups.flatMap((group) => group.items.map((item) => item.status)))).sort();

  return (
    <Card className="rounded-[1.4rem] border-0 bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
      <CardContent className="pt-6">
        <MinimalTableShell
          title="Jejak keputusan Approval Inbox"
          description="Lacak keputusan yang sudah lewat dari antrian approval Anda. Status pengajuan milik Anda tetap dibuka dari Request Center."
          label="request history"
          fileName="approval-history"
          searchPlaceholder="Cari pengajuan, site, approver, workflow, atau hasil keputusan..."
          dateFilter
          filters={<ApprovalFilterBar sites={sites} priorities={priorities} statusOptions={statuses} />}
          presets={<TableFilterPresets presets={[{ label: "Disetujui", filters: { status: "approved" } }, { label: "Perlu revisi", filters: { status: "needs_revision" } }]} />}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengajuan</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Menunggu</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.flatMap((group) =>
                group.items.map((item) => (
                  <TableRow
                    key={item.activityId}
                    data-date-value={item.submittedAt.toISOString()}
                    data-filter-site={item.siteName}
                    data-filter-priority={item.priority}
                    data-filter-status={item.status}
                  >
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.activityType} • {item.unitNumber} • {group.workDateLabel}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <AdminStatusBadge value={item.priority} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm text-foreground">{item.siteName}</TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <AdminStatusBadge value={item.status} />
                        <p className="text-xs text-muted-foreground">{item.lastDecision}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <p className="text-foreground">{item.pendingWith}</p>
                        <p className="text-xs text-muted-foreground">Tahap {item.currentStepLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <p className="text-foreground">{item.workflowLabel}</p>
                        <p className="text-xs text-muted-foreground">{item.shiftLabel} • {item.timeRange}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <AdminDetailDrawer
                        title={`Trail ${item.title}`}
                        description={`${item.siteName} • ${item.workflowLabel}`}
                        width="wide"
                        trigger={
                          <Button type="button" variant="outline" size="dense">
                            Trail
                          </Button>
                        }
                      >
                        <div className="space-y-3">
                          <div className="rounded-lg bg-surface-container-low p-3">
                            <p className="text-sm font-semibold text-foreground">Jejak approval</p>
                            <div className="mt-2 space-y-2">
                              {item.notes.map((note) => (
                                <div key={note.id} className="rounded-lg bg-surface-container-lowest px-3 py-3 shadow-[inset_0_0_0_1px_var(--outline-ghost)]">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-foreground">{note.actor}</p>
                                    <AdminStatusBadge value={note.kind} />
                                  </div>
                                  <p className="mt-2 text-sm text-foreground">{note.message}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{note.at.toLocaleString("id-ID")}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-lg bg-surface-container-low p-3">
                            <p className="text-sm font-semibold text-foreground">Status per step</p>
                            <div className="mt-2 space-y-2">
                              {item.steps.map((step) => (
                                <div key={step.approvalId} className="rounded-lg bg-surface-container-lowest px-3 py-3 shadow-[inset_0_0_0_1px_var(--outline-ghost)]">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-foreground">
                                      L{step.level} • {step.label}
                                    </p>
                                    <AdminStatusBadge value={step.status} />
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {step.approverName} • {step.reviewedAt ? step.reviewedAt.toLocaleString("id-ID") : "Belum diputuskan"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </AdminDetailDrawer>
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </CardContent>
    </Card>
  );
}

export function ApprovalWorkbench({ data }: { data: ApprovalCenterData }) {
  return (
    <AdminPageShell
      eyebrow="Approval"
      title="Approval Inbox"
      description="Tugas yang harus saya approve. Gunakan halaman ini untuk mengambil keputusan sebagai approver, bukan untuk memantau request yang saya buat."
    >
      <AdminMetricGrid
        mode="compact"
        items={[
          {
            label: "Grup menunggu",
            value: `${data.inboxMetrics.pendingGroups}`,
            meta: "Requester-hari yang masih perlu keputusan",
          },
          {
            label: "Item pending",
            value: `${data.inboxMetrics.pendingActivities}`,
            meta: "Pengajuan yang bisa diputuskan sekarang",
          },
          {
            label: "Segera jatuh tempo",
            value: `${data.inboxMetrics.dueSoon}`,
            meta: "Butuh diprioritaskan di shift ini",
          },
          {
            label: "Terlambat",
            value: `${data.inboxMetrics.overdue}`,
            meta: "Sudah melewati SLA review",
          },
          {
            label: "Riwayat disetujui",
            value: `${data.historyMetrics.approved}`,
            meta: "Pengajuan Anda yang selesai mulus",
          },
          {
            label: "Riwayat ditolak",
            value: `${data.historyMetrics.rejected}`,
            meta: "Butuh tindak lanjut atau submit ulang",
          },
        ]}
      />

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="inbox">Approval Inbox</TabsTrigger>
          <TabsTrigger value="history">Riwayat pengajuan</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <InboxTab groups={data.inboxGroups} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab groups={data.historyGroups} />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
