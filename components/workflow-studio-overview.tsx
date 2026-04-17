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

export function WorkflowStudioOverview({ data }: { data: WorkflowStudioOverviewData }) {
  const workflowModes = data.workflows.map((workflow) => ({
    id: workflow.id,
    title: workflow.name,
    status: workflow.latestVersion?.publishStatus ?? (workflow.isActive ? "partial" : "backlog"),
    summary: `${workflow.mode.replaceAll("_", " ")} • ${workflow.stepRules.length} step rule • ${workflow.conditions.length} condition • ${workflow.notificationRules.length} notif rule • ${workflow.reminderRules.length} reminder rule`,
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
    ).map(([field, operators]) => ({
      field,
      status: "live",
      detail: `Tersedia di workflow condition registry dengan operator ${operators.join(", ") || "="}.`,
    })),
    {
      field: "Grouped AND / OR Builder",
      status: data.metrics.conditions > 0 ? "partial" : "backlog",
      detail: "Entity parent-child condition dan logical join sudah ada, tetapi visual builder belum dibuat.",
    },
    {
      field: "Attachment Presence",
      status: "backlog",
      detail: "Belum ada operator generik untuk rule if attachment exists / specific attachment type.",
    },
    {
      field: "Nominal Threshold",
      status: "backlog",
      detail: "Use case procurement/finance nominal threshold belum dipetakan ke runtime resolver.",
    },
  ];

  return (
    <AdminPageShell
      eyebrow="M2 • Workflow Studio"
      title="Workflow Studio"
      description="Control room untuk org template, matrix approval, logic scope, reminder readiness, dan roadmap multi-approval."
    >
      <AdminMetricGrid
        items={[
          { label: "Workflows", value: `${data.metrics.workflows}`, meta: "Workflow template yang sudah teregistrasi" },
          { label: "Versions", value: `${data.metrics.versions}`, meta: "Versi workflow untuk snapshot dan publish lifecycle" },
          { label: "Conditions", value: `${data.metrics.conditions}`, meta: "Rule condition registry yang dipakai branching logic" },
          { label: "Branches", value: `${data.metrics.branches}`, meta: "Branch outcome yang siap dipakai route engine" },
          { label: "Notif rules", value: `${data.metrics.notificationRules}`, meta: "Trigger notifikasi yang sudah terseed di workflow blueprint" },
          { label: "Reminder rules", value: `${data.metrics.reminderRules}`, meta: "Reminder rule sebelum due atau overdue" },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {workflowModes.map((mode) => (
          <Card key={mode.id} className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{mode.title}</CardTitle>
                  <CardDescription>Readiness eksekusi workflow HERO</CardDescription>
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
          <CardTitle>Condition Logic Coverage</CardTitle>
          <CardDescription>
            Cakupan condition logic yang sudah dipakai resolver dan mana yang masih backlog menuju visual builder.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Condition Field</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remark</TableHead>
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
