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
import type { getRequestCenterData } from "@/lib/approval-workspace";

type RequestCenterData = Awaited<ReturnType<typeof getRequestCenterData>>;

export function RequestCenterBoard({ data }: { data: RequestCenterData }) {
  return (
    <AdminPageShell
      eyebrow="M2 • Request Center"
      title={data.scopeLabel}
      description="Ringkasan request yang diajukan requester, lengkap dengan status akhir, approver aktif, dan workflow yang dipakai."
    >
      <AdminMetricGrid
        items={[
          { label: "Draft", value: `${data.metrics.draft}`, meta: "Draft template-driven yang belum disubmit ke approval route" },
          { label: "Submitted", value: `${data.metrics.submitted}`, meta: "Baru masuk ke engine namun belum dibaca approver" },
          { label: "In review", value: `${data.metrics.inReview}`, meta: "Sedang diproses approver aktif" },
          { label: "Need revision", value: `${data.metrics.needsRevision}`, meta: "Perlu diperbaiki requester" },
          { label: "Approved", value: `${data.metrics.approved}`, meta: "Sudah selesai lewat workflow" },
          { label: "Rejected", value: `${data.metrics.rejected}`, meta: "Berhenti di salah satu step approval" },
          { label: "Cancelled", value: `${data.metrics.cancelled}`, meta: "Draft atau request yang dibatalkan sebelum lanjut ke approval" },
        ]}
      />

      <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader className="bg-surface-container-low px-7 py-6">
          <CardTitle>Request List</CardTitle>
          <CardDescription>
            Saat ini request center masih berfokus ke Daily Activity. Form template lain akan ikut masuk ke daftar ini
            saat persistence template dan submission layer diaktifkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[170px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.requests.length > 0 ? (
                data.requests.map((request) => (
                  <TableRow
                    key={request.submissionId != null ? `submission-${request.submissionId}` : `activity-${request.activityId}`}
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
                      <p className="mt-1 text-xs text-muted-foreground">Priority {request.priority}</p>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="text-sm font-medium text-[#0f172a]">{request.currentStepLabel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Pending with {request.pendingWith}</p>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="text-sm text-[#0f172a]">{request.workflowLabel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{request.progressLabel}</p>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <AdminStatusBadge value={request.status.replaceAll("_", " ")} />
                        <p className="text-xs text-muted-foreground">
                          Last update {request.lastUpdatedAt.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {request.canCancel && request.submissionId != null ? (
                        <form action={cancelDraftSubmissionAction}>
                          <input type="hidden" name="submissionId" value={request.submissionId} />
                          <Button type="submit" size="sm" variant="outline" className="rounded-full px-4">
                            Cancel Draft
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
                    Belum ada request yang cocok dengan scope halaman ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
