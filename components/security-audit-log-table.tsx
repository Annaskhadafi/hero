"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [keyword, setKeyword] = useState("");
  const [severity, setSeverity] = useState("all");

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();

    return logs.filter((log) => {
      const haystack = [
        log.action,
        log.entityType,
        log.entityLabel,
        log.description,
        log.actorName ?? "",
        log.actorEmail ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesKeyword = !query || haystack.includes(query);
      const matchesSeverity = severity === "all" || log.severity === severity;

      return matchesKeyword && matchesSeverity;
    });
  }, [keyword, logs, severity]);

  return (
    <div className="space-y-4">
      <MinimalTableShell
        label="audit logs"
        fileName="security-audit-logs"
        searchPlaceholder="Cari aktivitas, pengguna, atau deskripsi..."
        filters={
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-11 w-full rounded-[1rem] border-0 bg-white md:w-44">
              <SelectValue placeholder="Tingkat Risiko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua tingkat</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="medium">Sedang</SelectItem>
              <SelectItem value="high">Tinggi</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aktivitas</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Risiko</TableHead>
              <TableHead>Waktu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((log) => (
              <TableRow key={log.id} data-date-value={log.createdAt.toISOString()}>
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
