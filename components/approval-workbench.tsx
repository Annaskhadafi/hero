import { approveApprovalGroupAction, reviewApprovalAction } from '@/app/dashboard/admin-actions'
import { AdminDetailDrawer } from '@/components/admin/admin-detail-drawer'
import { ApdApprovalDialog } from '@/components/admin/apd-approval-dialog'
import { AdminMetricGrid } from '@/components/admin-metric-grid'
import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { ApprovalRequestDetails } from '@/components/approval-request-details'
import { TableFilterPresets } from '@/components/table-filter-presets'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { getApprovalCenterData } from '@/lib/approval-workspace'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type ApprovalCenterData = Awaited<ReturnType<typeof getApprovalCenterData>>

function ApprovalFilterBar({
  sites,
  priorities,
  statusOptions,
}: {
  sites: string[]
  priorities: string[]
  statusOptions: string[]
}) {
  return (
    <>
      <select
        data-table-filter-key="site"
        defaultValue=""
        className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
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
        className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
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
        className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
      >
        <option value="">Semua status</option>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </>
  )
}

function InboxTab({ groups }: { groups: ApprovalCenterData['inboxGroups'] }) {
  if (groups.length === 0) {
    return (
      <Card className="bg-surface-container-lowest rounded-[1.6rem] shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle>Inbox approval</CardTitle>
          <CardDescription>Belum ada pengajuan yang menunggu keputusan Anda.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sites = Array.from(new Set(groups.map((group) => group.siteName))).sort()
  const priorities = Array.from(
    new Set(groups.flatMap((group) => group.items.map((item) => item.priority)))
  ).sort()

  return (
    <Card className="bg-surface-container-lowest rounded-[1.4rem] border-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
      <CardContent className="pt-6">
        <MinimalTableShell
          title="Tugas yang harus saya approve"
          description="Approval Inbox hanya berisi tugas approval yang menunggu keputusan Anda. Request yang Anda buat ada di Request Center."
          label="approval items"
          fileName="approval-inbox"
          searchPlaceholder="Cari requester, site, pengajuan, unit/area, atau step approval..."
          dateFilter
          filters={
            <ApprovalFilterBar
              sites={sites}
              priorities={priorities}
              statusOptions={['on_track', 'due_soon', 'overdue']}
            />
          }
          presets={
            <TableFilterPresets
              presets={[
                { label: 'Terlambat', filters: { status: 'overdue' } },
                { label: 'Segera jatuh tempo', filters: { status: 'due_soon' } },
              ]}
            />
          }
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
                        <p className="text-foreground font-semibold">{group.requesterName}</p>
                        <p className="text-muted-foreground text-xs">
                          {group.requesterJobTitle || '-'} • {group.workDateLabel}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {group.activityCount} item dalam grup ini
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-foreground text-sm">{group.siteName}</p>
                        <p className="text-muted-foreground text-xs">
                          Overtime {group.totalOvertimeLabel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-foreground font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.activityType} • {item.unitNumber}{(item as any).tireCount ? ` • ${(item as any).tireCount} Tire` : ''} • {item.timeRange}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <AdminStatusBadge value={item.priority} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-foreground text-sm font-medium">
                          {item.currentStepLabel}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Submit {item.submittedAt.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <AdminStatusBadge value={item.dueState} />
                        <p className="text-muted-foreground text-xs">
                          Due {item.dueAt.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {item.activityType === 'Request APD' ? (
                        <ApdApprovalDialog item={item} group={group} />
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="dense">
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-6xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl border border-outline-ghost bg-background">
                            <DialogHeader className="px-6 py-4 border-b border-outline-ghost/70 bg-surface-container-lowest">
                              <DialogTitle className="text-base flex items-center justify-between">
                                <span>Review Pengajuan: {item.title}</span>
                                <span className="text-xs font-normal text-muted-foreground mr-6">
                                  Request No: {item.requestNumber || "-"}
                                </span>
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-background">
                              {/* GRID KIRI (col-span-7): Preview Form & Audit Trail */}
                              <div className="md:col-span-7 flex flex-col h-full border-r border-outline-ghost overflow-y-auto p-6 space-y-6">
                                <div className="space-y-4">
                                  <h3 className="text-sm font-bold text-foreground">Dokumen Pengajuan</h3>
                                  <ApprovalRequestDetails item={item} />
                                </div>
                                
                                <div className="border-t border-outline-ghost/60 pt-6 space-y-4">
                                  <h3 className="text-sm font-bold text-foreground">Jejak Keputusan & Timeline</h3>
                                  <div className="space-y-2">
                                    {(item as any).steps && (item as any).steps.length > 0 ? (
                                      (item as any).steps.map((step: any) => (
                                        <div key={step.approvalId} className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
                                          <div>
                                            <p className="font-semibold">Level {step.level}: {step.label}</p>
                                            <p className="text-muted-foreground mt-0.5">{step.approverName}</p>
                                          </div>
                                          <AdminStatusBadge value={step.status} />
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">Belum ada jejak step.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* GRID KANAN (col-span-5): Comments & Approval Action */}
                              <div className="md:col-span-5 flex flex-col h-full overflow-hidden">
                                {/* Top: Comment Thread */}
                                <div className="flex-1 overflow-y-auto p-6 border-b border-outline-ghost space-y-4">
                                  <h3 className="text-sm font-bold text-foreground">Diskusi & Catatan</h3>
                                  <div className="space-y-3">
                                    {item.notes && item.notes.length > 0 ? (
                                      item.notes.map((note: any) => (
                                        <div key={note.id} className="p-3 rounded-lg bg-surface-container-low border border-outline-ghost/30 text-xs">
                                          <div className="flex items-center justify-between">
                                            <span className="font-semibold text-foreground">{note.actor}</span>
                                            <AdminStatusBadge value={note.kind} />
                                          </div>
                                          <p className="mt-1.5 text-muted-foreground">{note.message}</p>
                                          <p className="mt-1 text-[10px] text-right text-muted-foreground/80">
                                            {note.at.toLocaleString("id-ID")}
                                          </p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">Belum ada diskusi.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Bottom: Action Box */}
                                <div className="p-6 bg-surface-container-lowest space-y-4">
                                  <form action={reviewApprovalAction} className="space-y-4">
                                    <input type="hidden" name="approvalId" value={item.approvalId} />
                                    
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-semibold text-foreground">Catatan Keputusan</label>
                                      <Textarea
                                        name="note"
                                        rows={3}
                                        placeholder="Tulis alasan jika menolak/revisi, atau beri catatan persetujuan..."
                                        className="text-xs resize-none"
                                      />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                      <Button
                                        type="submit"
                                        name="decision"
                                        value="approved"
                                        className="w-full bg-[#087f73] hover:bg-[#06635a] text-white text-xs h-9"
                                      >
                                        Setujui
                                      </Button>
                                      <Button
                                        type="submit"
                                        name="decision"
                                        value="rejected"
                                        variant="destructive"
                                        className="w-full text-xs h-9"
                                      >
                                        Tolak
                                      </Button>
                                      <Button
                                        type="submit"
                                        name="decision"
                                        value="needs_correction"
                                        variant="outline"
                                        className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 text-xs h-9"
                                      >
                                        Minta revisi
                                      </Button>
                                    </div>
                                  </form>
                                  {group.items.length > 1 ? (
                                    <form
                                      action={approveApprovalGroupAction}
                                      className="border-outline-ghost/70 mt-3 border-t pt-3"
                                    >
                                      {group.items.map((approvalItem) => (
                                        <input
                                          key={approvalItem.approvalId}
                                          type="hidden"
                                          name="approvalIds"
                                          value={approvalItem.approvalId}
                                        />
                                      ))}
                                      <Button type="submit" variant="outline" size="dense" className="w-full text-xs">
                                        Setujui semua milik {group.requesterName}
                                      </Button>
                                    </form>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </CardContent>
    </Card>
  )
}

function HistoryTab({ groups }: { groups: ApprovalCenterData['historyGroups'] }) {
  if (groups.length === 0) {
    return (
      <Card className="bg-surface-container-lowest rounded-[1.6rem] shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle>Riwayat approval</CardTitle>
          <CardDescription>
            Belum ada pengajuan Anda yang masuk ke workflow approval.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sites = Array.from(
    new Set(groups.flatMap((group) => group.items.map((item) => item.siteName)))
  ).sort()
  const priorities = Array.from(
    new Set(groups.flatMap((group) => group.items.map((item) => item.priority)))
  ).sort()
  const statuses = Array.from(
    new Set(groups.flatMap((group) => group.items.map((item) => item.status)))
  ).sort()

  return (
    <Card className="bg-surface-container-lowest rounded-[1.4rem] border-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
      <CardContent className="pt-6">
        <MinimalTableShell
          title="Jejak keputusan Approval Inbox"
          description="Lacak keputusan yang sudah lewat dari antrian approval Anda. Status pengajuan milik Anda tetap dibuka dari Request Center."
          label="request history"
          fileName="approval-history"
          searchPlaceholder="Cari pengajuan, site, approver, workflow, atau hasil keputusan..."
          dateFilter
          filters={
            <ApprovalFilterBar sites={sites} priorities={priorities} statusOptions={statuses} />
          }
          presets={
            <TableFilterPresets
              presets={[
                { label: 'Disetujui', filters: { status: 'approved' } },
                { label: 'Perlu revisi', filters: { status: 'needs_revision' } },
              ]}
            />
          }
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
                        <p className="text-foreground font-semibold">{item.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.activityType} • {item.unitNumber}{(item as any).tireCount ? ` • ${(item as any).tireCount} Tire` : ''} • {group.workDateLabel}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <AdminStatusBadge value={item.priority} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground align-top text-sm">
                      {item.siteName}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <AdminStatusBadge value={item.status} />
                        <p className="text-muted-foreground text-xs">{item.lastDecision}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <p className="text-foreground">{item.pendingWith}</p>
                        <p className="text-muted-foreground text-xs">
                          Tahap {item.currentStepLabel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <p className="text-foreground">{item.workflowLabel}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.shiftLabel} • {item.timeRange}
                        </p>
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
                          <div className="bg-surface-container-low rounded-lg p-3">
                            <p className="text-foreground text-sm font-semibold">Jejak approval</p>
                            <div className="mt-2 space-y-2">
                              {item.notes.map((note) => (
                                <div
                                  key={note.id}
                                  className="bg-surface-container-lowest rounded-lg px-3 py-3 shadow-[inset_0_0_0_1px_var(--outline-ghost)]"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-foreground text-sm font-medium">
                                      {note.actor}
                                    </p>
                                    <AdminStatusBadge value={note.kind} />
                                  </div>
                                  <p className="text-foreground mt-2 text-sm">{note.message}</p>
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {note.at.toLocaleString('id-ID')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-surface-container-low rounded-lg p-3">
                            <p className="text-foreground text-sm font-semibold">Status per step</p>
                            <div className="mt-2 space-y-2">
                              {item.steps.map((step) => (
                                <div
                                  key={step.approvalId}
                                  className="bg-surface-container-lowest rounded-lg px-3 py-3 shadow-[inset_0_0_0_1px_var(--outline-ghost)]"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-foreground text-sm font-medium">
                                      L{step.level} • {step.label}
                                    </p>
                                    <AdminStatusBadge value={step.status} />
                                  </div>
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {step.approverName} •{' '}
                                    {step.reviewedAt
                                      ? step.reviewedAt.toLocaleString('id-ID')
                                      : 'Belum diputuskan'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </AdminDetailDrawer>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </CardContent>
    </Card>
  )
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
            label: 'Grup menunggu',
            value: `${data.inboxMetrics.pendingGroups}`,
            meta: 'Requester-hari yang masih perlu keputusan',
          },
          {
            label: 'Item pending',
            value: `${data.inboxMetrics.pendingActivities}`,
            meta: 'Pengajuan yang bisa diputuskan sekarang',
          },
          {
            label: 'Segera jatuh tempo',
            value: `${data.inboxMetrics.dueSoon}`,
            meta: 'Butuh diprioritaskan di shift ini',
          },
          {
            label: 'Terlambat',
            value: `${data.inboxMetrics.overdue}`,
            meta: 'Sudah melewati SLA review',
          },
          {
            label: 'Riwayat disetujui',
            value: `${data.historyMetrics.approved}`,
            meta: 'Pengajuan Anda yang selesai mulus',
          },
          {
            label: 'Riwayat ditolak',
            value: `${data.historyMetrics.rejected}`,
            meta: 'Butuh tindak lanjut atau submit ulang',
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
  )
}
