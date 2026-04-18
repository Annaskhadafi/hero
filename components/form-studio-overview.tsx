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
import type { getFormStudioConsoleData } from "@/lib/approval-blueprint";

type FormStudioOverviewData = Awaited<ReturnType<typeof getFormStudioConsoleData>>;

export function FormStudioOverview({ data }: { data: FormStudioOverviewData }) {
  const capabilityRows = [
    {
      capability: "Katalog form",
      status: data.metrics.templates > 0 ? "ready" : "planned",
      detail: "Form approval utama sudah tersedia untuk dipilih sesuai kebutuhan operasional.",
    },
    {
      capability: "Riwayat perubahan",
      status: data.metrics.versions > 0 ? "needs review" : "planned",
      detail: "Perubahan form dapat ditinjau, namun pengalaman edit masih perlu disederhanakan.",
    },
    {
      capability: "Bagian dan isian form",
      status: data.metrics.fields > 0 && data.metrics.sections > 0 ? "ready" : "planned",
      detail: "Bagian, pertanyaan, pilihan, dan validasi form sudah tersusun untuk kebutuhan admin.",
    },
    {
      capability: "Pratinjau form",
      status: data.templates.some((template) => template.templateKey === "daily-activity") ? "ready" : "needs review",
      detail: "Form Daily Activity sudah dapat menjadi contoh awal untuk proses berikutnya.",
    },
    {
      capability: "Editor tanpa bantuan teknis",
      status: "planned",
      detail: "Admin nantinya dapat menyusun form sendiri tanpa mengubah kode aplikasi.",
    },
  ] as const;

  return (
    <AdminPageShell
      eyebrow="Approval Forms"
      title="Form Studio"
      description="Katalog form approval untuk menyiapkan formulir baru dengan alur yang lebih mudah dikelola admin."
    >
      <AdminMetricGrid
        items={[
          { label: "Template", value: `${data.metrics.templates}`, meta: "Pilihan form yang siap dipakai lintas modul" },
          { label: "Versi", value: `${data.metrics.versions}`, meta: "Riwayat perubahan form yang dapat ditinjau" },
          { label: "Bagian", value: `${data.metrics.sections}`, meta: "Kelompok isian yang membentuk struktur form" },
          { label: "Isian", value: `${data.metrics.fields}`, meta: "Pertanyaan dan kolom yang tersedia di form" },
          { label: "Pengajuan", value: `${data.metrics.submissions}`, meta: "Draft dan permintaan yang sudah masuk" },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {data.templates.map((template) => {
          const fieldCount = template.sections.reduce((total, section) => total + section.fields.length, 0);

          return (
          <Card key={template.id} className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.category}</CardDescription>
                </div>
                <AdminStatusBadge
                  value={template.latestVersion?.publishStatus ?? (template.isActive ? "partial" : "backlog")}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Jenis proses</p>
                  <p className="mt-2 text-sm font-medium text-[#0f172a]">{template.workflowMode.replaceAll("_", " ")}</p>
                </div>
                <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Jumlah isian</p>
                  <p className="mt-2 text-sm font-medium text-[#0f172a]">{fieldCount} isian</p>
                </div>
                <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Draft tersimpan</p>
                  <p className="mt-2 text-sm font-medium text-[#0f172a]">{template.draftCount} draft</p>
                </div>
              </div>
              <p className="text-sm text-[#0f172a]">{template.description || "Template form untuk proses approval HERO."}</p>
              <p className="text-xs text-muted-foreground">
                {template.sections.length} bagian • {template.versionCount} versi • status terbaru{" "}
                {template.latestVersion?.publishStatus ?? "draft"}
              </p>
            </CardContent>
          </Card>
          );
        })}
      </div>

      <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader className="bg-surface-container-low px-7 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Kesiapan Form</CardTitle>
              <CardDescription>
                Ringkasan kesiapan agar admin dapat memilih, meninjau, dan menyusun form dengan lebih mudah.
              </CardDescription>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard/workflow-studio">Buka Workflow Studio</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {capabilityRows.map((item) => (
                <TableRow key={item.capability}>
                  <TableCell className="font-medium text-[#0f172a]">{item.capability}</TableCell>
                  <TableCell>
                    <AdminStatusBadge value={item.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
