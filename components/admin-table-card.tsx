import { Card } from "@/components/ui/card";
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
    <Card className="rounded-2xl border bg-card p-0 shadow-sm">
      <div className="border-b px-6 py-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="px-4 py-3 align-top">
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
