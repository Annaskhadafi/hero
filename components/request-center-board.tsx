import { cancelDraftSubmissionAction } from "@/app/dashboard/admin-actions";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import type { getRequestCenterData } from "@/lib/approval-workspace";

type RequestCenterData = Awaited<ReturnType<typeof getRequestCenterData>>;

export function RequestCenterBoard({ data }: { data: RequestCenterData }) {
  return (
    <AdminPageShell
      eyebrow="Request Center"
      title={data.scopeLabel}
      description="Ringkasan pengajuan karyawan, status terakhir, pemeriksa aktif, dan alur approval yang berjalan."
    >
      <AdminMetricGrid
        items={[
          { label: "Tersimpan", value: `${data.metrics.draft}`, meta: "Pengajuan yang masih disimpan sementara" },
          { label: "Dikirim", value: `${data.metrics.submitted}`, meta: "Pengajuan yang sudah masuk daftar approval" },
          { label: "Ditinjau", value: `${data.metrics.inReview}`, meta: "Sedang diproses pemeriksa aktif" },
          { label: "Perlu revisi", value: `${data.metrics.needsRevision}`, meta: "Perlu diperbaiki oleh pemohon" },
          { label: "Disetujui", value: `${data.metrics.approved}`, meta: "Pengajuan sudah selesai disetujui" },
          { label: "Ditolak", value: `${data.metrics.rejected}`, meta: "Pengajuan berhenti di salah satu tahap approval" },
          { label: "Dibatalkan", value: `${data.metrics.cancelled}`, meta: "Pengajuan yang dibatalkan sebelum selesai" },
        ]}
      />

      <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader className="bg-surface-container-low px-7 py-6">
          <CardTitle>Daftar Pengajuan</CardTitle>
          <CardDescription>
            Saat ini daftar berfokus ke Daily Activity. Jenis form lain akan ikut tampil saat prosesnya tersedia untuk tim.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <MinimalTableShell
            label="requests"
            fileName="request-center"
            searchPlaceholder="Cari pengajuan, requester, form, atau workflow..."
            summaryClassName="bg-transparent px-1 py-0 shadow-none"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengajuan</TableHead>
                  <TableHead>Dikirim</TableHead>
                  <TableHead>Tahap saat ini</TableHead>
                  <TableHead>Alur</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[170px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.requests.length > 0 ? (
                  data.requests.map((request) => (
                    <TableRow
                      key={request.submissionId != null ? `submission-${request.submissionId}` : `activity-${request.activityId}`}
                      data-date-value={request.lastUpdatedAt.toISOString()}
                    >
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium text-[#0f172a]">
                            {request.title} • {request.unitNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.formName} • {request.activityType} • {request.siteName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.requesterName} • {request.requesterJobTitle}
                          </p>
                          {request.requestNumber ? (
                            <p className="text-xs text-muted-foreground">Ref {request.requestNumber}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="text-sm text-[#0f172a]">{request.submittedAt.toLocaleString("id-ID")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Prioritas {request.priority}</p>
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="text-sm font-medium text-[#0f172a]">{request.currentStepLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Menunggu {request.pendingWith}</p>
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="text-sm text-[#0f172a]">{request.workflowLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{request.progressLabel}</p>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-2">
                          <AdminStatusBadge value={request.status.replaceAll("_", " ")} />
                          <p className="text-xs text-muted-foreground">
                            Update terakhir {request.lastUpdatedAt.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {request.canCancel && request.submissionId != null ? (
                          <form action={cancelDraftSubmissionAction}>
                            <input type="hidden" name="submissionId" value={request.submissionId} />
                            <Button type="submit" size="sm" variant="outline" className="rounded-full px-4">
                              Batalkan Draft
                            </Button>
                          </form>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {request.status === "cancelled" ? "Sudah dibatalkan" : "Tidak ada aksi"}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Belum ada pengajuan yang cocok dengan halaman ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
