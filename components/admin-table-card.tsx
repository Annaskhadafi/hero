import { Card } from "@/components/ui/card";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
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
  dateFilter = "auto",
  filters,
  actions,
  presets,
  rowAttributes,
}: {
  title: string;
  description: string;
  columns: string[];
  rows: (string | React.ReactNode)[][];
  dateFilter?: boolean | "auto";
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  presets?: React.ReactNode;
  rowAttributes?: Array<Record<string, string | undefined>>;
}) {
  return (
    <Card className="surface-module-card overflow-hidden rounded-[1.2rem] border-0 p-0">
      <div className="flex flex-col gap-3 bg-surface-container-low px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-container-lowest text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
              <Rows3 className="size-4" aria-hidden="true" />
            </span>
            <h3 className="truncate font-display text-base font-semibold tracking-normal text-foreground">
              {title}
            </h3>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <span className="surface-chip inline-flex h-8 w-fit items-center rounded-full px-3 text-xs font-semibold text-muted-foreground">
          {rows.length} data
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <MinimalTableShell
          label={title.toLowerCase()}
          fileName={title}
          searchPlaceholder={`Cari di ${title.toLowerCase()}...`}
          summaryClassName="bg-transparent px-1 py-0 shadow-none"
          dateFilter={dateFilter}
          filters={filters}
          actions={actions}
          presets={presets}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead key={column} className="h-10 text-[0.68rem] font-semibold uppercase text-muted-foreground">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="transition-colors hover:bg-muted/35" {...rowAttributes?.[rowIndex]}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="py-3.5 align-top text-sm whitespace-normal">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </div>
    </Card>
  );
}


