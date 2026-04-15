import { reviewApprovalAction } from "@/app/dashboard/admin-actions";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import { Button } from "@/components/ui/button";
import { getApprovalPageData } from "@/lib/hero-admin";

export default async function ApprovalPage() {
  const rows = await getApprovalPageData();
  const pending = rows.filter((row) => row.status === "pending").length;
  const approved = rows.filter((row) => row.status === "approved").length;

  return (
    <AdminPageShell
      eyebrow="M2 • Approval Engine"
      title="Approval Queue"
      description="Antrian approval admin web untuk review aktivitas, overtime, dan alur L1/L2 tanpa pola mobile-first."
    >
      <AdminMetricGrid
        items={[
          { label: "Total approvals", value: `${rows.length}`, meta: "Semua approval terkait aktivitas" },
          { label: "Pending", value: `${pending}`, meta: "Perlu tindakan approver" },
          { label: "Approved", value: `${approved}`, meta: "Sudah lolos review" },
        ]}
      />
      <AdminTableCard
        title="Approval Items"
        description="Approval yang terhubung langsung ke aktivitas dan kandidat lembur, lengkap dengan aksi review dari admin web."
        columns={["Employee", "Activity", "Level", "Approver", "Submitted", "Overtime", "Status", "Priority", "Action"]}
        rows={rows.map((row, index) => [
          row.employeeName,
          `${row.activityTitle} • ${row.unitNumber}`,
          `L${row.level}`,
          row.approverName,
          row.submittedAt.toLocaleString("id-ID"),
          `${(row.overtimeMinutes / 60).toFixed(1)} jam`,
          <AdminStatusBadge key={`${index}-status`} value={row.status} />,
          <AdminStatusBadge key={`${index}-priority`} value={row.priority} />,
          row.status === "pending" ? (
            <div key={`${index}-actions`} className="flex gap-2">
              <form action={reviewApprovalAction}>
                <input type="hidden" name="approvalId" value={row.approvalId} />
                <input type="hidden" name="decision" value="approved" />
                <Button type="submit" size="sm" className="rounded-full px-4">
                  Approve
                </Button>
              </form>
              <form action={reviewApprovalAction}>
                <input type="hidden" name="approvalId" value={row.approvalId} />
                <input type="hidden" name="decision" value="needs_correction" />
                <Button type="submit" size="sm" variant="outline" className="rounded-full px-4">
                  Return
                </Button>
              </form>
            </div>
          ) : (
            "Reviewed"
          ),
        ])}
      />
    </AdminPageShell>
  );
}
