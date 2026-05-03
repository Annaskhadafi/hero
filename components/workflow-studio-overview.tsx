import Link from "next/link";
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
import type { getWorkflowStudioConsoleData } from "@/lib/approval-blueprint";

type WorkflowStudioOverviewData = Awaited<ReturnType<typeof getWorkflowStudioConsoleData>>;

const conditionLabels: Record<string, string> = {
  site: "Lokasi kerja",
  priority: "Prioritas permintaan",
  overtimeMinutes: "Durasi lembur",
};

function formatConditionField(field: string) {
  if (conditionLabels[field]) {
    return conditionLabels[field];
  }

  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function WorkflowStudioOverview({ data }: { data: WorkflowStudioOverviewData }) {
  const workflowModes = data.workflows.map((workflow) => ({
    id: workflow.id,
    title: workflow.name,
    status: workflow.latestVersion?.publishStatus ?? (workflow.isActive ? "needs review" : "planned"),
    summary: `${workflow.mode.replaceAll("_", " ")} dengan ${workflow.stepRules.length} tahapan persetujuan, ${workflow.conditions.length} kriteria keputusan, ${workflow.notificationRules.length} notifikasi, dan ${workflow.reminderRules.length} pengingat.`,
  }));
  const conditionRows = [
    ...Array.from(
      data.workflows
        .flatMap((workflow) => workflow.conditions)
        .reduce<Map<string, string[]>>((map, condition) => {
          const bucket = map.get(condition.fieldKey) ?? [];
          if (!bucket.includes(condition.operator)) {
            bucket.push(condition.operator);
          }
          map.set(condition.fieldKey, bucket);
          return map;
        }, new Map())
        .entries(),
    ).map(([field]) => ({
      field: formatConditionField(field),
      status: "ready",
      detail: `Sudah bisa dipakai untuk mengarahkan approval berdasarkan ${formatConditionField(field).toLowerCase()}.`,
    })),
    {
      field: "Kombinasi beberapa kriteria",
      status: data.metrics.conditions > 0 ? "needs review" : "planned",
      detail: "Butuh tampilan yang lebih sederhana agar admin dapat menggabungkan beberapa syarat tanpa bantuan teknis.",
    },
    {
      field: "Kelengkapan lampiran",
      status: "planned",
      detail: "Akan dipakai untuk membedakan permintaan yang wajib melampirkan dokumen pendukung.",
    },
    {
      field: "Batas nominal",
      status: "planned",
      detail: "Akan membantu approval bernilai besar naik ke level pemeriksa yang sesuai.",
    },
  ];

  return (
    <AdminPageShell
      eyebrow="Approval Operations"
      title="Workflow Studio"
      description="Pusat pengaturan alur approval, tahapan pemeriksa, notifikasi, pengingat, dan kesiapan aturan operasional."
    >
      <AdminMetricGrid
        items={[
          { label: "Alur Approval", value: `${data.metrics.workflows}`, meta: "Jenis proses yang sudah punya jalur pemeriksaan" },
          { label: "Versi Aktif", value: `${data.metrics.versions}`, meta: "Riwayat perubahan alur yang dapat ditinjau ulang" },
          { label: "Kriteria", value: `${data.metrics.conditions}`, meta: "Syarat yang membantu menentukan jalur approval" },
          { label: "Jalur Keputusan", value: `${data.metrics.branches}`, meta: "Pilihan arah proses sesuai kondisi permintaan" },
          { label: "Notifikasi", value: `${data.metrics.notificationRules}`, meta: "Pemberitahuan otomatis untuk pihak terkait" },
          { label: "Pengingat", value: `${data.metrics.reminderRules}`, meta: "Reminder sebelum atau sesudah batas waktu" },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {workflowModes.map((mode) => (
          <Card key={mode.id} className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{mode.title}</CardTitle>
                  <CardDescription>Kesiapan alur approval HERO</CardDescription>
                </div>
                <AdminStatusBadge value={mode.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[#0f172a]">{mode.summary}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/dashboard/master-data">Master Data</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/dashboard/approval">Approval Inbox</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/dashboard/notifications">Notification Center</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader className="bg-surface-container-low px-7 py-6">
          <CardTitle>Kesiapan Kriteria Approval</CardTitle>
          <CardDescription>
            Kesiapan kriteria approval yang dapat dipakai admin untuk mengarahkan permintaan ke pemeriksa yang tepat.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kriteria Approval</TableHead>
                <TableHead>Kesiapan</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conditionRows.map((condition) => (
                <TableRow key={condition.field}>
                  <TableCell className="font-medium text-[#0f172a]">{condition.field}</TableCell>
                  <TableCell>
                    <AdminStatusBadge value={condition.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{condition.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
