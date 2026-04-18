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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="attendance">Attendance Review</TabsTrigger>
          <TabsTrigger value="training">Training Status</TabsTrigger>
          <TabsTrigger value="wellness">Wellness Status</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
        <AdminTableCard
          title="Attendance Review"
          description="Absensi selfie + GPS yang dibutuhkan admin untuk validasi."
          columns={["Employee", "Role", "Event", "Time", "Status", "Note", "Action"]}
          dateFilter
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
        </TabsContent>

        <TabsContent value="training">
          <AdminTableCard
            title="Training Status"
            description="Sertifikasi yang aktif atau mendekati expiry."
            columns={["Employee", "Training", "Provider", "Expiry", "Status", "Action"]}
            dateFilter
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
        </TabsContent>

        <TabsContent value="wellness">
          <AdminTableCard
            title="Wellness Status"
            description="Status kesehatan dan fit-for-work untuk monitoring HC."
            columns={["Employee", "Metric", "Value", "Status", "Notes", "Action"]}
            dateFilter={false}
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
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
