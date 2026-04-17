import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminTableCard } from "@/components/admin-table-card";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { ActivityTemplateForm } from "@/components/activity-template-form";
import { ensureHeroSeedData, getActivityPageData } from "@/lib/hero-admin";
import { getDailyActivityTemplateFormData } from "@/lib/approval-blueprint";

export default async function ActivityQueuePage() {
  await ensureHeroSeedData();

  const [rows, templateData] = await Promise.all([
    getActivityPageData(),
    getDailyActivityTemplateFormData(),
  ]);

  const submitted = rows.filter((row) => row.status.toLowerCase() === "submitted").length;
  const approved = rows.filter((row) => row.status.toLowerCase() === "approved").length;
  const emergency = rows.filter((row) => row.priority.toLowerCase() === "emergency").length;

  return (
    <div className="space-y-6">
      {templateData ? <ActivityTemplateForm data={templateData} /> : null}

      <AdminMetricGrid
        items={[
          {
            label: "Total activities",
            value: `${rows.length}`,
            meta: "Semua aktivitas site yang sudah masuk",
          },
          {
            label: "Submitted",
            value: `${submitted}`,
            meta: "Menunggu review atau approval",
          },
          {
            label: "Approved",
            value: `${approved}`,
            meta: "Sudah masuk alur berikutnya",
          },
          {
            label: "Emergency jobs",
            value: `${emergency}`,
            meta: "Perlu perhatian prioritas",
          },
        ]}
      />

      <AdminTableCard
        title="Activity Queue"
        description="Daftar aktivitas harian yang masuk dari lapangan, ditampilkan dalam gaya admin web untuk review dan pengendalian operasional."
        columns={[
          "Code",
          "Employee",
          "Type",
          "Unit",
          "Duration",
          "Status",
          "Priority",
          "Site",
        ]}
        rows={rows.map((row) => [
          row.code,
          row.employeeName,
          row.type,
          row.unitNumber,
          row.duration,
          <AdminStatusBadge key={`${row.id}-status`} value={row.status} />,
          <AdminStatusBadge key={`${row.id}-priority`} value={row.priority} />,
          row.siteName,
        ])}
      />
    </div>
  );
}
