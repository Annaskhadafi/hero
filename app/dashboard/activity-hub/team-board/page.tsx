import { AdminTableCard } from "@/components/admin-table-card";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { getActivityPageData } from "@/lib/hero-admin";

export default async function OperationsBoardPage() {
  const rows = await getActivityPageData();

  return (
    <AdminTableCard
      title="Operations Board"
      description="Tampilan web untuk supervisor/admin yang butuh melihat distribusi pekerjaan per orang dan prioritas unit secara cepat."
      columns={["Employee", "Title", "Unit", "Priority", "Status", "Time Window"]}
      rows={rows.map((row) => [
        row.employeeName,
        row.title,
        row.unitNumber,
        <AdminStatusBadge key={`${row.id}-priority`} value={row.priority} />,
        <AdminStatusBadge key={`${row.id}-status`} value={row.status} />,
        `${row.startTime.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${row.endTime.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      ])}
    />
  );
}
