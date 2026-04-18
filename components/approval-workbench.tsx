import { addApprovalCommentAction, reviewApprovalAction } from "@/app/dashboard/admin-actions";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { getApprovalWorkbenchData } from "@/lib/approval-workspace";

type ApprovalWorkbenchData = Awaited<ReturnType<typeof getApprovalWorkbenchData>>;

export function ApprovalWorkbench({ data }: { data: ApprovalWorkbenchData }) {
  const { metrics, queue, focus } = data;

  return (
    <AdminPageShell
      eyebrow="Approval"
      title="Approval Inbox"
      description="Pantau pengajuan yang menunggu keputusan, lihat detailnya, dan beri keputusan dari satu tempat."
    >
      <AdminMetricGrid
        items={[
          {
            label: "Menunggu approval",
            value: `${metrics.pendingApprovals}`,
            meta: "Pengajuan yang masih menunggu tindakan",
          },
          {
            label: "Segera jatuh tempo",
            value: `${metrics.dueSoon}`,
            meta: "Perlu diprioritaskan sebelum melewati batas waktu",
          },
          {
            label: "Terlambat",
            value: `${metrics.overdue}`,
            meta: "Sudah melewati batas waktu approval",
          },
          {
            label: "Perlu revisi",
            value: `${metrics.needsRevision}`,
            meta: "Pengajuan yang dikembalikan untuk diperbaiki",
          },
          {
            label: "Disetujui hari ini",
            value: `${metrics.approvedToday}`,
            meta: "Approval selesai hari ini",
          },
          {
            label: "Total pengajuan",
            value: `${metrics.totalApprovals}`,
            meta: "Semua pengajuan yang masuk ke daftar approval",
          },
        ]}
      />

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="queue">Daftar Approval</TabsTrigger>
          <TabsTrigger value="detail">Detail Approval</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
        <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
          <CardHeader className="bg-surface-container-low px-7 py-6">
            <CardTitle>Daftar Approval</CardTitle>
            <CardDescription>
              Pengajuan yang butuh keputusan ditampilkan berdasarkan prioritas dan batas waktunya.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <MinimalTableShell
              label="approval items"
              fileName="approval-inbox"
              searchPlaceholder="Cari pengajuan, pemeriksa, site, atau status..."
              summaryClassName="bg-transparent px-1 py-0 shadow-none"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pengajuan</TableHead>
                    <TableHead>Tahap</TableHead>
                    <TableHead>Pemeriksa</TableHead>
                    <TableHead>Batas Waktu</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioritas</TableHead>
                    <TableHead className="w-[240px]">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.length > 0 ? (
                    queue.map((item) => (
                      <TableRow
                        key={item.approvalId}
                        data-date-value={item.dueAt.toISOString()}
                        className={focus?.approvalId === item.approvalId ? "bg-surface-container-highest" : undefined}
                      >
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-medium text-[#0f172a]">
                              {item.activityTitle} • {item.unitNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.requesterName} • {item.siteName} • {item.activityType}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-medium text-[#0f172a]">L{item.level}</p>
                            <p className="text-xs text-muted-foreground">{item.currentStepLabel}</p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-medium text-[#0f172a]">{item.approverName}</p>
                            <p className="text-xs text-muted-foreground">
                              Jalur {item.resolutionSource.replaceAll("_", " ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="text-sm text-[#0f172a]">{item.dueAt.toLocaleString("id-ID")}</p>
                            <AdminStatusBadge value={item.dueState.replaceAll("_", " ")} />
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <AdminStatusBadge value={item.status} />
                        </TableCell>
                        <TableCell className="align-top">
                          <AdminStatusBadge value={item.priority} />
                        </TableCell>
                        <TableCell className="align-top">
                          {item.isPending ? (
                            <div className="flex flex-wrap gap-2">
                              <form action={reviewApprovalAction}>
                                <input type="hidden" name="approvalId" value={item.approvalId} />
                                <input type="hidden" name="decision" value="approved" />
                                <Button type="submit" size="sm" className="rounded-full px-4">
                                  Setujui
                                </Button>
                              </form>
                              <form action={reviewApprovalAction}>
                                <input type="hidden" name="approvalId" value={item.approvalId} />
                                <input type="hidden" name="decision" value="rejected" />
                                <Button type="submit" size="sm" variant="secondary" className="rounded-full px-4">
                                  Tolak
                                </Button>
                              </form>
                              <form action={reviewApprovalAction}>
                                <input type="hidden" name="approvalId" value={item.approvalId} />
                                <input type="hidden" name="decision" value="needs_correction" />
                                <Button type="submit" size="sm" variant="outline" className="rounded-full px-4">
                                  Revisi
                                </Button>
                              </form>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-sm text-[#0f172a]">Sudah ditinjau</p>
                              <p className="text-xs text-muted-foreground">{item.commentsCount} catatan tersimpan</p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Belum ada pengajuan yang menunggu approval.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </MinimalTableShell>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="detail" className="space-y-6">
        {focus ? (
          <div className="space-y-6">
            <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
              <CardHeader>
                <CardTitle>{focus.title}</CardTitle>
                <CardDescription>
                  {focus.formName} • {focus.requesterName} • {focus.requesterDepartment || "-"}
                  {focus.requestNumber ? ` • ${focus.requestNumber}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Tahap Saat Ini</p>
                    <p className="mt-2 font-medium text-[#0f172a]">{focus.currentStepLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{focus.currentApprover}</p>
                  </div>
                  <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Batas Waktu & Status</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <AdminStatusBadge value={focus.activityStatus} />
                      <AdminStatusBadge value={focus.dueState.replaceAll("_", " ")} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{focus.dueAt.toLocaleString("id-ID")}</p>
                  </div>
                </div>

                <form action={reviewApprovalAction} className="space-y-3 rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                  <input type="hidden" name="approvalId" value={focus.approvalId} />
                  <p className="text-sm font-medium text-[#0f172a]">Keputusan Approval</p>
                  <Textarea
                    name="note"
                    rows={4}
                    placeholder="Tambahkan komentar, alasan penolakan, atau catatan revisi sebelum mengirim keputusan..."
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" name="decision" value="approved" className="rounded-full px-4">
                      Setujui
                    </Button>
                    <Button
                      type="submit"
                      name="decision"
                      value="rejected"
                      variant="secondary"
                      className="rounded-full px-4"
                    >
                      Tolak
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
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
              <CardHeader>
                <CardTitle>Ringkasan Pengajuan</CardTitle>
                <CardDescription>Data pengajuan yang sedang ditinjau.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {focus.previewFields.map((field) => (
                  <div key={field.label} className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{field.label}</p>
                    <p className="mt-2 text-sm font-medium text-[#0f172a]">{field.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {focus.attachments.length > 0 ? (
              <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
                <CardHeader>
                  <CardTitle>Lampiran</CardTitle>
                  <CardDescription>File dan foto pendukung yang dikirim bersama pengajuan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {focus.attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#0f172a]">{attachment.fileName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {attachment.attachmentKind.replaceAll("_", " ")} • {attachment.mimeType} •{" "}
                            {attachment.createdAt.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <a
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-12 items-center justify-center rounded-full bg-surface-container-low px-4 text-xs font-semibold uppercase tracking-[0.08em] text-foreground shadow-[inset_0_-2px_0_rgba(66,71,80,0.08),0_10px_20px_rgba(0,52,97,0.05)] ring-1 ring-outline-ghost"
                        >
                          Buka file
                        </a>
                      </div>
                      {attachment.mimeType.startsWith("image/") ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachment.fileUrl}
                            alt={attachment.fileName}
                            className="mt-4 h-56 w-full rounded-2xl object-cover"
                          />
                        </>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
              <CardHeader>
                <CardTitle>Jalur Approval</CardTitle>
                <CardDescription>Urutan pemeriksa yang berlaku saat pengajuan dikirim.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {focus.workflow.warnings.length > 0 ? (
                  <Alert className="bg-[#fffbeb]">
                    <AlertDescription className="text-[#92400e]">
                      {focus.workflow.warnings.join(" ")}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {focus.workflow.matrixName ? <AdminStatusBadge value={focus.workflow.matrixName} /> : null}
                  {focus.workflow.structureName ? <AdminStatusBadge value={focus.workflow.structureName} /> : null}
                </div>

                <div className="space-y-3">
                  {focus.workflow.steps.map((step) => (
                    <div key={`${step.stepOrder}-${step.label}`} className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#0f172a]">
                            Tahap {step.stepOrder} • {step.label}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {step.approverName} • jalur {step.resolutionSource.replaceAll("_", " ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <AdminStatusBadge value={step.status} />
                          <AdminStatusBadge value={`Batas ${step.slaHours} Jam`} />
                        </div>
                      </div>
                      {(step.fallbackLabel || step.escalationLabel) ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Pengganti: {step.fallbackLabel || "-"} • Eskalasi: {step.escalationLabel || "-"}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
              <CardHeader>
                <CardTitle>Komentar Approval</CardTitle>
                <CardDescription>Komentar pemohon, pemeriksa, dan catatan keputusan tersimpan rapi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={addApprovalCommentAction} className="space-y-3 rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                  <input type="hidden" name="approvalId" value={focus.approvalId} />
                  <Textarea
                    name="comment"
                    rows={3}
                    placeholder="Tambahkan komentar tanpa mengubah status approval..."
                  />
                  <Button type="submit" variant="outline" className="rounded-full px-4">
                    Simpan Komentar
                  </Button>
                </form>

                <ScrollArea className="h-80 rounded-[1.2rem] bg-surface-container-low">
                  <div className="space-y-3 p-4">
                    {focus.comments.map((comment) => (
                      <div key={comment.id} className="rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-[#0f172a]">{comment.actor}</p>
                            <p className="text-xs text-muted-foreground">
                              {comment.role} • {comment.at.toLocaleString("id-ID")}
                            </p>
                          </div>
                          <AdminStatusBadge value={comment.kind.replaceAll("_", " ")} />
                        </div>
                        <p className="mt-3 text-sm text-[#0f172a]">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
              <CardHeader>
                <CardTitle>Riwayat Approval</CardTitle>
                <CardDescription>Urutan pengajuan, penugasan, komentar, dan keputusan approval.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80 rounded-[1.2rem] bg-surface-container-low">
                  <div className="space-y-3 p-4">
                    {focus.timeline.map((item) => (
                      <div key={item.id} className="rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-[#0f172a]">{item.label}</p>
                          <AdminStatusBadge value={item.tone.replaceAll("_", " ")} />
                        </div>
                        <p className="mt-2 text-sm text-[#0f172a]">{item.detail}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{item.at.toLocaleString("id-ID")}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
            <CardHeader>
              <CardTitle>Ruang Approval</CardTitle>
              <CardDescription>Belum ada approval untuk ditinjau.</CardDescription>
            </CardHeader>
          </Card>
        )}
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
