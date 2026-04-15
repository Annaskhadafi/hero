"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Cari action, actor, deskripsi, atau entity..."
            className="pl-9"
          />
        </div>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severity</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="secondary" className="rounded-full font-mono">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{log.entityLabel}</p>
                    <p className="text-xs text-muted-foreground">{log.entityType}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-xl text-sm text-muted-foreground">
                  {log.description}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{log.actorName ?? "System"}</p>
                    <p className="text-xs text-muted-foreground">{log.actorEmail ?? "—"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={log.severity === "high" ? "destructive" : "outline"} className="rounded-full capitalize">
                    {log.severity}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {log.createdAt.toLocaleString("id-ID")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
