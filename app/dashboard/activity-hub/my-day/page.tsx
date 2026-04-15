import { createActivityAction } from "@/app/dashboard/admin-actions";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminTableCard } from "@/components/admin-table-card";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getActivityFormOptions, getActivityPageData } from "@/lib/hero-admin";

const activityTypes = [
  { code: "TS", type: "Tire Service" },
  { code: "TR", type: "Tire Repair" },
  { code: "TE", type: "Technical Engineering" },
  { code: "TI", type: "Tire Inspection" },
  { code: "HS", type: "HSE Activity" },
  { code: "SB", type: "Standby / On-Call" },
  { code: "AD", type: "Administrative" },
];

export default async function ActivityQueuePage() {
  const [rows, employeeOptions] = await Promise.all([
    getActivityPageData(),
    getActivityFormOptions(),
  ]);
  const submitted = rows.filter((row) => row.status.toLowerCase() === "submitted").length;
  const approved = rows.filter((row) => row.status.toLowerCase() === "approved").length;
  const emergency = rows.filter((row) => row.priority.toLowerCase() === "emergency").length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight">Create activity</h2>
          <form action={createActivityAction} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Karyawan
              <select
                name="employeeId"
                required
                defaultValue=""
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              >
                <option value="" disabled>
                  Pilih karyawan
                </option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} • {employee.role} • {employee.siteName}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium">
              Tipe aktivitas
              <select
                name="activityType"
                required
                defaultValue=""
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              >
                <option value="" disabled>
                  Pilih tipe aktivitas
                </option>
                {activityTypes.map((item) => (
                  <option key={item.code} value={item.type}>
                    {item.code} • {item.type}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium">
              Kode aktivitas
              <select
                name="activityCode"
                required
                defaultValue="TS"
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              >
                {activityTypes.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium">
              Prioritas
              <select
                name="priority"
                required
                defaultValue="Normal"
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              >
                <option value="Normal">Normal</option>
                <option value="Emergency">Emergency</option>
                <option value="Safety">Safety</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium">
              Judul pekerjaan
              <Input name="title" required placeholder="Contoh: Pemasangan ban OTR unit HD785" />
            </label>

            <label className="space-y-2 text-sm font-medium">
              Unit / equipment
              <Input name="unitNumber" required placeholder="Contoh: HD785-17" />
            </label>

            <label className="space-y-2 text-sm font-medium">
              Waktu mulai
              <Input name="startTime" type="datetime-local" required />
            </label>

            <label className="space-y-2 text-sm font-medium">
              Waktu selesai
              <Input name="endTime" type="datetime-local" required />
            </label>

            <label className="space-y-2 text-sm font-medium">
              Kandidat lembur (menit)
              <Input
                name="overtimeMinutes"
                type="number"
                min="0"
                max="720"
                defaultValue="0"
                required
              />
            </label>

            <div className="md:col-span-2">
              <label className="space-y-2 text-sm font-medium">
                Remarks admin
                <Textarea
                  name="remarks"
                  required
                  placeholder="Catatan singkat yang akan ikut terbawa ke approval."
                />
              </label>
            </div>

            <div className="flex items-center justify-end md:col-span-2">
              <Button type="submit" className="rounded-full px-5">
                Simpan aktivitas
              </Button>
            </div>
          </form>
        </div>
      </section>

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
