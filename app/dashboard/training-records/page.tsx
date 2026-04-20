import Link from "next/link";

import { Smartphone, TableProperties } from "lucide-react";

import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { TrainingRowActions } from "@/components/operational-crud-panels";
import { TrainingRecordFilters } from "@/components/training-record-filters";
import { TrainingRecordImportExport } from "@/components/training-record-import-export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOperationalCrudOptions, getTrainingRecordPageData } from "@/lib/hero-admin";

const APP_TIME_ZONE = "Asia/Makassar";

function startOfDayInAppTimeZone(reference: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return new Date(`${year}-${month}-${day}T00:00:00+08:00`);
}

function formatOptionalDate(value: Date | null) {
  if (!value) {
    return "No expiry";
  }

  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  });
}

function daysUntilExpiry(value: Date | null, referenceDate: Date) {
  if (!value) {
    return null;
  }

  return Math.ceil((value.getTime() - referenceDate.getTime()) / (24 * 60 * 60 * 1000));
}

function getSearchParamValue(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function TrainingRecordsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [data, options, resolvedSearchParams] = await Promise.all([
    getTrainingRecordPageData(),
    getOperationalCrudOptions(),
    searchParams,
  ]);

  const selectedEmployeeId = getSearchParamValue(resolvedSearchParams, "employeeId");
  const selectedDepartment = getSearchParamValue(resolvedSearchParams, "department");
  const selectedYear = getSearchParamValue(resolvedSearchParams, "year");
  const referenceDate = startOfDayInAppTimeZone(new Date());

  const filteredRows = data.rows.filter((row) => {
    const matchesEmployee = !selectedEmployeeId || `${row.employeeId}` === selectedEmployeeId;
    const matchesDepartment = !selectedDepartment || row.department === selectedDepartment;
    const matchesYear = !selectedYear || `${row.completedYear}` === selectedYear;

    return matchesEmployee && matchesDepartment && matchesYear;
  });

  const employeeCoverage = new Set(filteredRows.map((row) => row.employeeId)).size;
  const expiringSoon = filteredRows.filter((row) => {
    const days = daysUntilExpiry(row.expiresAt, referenceDate);
    return days != null && days <= 30;
  }).length;
  const noExpiry = filteredRows.filter((row) => !row.expiresAt).length;

  return (
    <AdminPageShell
      eyebrow="M7 • Training Intelligence"
      title="Training Records"
      description="Riwayat pelatihan karyawan dengan filter karyawan, department, dan tahun, plus import CSV untuk sinkron ke mobile training history."
      badge="Mobile Sync"
    >
      <AdminMetricGrid
        items={[
          { label: "Training records", value: `${filteredRows.length}`, meta: "Record pada scope filter aktif" },
          { label: "Employees covered", value: `${employeeCoverage}`, meta: "Karyawan unik dalam history" },
          { label: "Due soon", value: `${expiringSoon}`, meta: "Training dengan expiry 30 hari atau kurang" },
          { label: "No expiry", value: `${noExpiry}`, meta: "Record history tanpa masa berlaku" },
        ]}
      />

      <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Smartphone className="size-5 text-primary" />
              Mobile Training History
            </CardTitle>
            <CardDescription className="max-w-3xl">
              Dataset halaman ini langsung dipakai route mobile `/mobile/training`. User mobile melihat passport summary,
              riwayat training per tahun, dan status expiry dari record yang sama.
            </CardDescription>
          </div>
          <Button asChild className="h-11 rounded-xl">
            <Link href="/mobile/training">Open Mobile View</Link>
          </Button>
        </CardHeader>
      </Card>

      <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <TableProperties className="size-5 text-primary" />
            Training History Workspace
          </CardTitle>
          <CardDescription>
            Table-first workspace untuk import, review, dan koreksi riwayat training karyawan.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <MinimalTableShell
            label="training records"
            fileName="training-records"
            searchPlaceholder="Cari karyawan, department, training, provider, atau status..."
            dateFilter={false}
            summaryClassName="bg-transparent px-1 py-0 shadow-none"
            filters={
              <TrainingRecordFilters
                employees={data.employeeOptions}
                departments={data.departmentOptions}
                years={data.yearOptions}
              />
            }
            actions={<TrainingRecordImportExport />}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[240px]">Karyawan</TableHead>
                  <TableHead className="min-w-[170px]">Department</TableHead>
                  <TableHead className="min-w-[220px]">Training</TableHead>
                  <TableHead className="min-w-[160px]">Provider</TableHead>
                  <TableHead className="min-w-[110px]">Tahun</TableHead>
                  <TableHead className="min-w-[160px]">Expiry</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[240px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => {
                    const expiryDays = daysUntilExpiry(row.expiresAt, referenceDate);

                    return (
                      <TableRow key={row.id} className="hover:bg-surface-container-low/70">
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{row.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.employeeSn || "SN belum ada"} • {row.role}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-foreground">{row.department}</TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{row.trainingName}</p>
                            <p className="text-xs text-muted-foreground">Muncul di mobile training history</p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-foreground">{row.provider}</TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{row.completedYear}</p>
                            <p className="text-xs text-muted-foreground">History year</p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="text-sm text-foreground">{formatOptionalDate(row.expiresAt)}</p>
                            <p className="text-xs text-muted-foreground">
                              {expiryDays == null
                                ? "Tidak ada expiry"
                                : expiryDays >= 0
                                  ? `${expiryDays} hari lagi`
                                  : `${Math.abs(expiryDays)} hari lewat`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <AdminStatusBadge value={row.status} />
                        </TableCell>
                        <TableCell className="align-top">
                          <TrainingRowActions
                            row={row}
                            employees={options.employees}
                            categoryOptions={options.categoryOptions}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Tidak ada training record sesuai kombinasi filter saat ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
