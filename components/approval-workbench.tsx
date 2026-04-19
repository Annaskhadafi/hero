import { approveApprovalGroupAction, reviewApprovalAction } from "@/app/dashboard/admin-actions";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { getApprovalCenterData } from "@/lib/approval-workspace";

type ApprovalCenterData = Awaited<ReturnType<typeof getApprovalCenterData>>;

function InboxTab({ groups }: { groups: ApprovalCenterData["inboxGroups"] }) {
  if (groups.length === 0) {
    return (
      <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle>Inbox Approval</CardTitle>
          <CardDescription>Belum ada activity yang menunggu approval Anda.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <details
          key={group.id}
          open={groupIndex === 0}
          className="overflow-hidden rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]"
        >
          <summary className="cursor-pointer list-none bg-surface-container-low px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-lg font-black tracking-tight text-[#082033]">{group.requesterName}</p>
                <p className="text-sm text-muted-foreground">
                  {group.requesterJobTitle || "-"} • {group.siteName} • {group.workDateLabel}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {group.activityCount} activity • overtime {group.totalOvertimeLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminStatusBadge value={`${group.activityCount} activity`} />
                {group.dueSoonCount > 0 ? <AdminStatusBadge value="due_soon" /> : null}
                {group.overdueCount > 0 ? <AdminStatusBadge value="overdue" /> : null}
              </div>
            </div>
          </summary>

          <div className="space-y-4 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] bg-surface-container-low px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-[#082033]">Aksi per grup</p>
                <p className="text-xs text-muted-foreground">
                  Setujui semua activity user ini untuk tanggal kerja yang sama.
                </p>
              </div>
              <form action={approveApprovalGroupAction}>
                {group.items.map((item) => (
                  <input key={item.approvalId} type="hidden" name="approvalIds" value={item.approvalId} />
                ))}
                <Button type="submit" className="rounded-full px-4">
                  Approve Semua
                </Button>
              </form>
            </div>

            <div className="space-y-3">
              {group.items.map((item, itemIndex) => (
                <details
                  key={item.approvalId}
                  open={groupIndex === 0 && itemIndex === 0}
                  className="overflow-hidden rounded-[1.15rem] bg-surface-container-low"
                >
                  <summary className="cursor-pointer list-none px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-[#082033]">
                          {item.title} • {item.unitNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.activityType} • {item.timeRange} • {item.shiftLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submit {item.submittedAt.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <AdminStatusBadge value={item.currentStepLabel} />
                        <AdminStatusBadge value={item.priority} />
                        <AdminStatusBadge value={item.dueState} />
                      </div>
                    </div>
                  </summary>

                  <div className="space-y-4 border-t border-white/60 px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1rem] bg-white px-4 py-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                          Ringkasan
                        </p>
                        <p className="mt-2 text-sm text-[#082033]">
                          Due {item.dueAt.toLocaleString("id-ID")} • overtime {item.overtimeLabel}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{item.remarks || "Tanpa remark tambahan."}</p>
                      </div>
                      <div className="rounded-[1rem] bg-white px-4 py-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                          Catatan Terakhir
                        </p>
                        <p className="mt-2 text-sm text-[#082033]">
                          {item.lastNote ? item.lastNote.message : "Belum ada komentar approval."}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.lastNote
                            ? `${item.lastNote.actor} • ${item.lastNote.at.toLocaleString("id-ID")}`
                            : "Requester baru submit activity ini."}
                        </p>
                      </div>
                    </div>

                    <form action={reviewApprovalAction} className="space-y-3 rounded-[1rem] bg-white px-4 py-4">
                      <input type="hidden" name="approvalId" value={item.approvalId} />
                      <p className="text-sm font-semibold text-[#082033]">Keputusan Activity</p>
                      <Textarea
                        name="note"
                        rows={3}
                        placeholder="Isi komentar bila reject / revisi. Approve boleh kosong atau beri catatan."
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" name="decision" value="approved" className="rounded-full px-4">
                          Approve
                        </Button>
                        <Button
                          type="submit"
                          name="decision"
                          value="rejected"
                          variant="secondary"
                          className="rounded-full px-4"
                        >
                          Reject
                        </Button>
                        <Button
                          type="submit"
                          name="decision"
                          value="needs_correction"
                          variant="outline"
                          className="rounded-full px-4"
                        >
                          Revisi
                        </Button>
                      </div>
                    </form>

                    {item.notes.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                          Riwayat Catatan
                        </p>
                        {item.notes.map((note) => (
                          <div key={note.id} className="rounded-[1rem] bg-white px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-[#082033]">{note.actor}</p>
                              <AdminStatusBadge value={note.kind} />
                            </div>
                            <p className="mt-2 text-sm text-[#082033]">{note.message}</p>
                            <p className="mt-2 text-xs text-muted-foreground">{note.at.toLocaleString("id-ID")}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function HistoryTab({ groups }: { groups: ApprovalCenterData["historyGroups"] }) {
  if (groups.length === 0) {
    return (
      <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle>History Approval</CardTitle>
          <CardDescription>Belum ada activity yang Anda submit ke workflow approval.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <details
          key={group.id}
          open={groupIndex === 0}
          className="overflow-hidden rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]"
        >
          <summary className="cursor-pointer list-none bg-surface-container-low px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-lg font-black tracking-tight text-[#082033]">{group.workDateLabel}</p>
                <p className="text-sm text-muted-foreground">{group.activityCount} activity diajukan</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.pendingCount > 0 ? <AdminStatusBadge value="in_review" /> : null}
                {group.approvedCount > 0 ? <AdminStatusBadge value="approved" /> : null}
                {group.rejectedCount > 0 ? <AdminStatusBadge value="rejected" /> : null}
                {group.revisionCount > 0 ? <AdminStatusBadge value="needs_revision" /> : null}
              </div>
            </div>
          </summary>

          <div className="space-y-3 px-5 py-5">
            {group.items.map((item, itemIndex) => (
              <details
                key={item.activityId}
                open={groupIndex === 0 && itemIndex === 0}
                className="overflow-hidden rounded-[1.15rem] bg-surface-container-low"
              >
                <summary className="cursor-pointer list-none px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-[#082033]">
                        {item.title} • {item.unitNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.activityType} • {item.siteName} • {item.timeRange}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tahap {item.currentStepLabel} • menunggu {item.pendingWith}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AdminStatusBadge value={item.status} />
                      <AdminStatusBadge value={item.priority} />
                    </div>
                  </div>
                </summary>

                <div className="space-y-4 border-t border-white/60 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] bg-white px-4 py-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        Hasil Terakhir
                      </p>
                      <p className="mt-2 text-sm text-[#082033]">{item.lastDecision}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Submit {item.submittedAt.toLocaleString("id-ID")} • {item.shiftLabel}
                      </p>
                    </div>
                    <div className="rounded-[1rem] bg-white px-4 py-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        Workflow
                      </p>
                      <p className="mt-2 text-sm text-[#082033]">{item.workflowLabel}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Priority {item.priority}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Trail Approval
                    </p>
                    {item.notes.map((note) => (
                      <div key={note.id} className="rounded-[1rem] bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#082033]">{note.actor}</p>
                          <AdminStatusBadge value={note.kind} />
                        </div>
                        <p className="mt-2 text-sm text-[#082033]">{note.message}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{note.at.toLocaleString("id-ID")}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Status Per Step
                    </p>
                    {item.steps.map((step) => (
                      <div key={step.approvalId} className="rounded-[1rem] bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#082033]">
                            L{step.level} • {step.label}
                          </p>
                          <AdminStatusBadge value={step.status} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{step.approverName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {step.reviewedAt ? step.reviewedAt.toLocaleString("id-ID") : "Belum diputuskan"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function ApprovalWorkbench({ data }: { data: ApprovalCenterData }) {
  return (
    <AdminPageShell
      eyebrow="Approval"
      title="Approval Center"
      description="Inbox approval harian yang grouped per user dan history hasil approval untuk activity yang Anda ajukan."
    >
      <AdminMetricGrid
        items={[
          {
            label: "Group inbox",
            value: `${data.inboxMetrics.pendingGroups}`,
            meta: "Kelompok user-hari yang menunggu approval",
          },
          {
            label: "Activity pending",
            value: `${data.inboxMetrics.pendingActivities}`,
            meta: "Jumlah item activity yang bisa diputuskan",
          },
          {
            label: "Due soon",
            value: `${data.inboxMetrics.dueSoon}`,
            meta: "Item yang perlu diprioritaskan segera",
          },
          {
            label: "Overdue",
            value: `${data.inboxMetrics.overdue}`,
            meta: "Activity yang sudah melewati SLA",
          },
          {
            label: "History approved",
            value: `${data.historyMetrics.approved}`,
            meta: "Pengajuan Anda yang selesai disetujui",
          },
          {
            label: "History rejected",
            value: `${data.historyMetrics.rejected}`,
            meta: "Pengajuan Anda yang ditolak",
          },
        ]}
      />

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="inbox">Inbox Approval</TabsTrigger>
          <TabsTrigger value="history">History Approval</TabsTrigger>
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
