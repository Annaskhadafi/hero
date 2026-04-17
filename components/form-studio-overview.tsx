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
      capability: "Template catalog",
      status: data.metrics.templates > 0 ? "live" : "backlog",
      detail: "Katalog form approval lintas modul sudah tersimpan di blueprint runtime.",
    },
    {
      capability: "Versioning & publish flow",
      status: data.metrics.versions > 0 ? "partial" : "backlog",
      detail: "Versioned entity dan publish status sudah ada, tetapi editor publish penuh belum dibuat.",
    },
    {
      capability: "Field / section registry",
      status: data.metrics.fields > 0 && data.metrics.sections > 0 ? "live" : "backlog",
      detail: "Section, field, option, dan validation entity sudah aktif sebagai runtime metadata.",
    },
    {
      capability: "Template preview form",
      status: data.templates.some((template) => template.templateKey === "daily-activity") ? "live" : "partial",
      detail: "Daily Activity sudah memakai form template-driven sebagai starter template pertama.",
    },
    {
      capability: "Visual builder",
      status: "backlog",
      detail: "No-code builder drag-and-drop untuk field/section masih fase berikutnya.",
    },
  ] as const;

  return (
    <AdminPageShell
      eyebrow="M2 • Form Studio"
      title="Form Studio"
      description="Katalog template approval dan readiness matrix untuk membuat form baru tanpa hardcode ulang engine."
    >
      <AdminMetricGrid
        items={[
          { label: "Templates", value: `${data.metrics.templates}`, meta: "Template form yang sudah terdaftar di catalog blueprint" },
          { label: "Versions", value: `${data.metrics.versions}`, meta: "Versi template yang sudah tercatat untuk publish lifecycle" },
          { label: "Sections", value: `${data.metrics.sections}`, meta: "Section template yang akan dipakai builder/runtime preview" },
          { label: "Fields", value: `${data.metrics.fields}`, meta: "Field registry lintas template yang sudah hidup di metadata" },
          { label: "Submissions", value: `${data.metrics.submissions}`, meta: "Draft dan request form yang sudah masuk submission layer" },
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
                  <CardDescription>
                    {template.category} • v{template.latestVersion?.versionNumber ?? 0}
                  </CardDescription>
                </div>
                <AdminStatusBadge
                  value={template.latestVersion?.publishStatus ?? (template.isActive ? "partial" : "backlog")}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Workflow Mode</p>
                  <p className="mt-2 text-sm font-medium text-[#0f172a]">{template.workflowMode.replaceAll("_", " ")}</p>
                </div>
                <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Field Scope</p>
                  <p className="mt-2 text-sm font-medium text-[#0f172a]">{fieldCount} field</p>
                </div>
                <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Draft Queue</p>
                  <p className="mt-2 text-sm font-medium text-[#0f172a]">{template.draftCount} draft</p>
                </div>
              </div>
              <p className="text-sm text-[#0f172a]">{template.description || "Blueprint template untuk workflow approval HERO."}</p>
              <p className="text-xs text-muted-foreground">
                {template.sections.length} section • {template.versionCount} version • latest status{" "}
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
              <CardTitle>Capability Readiness</CardTitle>
              <CardDescription>
                Status builder dan experience layer yang dibutuhkan supaya form baru tinggal pilih template/workflow.
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
                <TableHead>Capability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remark</TableHead>
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
