import Link from "next/link";

import { Smartphone, TableProperties, Award, TrendingUp, AlertTriangle, Activity, Layers, BookOpen, UserCheck, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { TrainingRowActions, HcCrudForms } from "@/components/operational-crud-panels";
import { TrainingRecordFilters } from "@/components/training-record-filters";
import { TrainingRecordImportExport } from "@/components/training-record-import-export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { TrainingGroupedTable } from "@/components/training-grouped-table";
import { getOperationalCrudOptions, getTrainingRecordPageData, getSioCertificationPageData } from "@/lib/hero-admin";
import { syncLmsToTrainingRecords } from "@/lib/lms-mysql";
import { getServerSession } from "@/lib/auth-session";
import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { SioCertificationTable } from "@/components/sio-certification-table";
import { SioCreateDialog, SioEditDialog } from "@/components/sio-certification-dialogs";
import { SioDashboardSection } from "@/components/sio-certification-dashboard";
import { SioImportDialog } from "@/components/sio-certification-import";
import { computeAggregates } from "@/lib/sio-certification";

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
    return "Tanpa expiry";
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
  const resolvedSearchParams = await searchParams;

  // Sync current user's LMS records first
  const session = await getServerSession();
  if (session?.user?.email) {
    try {
      await syncLmsToTrainingRecords(session.user.email);
    } catch (error) {
      console.error("[LMS Sync Admin Self] Error:", error);
    }
  }

  // Also sync selected employee's LMS records if filtered
  const selectedEmployeeId = getSearchParamValue(resolvedSearchParams, "employeeId");
  if (selectedEmployeeId) {
    try {
      const [emp] = await db
        .select({ email: employees.email })
        .from(employees)
        .where(eq(employees.id, Number(selectedEmployeeId)))
        .limit(1);
      if (emp?.email) {
        await syncLmsToTrainingRecords(emp.email);
      }
    } catch (error) {
      console.error("[LMS Sync Admin Selected] Error:", error);
    }
  }

  const [data, options] = await Promise.all([
    getTrainingRecordPageData(),
    getOperationalCrudOptions(),
  ]);
  const selectedDepartment = getSearchParamValue(resolvedSearchParams, "department");
  const selectedSection = getSearchParamValue(resolvedSearchParams, "section");
  const selectedYear = getSearchParamValue(resolvedSearchParams, "year");
  const referenceDate = startOfDayInAppTimeZone(new Date());

  const filteredRows = data.rows.filter((row) => {
    const matchesEmployee = !selectedEmployeeId || `${row.employeeId}` === selectedEmployeeId;
    const matchesDepartment = !selectedDepartment || row.department === selectedDepartment;
    const matchesSection = !selectedSection || row.section === selectedSection;
    const matchesYear = !selectedYear || `${row.completedYear}` === selectedYear;

    return matchesEmployee && matchesDepartment && matchesSection && matchesYear;
  });

  const employeeCoverage = new Set(filteredRows.map((row) => row.employeeId)).size;
  const expiringSoon = filteredRows.filter((row) => {
    const days = daysUntilExpiry(row.expiresAt, referenceDate);
    return days != null && days >= 0 && days <= 30;
  }).length;
  const noExpiry = filteredRows.filter((row) => !row.expiresAt).length;

  // 1. Expiry alerts (already expired)
  const expiredRecords = filteredRows.filter((row) => {
    if (!row.expiresAt) return false;
    const days = daysUntilExpiry(row.expiresAt, referenceDate);
    return days != null && days < 0;
  });

  // 2. Expiring soon (0 - 30 days)
  const expiringSoonRecords = filteredRows.filter((row) => {
    const days = daysUntilExpiry(row.expiresAt, referenceDate);
    return days != null && days >= 0 && days <= 30;
  });

  // 3. Valid / Active certificates (status valid and not expired/expiring soon)
  const validRecordsCount = filteredRows.filter((row) => {
    if (row.status !== "valid") return false;
    if (!row.expiresAt) return true;
    const days = daysUntilExpiry(row.expiresAt, referenceDate);
    return days != null && days > 30;
  }).length;

  // 4. Group by Training Name for Top Trainings list
  const trainingCounts: Record<string, { name: string; count: number; valid: number; expired: number }> = {};
  for (const row of filteredRows) {
    if (!trainingCounts[row.trainingName]) {
      trainingCounts[row.trainingName] = { name: row.trainingName, count: 0, valid: 0, expired: 0 };
    }
    trainingCounts[row.trainingName].count++;
    const days = daysUntilExpiry(row.expiresAt, referenceDate);
    if (row.status === "valid" && (days === null || days > 0)) {
      trainingCounts[row.trainingName].valid++;
    } else {
      trainingCounts[row.trainingName].expired++;
    }
  }
  const topTrainings = Object.values(trainingCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 5. Group by Department
  const departmentCounts: Record<string, { name: string; count: number; employees: Set<number> }> = {};
  for (const row of filteredRows) {
    const dept = row.department || "Lainnya";
    if (!departmentCounts[dept]) {
      departmentCounts[dept] = { name: dept, count: 0, employees: new Set() };
    }
    departmentCounts[dept].count++;
    departmentCounts[dept].employees.add(row.employeeId);
  }
  const departmentStats = Object.values(departmentCounts)
    .sort((a, b) => b.count - a.count);

  // 6. Source Distribution: LMS vs External
  const lmsRecordsCount = filteredRows.filter((row) =>
    row.provider.toLowerCase().includes("chitra learning") || row.provider.toLowerCase().includes("lms")
  ).length;
  const externalRecordsCount = filteredRows.length - lmsRecordsCount;

  // ── SIO Certification Data ──
  const sioData = await getSioCertificationPageData();
  const sioAgg = computeAggregates(sioData.rows, referenceDate);

  return (
    <AdminPageShell
      eyebrow="M7 • Training Intelligence"
      title="Training History"
      description="Riwayat sertifikasi dan pelatihan karyawan untuk audit expiry, koreksi data, dan sinkron tampilan mobile."
      badge="Sinkron Mobile"
      actions={
        <Button asChild variant="outline" className="h-9 rounded-xl text-xs gap-1.5 border-muted">
          <Link href="/mobile/training" className="flex items-center gap-1.5">
            <Smartphone className="size-4 text-primary" />
            Tampilan Mobile
          </Link>
        </Button>
      }
    >
      {/* Global Filter Bar */}
      <div className="mb-5 rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
        <TrainingRecordFilters
          employees={data.employeeOptions}
          departments={data.departmentOptions}
          sections={data.sectionOptions}
          years={data.yearOptions}
        />
      </div>

      <Tabs defaultValue="workspace" className="space-y-5">
        <TabsList className="bg-surface-container-low/50">
          <TabsTrigger value="workspace" className="flex items-center gap-1.5">
            <TableProperties className="size-4" />
            Workspace & Riwayat
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
            <Activity className="size-4 text-primary" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="sio" className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-primary" />
            SIO Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-5 outline-none">
          <AdminMetricGrid
            mode="compact"
            items={[
              { label: "Record training", value: `${filteredRows.length}`, meta: "Scope filter aktif" },
              { label: "Karyawan tercakup", value: `${employeeCoverage}`, meta: "Karyawan unik dalam histori" },
              { label: "Segera expiry", value: `${expiringSoon}`, meta: "Berlaku 30 hari atau kurang" },
              { label: "Tanpa expiry", value: `${noExpiry}`, meta: "History tanpa masa berlaku" },
            ]}
          />

          <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-xl text-foreground font-semibold">
                <TableProperties className="size-5 text-primary" />
                Workspace riwayat training
              </CardTitle>
              <CardDescription>
                Workspace table-first untuk import, review, dan koreksi riwayat sertifikasi karyawan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <MinimalTableShell
                label="training records"
                fileName="training-records"
                searchPlaceholder="Search employee, department, training, provider, or status..."
                dateFilter={false}
                showImport={false}
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
                actions={
                  <div className="flex items-center gap-2">
                    <HcCrudForms
                      employees={options.employees}
                      sites={options.sites}
                      categoryOptions={options.categoryOptions}
                      mode="training"
                    />
                    <TrainingRecordImportExport />
                  </div>
                }
              >
                <TrainingGroupedTable
                  trainingRecords={filteredRows}
                  employees={options.employees}
                  categoryOptions={options.categoryOptions}
                />
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6 outline-none">
          {/* Dashboard Quick Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <Award className="size-6 text-emerald-500" />
                <Badge className="bg-emerald-500/10 text-emerald-600 border-0 hover:bg-emerald-500/10">Aktif</Badge>
              </div>
              <p className="mt-4 text-3xl font-bold text-foreground">{validRecordsCount}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Sertifikat Valid & Aktif</p>
            </Card>

            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <AlertTriangle className="size-6 text-amber-500" />
                <Badge className="bg-amber-500/10 text-amber-600 border-0 hover:bg-amber-500/10">30 Hari</Badge>
              </div>
              <p className="mt-4 text-3xl font-bold text-foreground">{expiringSoon}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Segera Expired (Jangka Pendek)</p>
            </Card>

            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <AlertTriangle className="size-6 text-rose-500" />
                <Badge className="bg-rose-500/10 text-rose-600 border-0 hover:bg-rose-500/10">Expired</Badge>
              </div>
              <p className="mt-4 text-3xl font-bold text-foreground">{expiredRecords.length}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Sertifikat Habis Masa Berlaku</p>
            </Card>

            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <Layers className="size-6 text-primary" />
                <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/10">Total</Badge>
              </div>
              <p className="mt-4 text-3xl font-bold text-foreground">{filteredRows.length}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Total Training Record</p>
            </Card>
          </div>

          {/* Sources and Popular Trainings */}
          <div className="grid gap-5 lg:grid-cols-12">
            <Card className="lg:col-span-4 rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5 font-semibold">
                  <BookOpen className="size-4 text-primary" />
                  Distribusi Sumber Pelatihan
                </h4>
                <p className="text-xs text-muted-foreground mt-1">Perbandingan antara training LMS vs penyedia eksternal</p>
              </div>
              
              <div className="space-y-4 my-6">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span>LMS Chitra Learning</span>
                    <span>{lmsRecordsCount} ({filteredRows.length > 0 ? Math.round((lmsRecordsCount / filteredRows.length) * 100) : 0}%)</span>
                  </div>
                  <Progress value={filteredRows.length > 0 ? (lmsRecordsCount / filteredRows.length) * 100 : 0} className="h-2 bg-slate-100" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span>External Training</span>
                    <span>{externalRecordsCount} ({filteredRows.length > 0 ? Math.round((externalRecordsCount / filteredRows.length) * 100) : 0}%)</span>
                  </div>
                  <Progress value={filteredRows.length > 0 ? (externalRecordsCount / filteredRows.length) * 100 : 0} className="h-2 bg-slate-100" />
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-100">
                Sistem otomatis menyinkronkan kelulusan modul LMS Chitra Learning. Pelatihan eksternal dapat diinput manual.
              </div>
            </Card>

            <Card className="lg:col-span-8 rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
              <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5 font-semibold">
                <TrendingUp className="size-4 text-primary" />
                Top 5 Sertifikasi / Pelatihan Terpopuler
              </h4>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Modul training dengan jumlah keikutsertaan karyawan terbanyak</p>
              
              <div className="space-y-4">
                {topTrainings.length > 0 ? (
                  topTrainings.map((t, idx) => {
                    const maxVal = topTrainings[0]?.count || 1
                    const pct = Math.round((t.count / maxVal) * 100)
                    return (
                      <div key={t.name || idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground truncate max-w-[80%]">{t.name}</span>
                          <span className="font-bold text-[#003461]">{t.count} Karyawan</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 flex-1 bg-slate-100" />
                          <span className="text-[10px] text-muted-foreground w-8 text-right font-medium">{pct}%</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center">Belum ada data pelatihan terpopuler.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Department Coverage and Expiry alerts */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
              <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5 font-semibold mb-4">
                <Layers className="size-4 text-primary" />
                Cakupan Pelatihan per Departemen
              </h4>
              <div className="max-h-[300px] overflow-y-auto space-y-3">
                {departmentStats.length > 0 ? (
                  departmentStats.map((stat, idx) => (
                    <div key={stat.name || idx} className="flex items-center justify-between py-2 border-b border-dashed border-slate-100 last:border-0">
                      <div>
                        <p className="text-xs font-bold text-foreground">{stat.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.employees.size} Karyawan Berlisensi</p>
                      </div>
                      <Badge className="bg-primary/5 text-primary border-0 font-bold text-xs px-2.5 py-1">
                        {stat.count} Record
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center">Belum ada data per departemen.</p>
                )}
              </div>
            </Card>

            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
              <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5 text-rose-700 font-semibold mb-4">
                <AlertTriangle className="size-4 text-rose-500" />
                Peringatan Expiry Sertifikat Karyawan
              </h4>
              <div className="max-h-[300px] overflow-y-auto space-y-3">
                {expiringSoonRecords.length === 0 && expiredRecords.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">Seluruh sertifikasi karyawan valid dan aman.</p>
                ) : (
                  <>
                    {/* Expired List */}
                    {expiredRecords.map((r, idx) => (
                      <div key={`exp-${r.id}-${idx}`} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-foreground truncate">{r.employeeName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{r.trainingName}</p>
                        </div>
                        <Badge className="bg-rose-500/10 text-rose-600 border-0 hover:bg-rose-500/10 text-[9px] font-bold shrink-0">
                          EXPIRED
                        </Badge>
                      </div>
                    ))}
                    {/* Expiring Soon List */}
                    {expiringSoonRecords.map((r, idx) => {
                      const days = daysUntilExpiry(r.expiresAt, referenceDate)
                      return (
                        <div key={`soon-${r.id}-${idx}`} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold text-foreground truncate">{r.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{r.trainingName}</p>
                          </div>
                          <Badge className="bg-amber-500/10 text-amber-600 border-0 hover:bg-amber-500/10 text-[9px] font-bold shrink-0">
                            {days} Hari Lagi
                          </Badge>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sio" className="space-y-5 outline-none">
          <SioDatabaseTab
            rows={sioData.rows}
            employees={sioData.employeeOptions}
            agg={sioAgg}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
