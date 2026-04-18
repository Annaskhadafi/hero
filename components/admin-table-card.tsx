import { Card } from "@/components/ui/card";
import { Rows3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminTableCard({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description: string;
  columns: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <Card className="rounded-lg border border-border bg-card p-0 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Rows3 className="size-4" aria-hidden="true" />
          </span>
          <h3 className="truncate font-display text-base font-semibold tracking-normal">{title}</h3>
          <p className="sr-only">{description}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-surface-container-low px-2 py-1 text-xs font-semibold text-muted-foreground">
          {rows.length} data
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column} className="h-9 text-xs font-semibold uppercase text-muted-foreground">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="transition-colors hover:bg-muted/45">
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="py-3 align-top text-sm whitespace-normal">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
