import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import { HcWorkspaceBanner } from "@/components/hc/hc-workspace-banner";
import { TableFilterPresets } from "@/components/table-filter-presets";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
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
  const siteOptions = Array.from(new Set(options.sites.map((site) => site.name))).sort();
  const attendanceStatuses = Array.from(new Set(attendance.map((row) => row.status))).sort();
  const attendanceEvents = Array.from(new Set(attendance.map((row) => row.eventType))).sort();
  const trainingDepartments = Array.from(new Set(trainings.map((row) => row.department))).sort();
  const trainingStatuses = Array.from(new Set(trainings.map((row) => row.status))).sort();
  const wellnessMetrics = Array.from(new Set(wellness.map((row) => row.metricType))).sort();
  const wellnessStatuses = Array.from(new Set(wellness.map((row) => row.status))).sort();

  return (
    <AdminPageShell
      eyebrow="M7 • Human Capital Suite"
      title="HC & Workforce Desk"
      description="Tampilan backend web untuk attendance review, training expiry, dan wellness status karyawan."
    >
      <HcWorkspaceBanner
        title="Workforce Operations Hub"
        description="Attendance, training, dan wellness diringkas sebagai ruang kerja HC yang table-first: cepat filter, cepat validasi, cepat tindak lanjut."
        items={[
          { label: "Attendance", value: attendance.length, tone: "slate" },
          { label: "Training", value: trainings.length, tone: "sky" },
          { label: "Wellness", value: wellness.length, tone: "emerald" },
        ]}
      />

      <AdminMetricGrid
        mode="compact"
        items={[
          { label: "Event attendance", value: `${attendance.length}`, meta: "Check-in dan check-out tercatat" },
          { label: "Record training", value: `${trainings.length}`, meta: "Status sertifikasi aktif" },
          { label: "Catatan wellness", value: `${wellness.length}`, meta: "MCU, BMI, dan fit-to-work" },
        ]}
      />

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl bg-slate-100/80 p-1">
          <TabsTrigger value="attendance">Review attendance</TabsTrigger>
          <TabsTrigger value="training">Status training</TabsTrigger>
          <TabsTrigger value="wellness">Status wellness</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <AdminTableCard
            title="Review attendance"
            description="Validasi check-in, check-out, dan catatan GPS dalam satu antrian yang mudah dipilah."
            columns={["Employee", "Role", "Event", "Time", "Status", "Note", "Action"]}
            dateFilter
            actions={<HcCrudForms employees={options.employees} sites={options.sites} categoryOptions={options.categoryOptions} mode="attendance" />}
            presets={<TableFilterPresets presets={[{ label: "Aman", filters: { status: "healthy" } }, { label: "Perlu tindak lanjut", filters: { status: "follow_up" } }]} />}
            filters={
              <>
                <TableMultiFilter label="site" filterKey="site" options={siteOptions.map((option) => ({ value: option, label: option }))} />
                <TableMultiFilter label="event" filterKey="event" options={attendanceEvents.map((option) => ({ value: option, label: option }))} />
                <TableMultiFilter label="status" filterKey="status" options={attendanceStatuses.map((option) => ({ value: option, label: option }))} />
              </>
            }
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
                categoryOptions={options.categoryOptions}
              />,
            ])}
            rowAttributes={attendance.map((row) => ({
              "data-date-value": row.eventTime.toISOString(),
              "data-filter-site": options.sites.find((site) => site.id === row.siteId)?.name ?? "",
              "data-filter-event": row.eventType,
              "data-filter-status": row.status,
            }))}
          />
        </TabsContent>

        <TabsContent value="training">
          <AdminTableCard
            title="Status training"
            description="Pantau sertifikasi aktif, yang segera expired, dan record yang perlu diperbarui."
            columns={["Employee", "Training", "Provider", "Year", "Expiry", "Status", "Action"]}
            dateFilter
            actions={<HcCrudForms employees={options.employees} sites={options.sites} categoryOptions={options.categoryOptions} mode="training" />}
            presets={<TableFilterPresets presets={[{ label: "Aman", filters: { status: "healthy" } }, { label: "Perlu tindak lanjut", filters: { status: "follow_up" } }]} />}
            filters={
              <>
                <TableMultiFilter label="departemen" filterKey="department" options={trainingDepartments.map((option) => ({ value: option, label: option }))} />
                <TableMultiFilter label="status" filterKey="status" options={trainingStatuses.map((option) => ({ value: option, label: option }))} />
              </>
            }
            rows={trainings.map((row, index) => [
              row.employeeName,
              row.trainingName,
              row.provider,
              row.completedYear,
              row.expiresAt ? row.expiresAt.toLocaleDateString("id-ID") : "No expiry",
              <AdminStatusBadge key={`${index}-status`} value={row.status} />,
              <TrainingRowActions
                key={`${row.id}-actions`}
                row={row}
                employees={options.employees}
                categoryOptions={options.categoryOptions}
              />,
            ])}
            rowAttributes={trainings.map((row) => ({
              "data-date-value": row.expiresAt?.toISOString?.() ?? "",
              "data-filter-department": row.department,
              "data-filter-status": row.status,
            }))}
          />
        </TabsContent>

        <TabsContent value="wellness">
          <AdminTableCard
            title="Status wellness"
            description="Monitoring fit-to-work, MCU, dan indikator kesehatan yang butuh tindak lanjut HC."
            columns={["Employee", "Metric", "Value", "Status", "Notes", "Action"]}
            dateFilter
            actions={<HcCrudForms employees={options.employees} sites={options.sites} categoryOptions={options.categoryOptions} mode="wellness" />}
            presets={<TableFilterPresets presets={[{ label: "Aman", filters: { status: "healthy" } }, { label: "Perlu tindak lanjut", filters: { status: "follow_up" } }]} />}
            filters={
              <>
                <TableMultiFilter label="metrik" filterKey="metric" options={wellnessMetrics.map((option) => ({ value: option, label: option }))} />
                <TableMultiFilter label="status" filterKey="status" options={wellnessStatuses.map((option) => ({ value: option, label: option }))} />
              </>
            }
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
                categoryOptions={options.categoryOptions}
              />,
            ])}
            rowAttributes={wellness.map((row) => ({
              "data-date-value": row.recordedAt.toISOString(),
              "data-filter-metric": row.metricType,
              "data-filter-status": row.status,
            }))}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}





