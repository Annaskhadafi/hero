"use client";

import { Badge } from "@/components/ui/badge";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AuditLogRow = {
  id: number;
  action: string;
  entityType: string;
  entityLabel: string;
  description: string;
  severity: string;
  createdAt: Date;
  actorName: string | null;
  actorEmail: string | null;
};

function formatAuditValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatSeverity(value: string) {
  const labels: Record<string, string> = {
    info: "Info",
    medium: "Sedang",
    high: "Tinggi",
  };

  return labels[value] ?? formatAuditValue(value);
}

export function SecurityAuditLogTable({ logs }: { logs: AuditLogRow[] }) {
  return (
    <div className="space-y-4">
      <MinimalTableShell
        label="audit logs"
        fileName="security-audit-logs"
        searchPlaceholder="Cari aktivitas, pengguna, atau deskripsi..."
        filters={
          <TableMultiFilter
            label="tingkat risiko"
            filterKey="severity"
            options={[
              { value: "info", label: "Info" },
              { value: "medium", label: "Sedang" },
              { value: "high", label: "Tinggi" },
            ]}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activity</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Risiko</TableHead>
              <TableHead>Waktu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                data-date-value={log.createdAt.toISOString()}
                data-filter-severity={log.severity}
              >
                <TableCell>
                  <Badge variant="secondary" className="rounded-full">
                    {formatAuditValue(log.action)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{log.entityLabel}</p>
                    <p className="text-xs text-muted-foreground">{formatAuditValue(log.entityType)}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-xl text-sm text-muted-foreground">
                  {log.description}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{log.actorName ?? "Sistem"}</p>
                    <p className="text-xs text-muted-foreground">{log.actorEmail ?? "—"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={log.severity === "high" ? "destructive" : "outline"} className="rounded-full">
                    {formatSeverity(log.severity)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {log.createdAt.toLocaleString("id-ID")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </div>
  );
}
