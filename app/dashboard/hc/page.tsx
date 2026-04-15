import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import { getHcPageData } from "@/lib/hero-admin";

export default async function HcPage() {
  const { attendance, trainings, wellness } = await getHcPageData();

  return (
    <AdminPageShell
      eyebrow="M7 • Human Capital Suite"
      title="HC & Workforce Desk"
      description="Tampilan backend web untuk attendance review, training expiry, dan wellness status karyawan."
    >
      <AdminMetricGrid
        items={[
          { label: "Attendance events", value: `${attendance.length}`, meta: "Check-in dan check-out aktif" },
          { label: "Training records", value: `${trainings.length}`, meta: "Status sertifikasi saat ini" },
          { label: "Wellness items", value: `${wellness.length}`, meta: "Rekam BMI, MCU, dan fit status" },
        ]}
      />

      <div className="grid gap-6">
        <AdminTableCard
          title="Attendance Review"
          description="Absensi selfie + GPS yang dibutuhkan admin untuk validasi."
          columns={["Employee", "Role", "Event", "Time", "Status", "Note"]}
          rows={attendance.map((row, index) => [
            row.employeeName,
            row.role,
            row.eventType,
            row.eventTime.toLocaleString("id-ID"),
            <AdminStatusBadge key={`${index}-status`} value={row.status} />,
            row.locationNote,
          ])}
        />
        <div className="grid gap-6 xl:grid-cols-2">
          <AdminTableCard
            title="Training Status"
            description="Sertifikasi yang aktif atau mendekati expiry."
            columns={["Employee", "Training", "Provider", "Expiry", "Status"]}
            rows={trainings.map((row, index) => [
              row.employeeName,
              row.trainingName,
              row.provider,
              row.expiresAt.toLocaleDateString("id-ID"),
              <AdminStatusBadge key={`${index}-status`} value={row.status} />,
            ])}
          />
          <AdminTableCard
            title="Wellness Status"
            description="Status kesehatan dan fit-for-work untuk monitoring HC."
            columns={["Employee", "Metric", "Value", "Status", "Notes"]}
            rows={wellness.map((row, index) => [
              row.employeeName,
              row.metricType,
              row.metricValue,
              <AdminStatusBadge key={`${index}-status`} value={row.status} />,
              row.notes,
            ])}
          />
        </div>
      </div>
    </AdminPageShell>
  );
}
