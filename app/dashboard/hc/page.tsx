import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import {
  AttendanceRowActions,
  HcCrudForms,
  TrainingRowActions,
  WellnessRowActions,
} from "@/components/operational-crud-panels";
import { getHcPageData, getOperationalCrudOptions } from "@/lib/hero-admin";

export default async function HcPage() {
  const [{ attendance, trainings, wellness }, options] = await Promise.all([
    getHcPageData(),
    getOperationalCrudOptions(),
  ]);

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

      <HcCrudForms employees={options.employees} sites={options.sites} />

      <div className="grid gap-6">
        <AdminTableCard
          title="Attendance Review"
          description="Absensi selfie + GPS yang dibutuhkan admin untuk validasi."
          columns={["Employee", "Role", "Event", "Time", "Status", "Note", "Action"]}
          rows={attendance.map((row, index) => [
            row.employeeName,
            row.role,
            row.eventType,
            row.eventTime.toLocaleString("id-ID"),
            <AdminStatusBadge key={`${index}-status`} value={row.status} />,
            row.locationNote,
            <AttendanceRowActions
              key={`${row.id}-actions`}
              row={row}
              employees={options.employees}
              sites={options.sites}
            />,
          ])}
        />
        <div className="grid gap-6 xl:grid-cols-2">
          <AdminTableCard
            title="Training Status"
            description="Sertifikasi yang aktif atau mendekati expiry."
            columns={["Employee", "Training", "Provider", "Expiry", "Status", "Action"]}
            rows={trainings.map((row, index) => [
              row.employeeName,
              row.trainingName,
              row.provider,
              row.expiresAt.toLocaleDateString("id-ID"),
              <AdminStatusBadge key={`${index}-status`} value={row.status} />,
              <TrainingRowActions
                key={`${row.id}-actions`}
                row={row}
                employees={options.employees}
              />,
            ])}
          />
          <AdminTableCard
            title="Wellness Status"
            description="Status kesehatan dan fit-for-work untuk monitoring HC."
            columns={["Employee", "Metric", "Value", "Status", "Notes", "Action"]}
            rows={wellness.map((row, index) => [
              row.employeeName,
              row.metricType,
              row.metricValue,
              <AdminStatusBadge key={`${index}-status`} value={row.status} />,
              row.notes,
              <WellnessRowActions
                key={`${row.id}-actions`}
                row={row}
                employees={options.employees}
              />,
            ])}
          />
        </div>
      </div>
    </AdminPageShell>
  );
}
