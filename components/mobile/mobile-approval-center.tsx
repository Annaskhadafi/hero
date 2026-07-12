import { approveApprovalGroupAction, reviewApprovalAction } from "@/app/dashboard/admin-actions";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpeechTextarea as Textarea } from "@/components/ui/speech-textarea";
import type { getApprovalCenterData } from "@/lib/approval-workspace";
import Link from "next/link";

type ApprovalCenterData = Awaited<ReturnType<typeof getApprovalCenterData>>;

function MobileInbox({
  groups,
  contractReviewItems,
}: {
  groups: ApprovalCenterData["inboxGroups"];
  contractReviewItems: ApprovalCenterData["contractReviewInboxItems"];
}) {
  if (groups.length === 0 && contractReviewItems.length === 0) {
    return (
      <div className="rounded-[1.3rem] bg-white p-5 text-sm font-semibold text-[#486275] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        Tidak ada pengajuan yang menunggu approval Anda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contractReviewItems.map((item) => (
        <div
          key={item.id}
          className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_16px_36px_rgba(8,32,51,0.08)]"
        >
          <div className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">Contract Review</p>
                <p className="mt-1 text-base font-black tracking-tight text-[#082033]">{item.employeeName}</p>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  {item.stepLabel} • {item.approverRole.replace(/_/g, " ")}
                </p>
              </div>
              <AdminStatusBadge value={item.dueState} />
            </div>
            <div className="mt-3 rounded-[1.05rem] bg-[#f6fbff] px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#486275]">Ringkasan</p>
              <p className="mt-2 text-sm text-[#082033]">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-[#486275]">
                Due {item.dueAt.toLocaleDateString("id-ID")} • {item.reviewType}
              </p>
            </div>
            <Link
              prefetch={false}
              href={item.url}
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#003f78] px-4 text-sm font-black text-white active:scale-95 transition-transform"
            >
              Buka TTD Contract Review
            </Link>
          </div>
        </div>
      ))}

      {groups.map((group, groupIndex) => (
        <details
          key={group.id}
          open={groupIndex === 0}
          className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_16px_36px_rgba(8,32,51,0.08)]"
        >
          <summary className="list-none cursor-pointer px-4 py-4">
            <p className="text-base font-black tracking-tight text-[#082033]">{group.requesterName}</p>
            <p className="mt-1 text-xs font-semibold text-[#486275]">
              {group.requesterJobTitle || "-"} • {group.workDateLabel}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminStatusBadge value={`${group.activityCount} item`} />
              {group.dueSoonCount > 0 ? <AdminStatusBadge value="due_soon" /> : null}
              {group.overdueCount > 0 ? <AdminStatusBadge value="overdue" /> : null}
            </div>
          </summary>

          <div className="space-y-3 border-t border-[#e6f0f7] bg-[#f6fbff] px-4 py-4">
            <div className="rounded-[1.05rem] bg-white px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#486275]">Approve Group</p>
              <p className="mt-2 text-sm text-[#082033]">
                {group.activityCount} item • overtime {group.totalOvertimeLabel}
              </p>
              <form action={approveApprovalGroupAction} className="mt-3">
                {group.items.map((item) => (
                  <input key={item.approvalId} type="hidden" name="approvalIds" value={item.approvalId} />
                ))}
                <Button type="submit" className="h-11 rounded-full px-4">
                  Approve Semua
                </Button>
              </form>
            </div>

            {group.items.map((item, itemIndex) => (
              <details
                key={item.approvalId}
                open={groupIndex === 0 && itemIndex === 0}
                className="overflow-hidden rounded-[1.05rem] bg-white"
              >
                <summary className="list-none cursor-pointer px-4 py-4">
                  <p className="text-sm font-black text-[#082033]">
                    {item.title} • {item.unitNumber}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#486275]">
                    {item.activityType} • {item.timeRange}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminStatusBadge value={item.priority} />
                    <AdminStatusBadge value={item.dueState} />
                  </div>
                </summary>

                <div className="space-y-3 border-t border-[#eef4f8] px-4 py-4">
                  <div className="rounded-[0.95rem] bg-[#f6fbff] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#486275]">Ringkasan</p>
                    <p className="mt-2 text-sm text-[#082033]">
                      Step {item.currentStepLabel} • due {item.dueAt.toLocaleString("id-ID")}
                    </p>
                    <p className="mt-2 text-sm text-[#486275]">{item.remarks || "Tanpa remark tambahan."}</p>
                  </div>

                  <form action={reviewApprovalAction} className="space-y-3 rounded-[0.95rem] bg-[#f6fbff] px-4 py-4">
                    <input type="hidden" name="approvalId" value={item.approvalId} />
                    <Textarea
                      name="note"
                      rows={3}
                      placeholder="Reject wajib komentar. Revisi juga bisa isi catatan."
                      className="bg-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" name="decision" value="approved" className="h-11 rounded-full px-4">
                        Approve
                      </Button>
                      <Button
                        type="submit"
                        name="decision"
                        value="rejected"
                        variant="secondary"
                        className="h-11 rounded-full px-4"
                      >
                        Reject
                      </Button>
                      <Button
                        type="submit"
                        name="decision"
                        value="needs_correction"
                        variant="outline"
                        className="h-11 rounded-full px-4"
                      >
                        Revisi
                      </Button>
                    </div>
                  </form>

                  {item.notes.length > 0 ? (
                    <div className="space-y-2">
                      {item.notes.map((note) => (
                        <div key={note.id} className="rounded-[0.95rem] bg-[#f6fbff] px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-[#082033]">{note.actor}</p>
                            <AdminStatusBadge value={note.kind} />
                          </div>
                          <p className="mt-2 text-sm text-[#082033]">{note.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function MobileHistory({ groups }: { groups: ApprovalCenterData["historyGroups"] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-[1.3rem] bg-white p-5 text-sm font-semibold text-[#486275] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        Belum ada riwayat approval dari pengajuan Anda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group, groupIndex) => (
        <details
          key={group.id}
          open={groupIndex === 0}
          className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_16px_36px_rgba(8,32,51,0.08)]"
        >
          <summary className="list-none cursor-pointer px-4 py-4">
            <p className="text-base font-black tracking-tight text-[#082033]">{group.workDateLabel}</p>
            <p className="mt-1 text-xs font-semibold text-[#486275]">{group.activityCount} pengajuan diajukan</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.pendingCount > 0 ? <AdminStatusBadge value="in_review" /> : null}
              {group.approvedCount > 0 ? <AdminStatusBadge value="approved" /> : null}
              {group.rejectedCount > 0 ? <AdminStatusBadge value="rejected" /> : null}
              {group.revisionCount > 0 ? <AdminStatusBadge value="needs_revision" /> : null}
            </div>
          </summary>

          <div className="space-y-3 border-t border-[#e6f0f7] bg-[#f6fbff] px-4 py-4">
            {group.items.map((item, itemIndex) => (
              <details
                key={item.activityId}
                open={groupIndex === 0 && itemIndex === 0}
                className="overflow-hidden rounded-[1.05rem] bg-white"
              >
                <summary className="list-none cursor-pointer px-4 py-4">
                  <p className="text-sm font-black text-[#082033]">
                    {item.title} • {item.unitNumber}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#486275]">
                    {item.activityType} • {item.siteName} • {item.timeRange}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminStatusBadge value={item.status} />
                    <AdminStatusBadge value={item.priority} />
                  </div>
                </summary>

                <div className="space-y-3 border-t border-[#eef4f8] px-4 py-4">
                  <div className="rounded-[0.95rem] bg-[#f6fbff] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#486275]">Result</p>
                    <p className="mt-2 text-sm text-[#082033]">{item.lastDecision}</p>
                    <p className="mt-2 text-xs font-semibold text-[#486275]">
                      Menunggu {item.pendingWith} • {item.currentStepLabel}
                    </p>
                  </div>

                  {item.notes.map((note) => (
                    <div key={note.id} className="rounded-[0.95rem] bg-[#f6fbff] px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-[#082033]">{note.actor}</p>
                        <AdminStatusBadge value={note.kind} />
                      </div>
                      <p className="mt-2 text-sm text-[#082033]">{note.message}</p>
                      <p className="mt-2 text-xs text-[#486275]">{note.at.toLocaleString("id-ID")}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function MobileApprovalCenter({ data }: { data: ApprovalCenterData }) {
  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Approval Inbox</p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">Approval</h1>
        <p className="text-sm font-semibold text-[#486275]">
          Inbox per requester dan riwayat hasil approval pengajuan Anda.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Inbox Group</p>
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.inboxMetrics.pendingGroups}</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Pending Item</p>
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.inboxMetrics.pendingActivities}</p>
        </div>
      </section>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-[1rem] bg-[#dcebf6] p-1">
          <TabsTrigger value="inbox" className="rounded-[0.8rem]">
            Inbox
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-[0.8rem]">
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3">
          <MobileInbox groups={data.inboxGroups} contractReviewItems={data.contractReviewInboxItems} />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <MobileHistory groups={data.historyGroups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
