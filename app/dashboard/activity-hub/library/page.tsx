import { redirect } from "next/navigation";
import { Layers3, Settings2 } from "lucide-react";
import { manageActivityLibraryAction } from "@/app/dashboard/activity-hub/actions";
import { ActivityLibraryFilters } from "@/components/activity-library-filters";
import { ActivityLibraryImportExport } from "@/components/activity-library-import-export";
import { ActivityLibraryRowActions } from "@/components/activity-library-row-actions";
import { ActivityRouteDepartmentSectionFields } from "@/components/activity-route-scope-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityLibraryData } from "@/lib/daily-activity";

function SummaryChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 text-sm shadow-[0_12px_28px_rgba(8,32,51,0.06)] ring-1 ring-[rgba(66,71,80,0.08)]">
      <span className="text-xs font-black uppercase text-muted-foreground">{label}</span>
      <span className="ml-3 font-display text-xl font-black text-foreground">{value}</span>
    </div>
  );
}

function getSearchParamValue(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function DailyActivityLibraryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityLibraryData(session.user.email);
  const resolvedSearchParams = await searchParams;
  const selectedDepartment = getSearchParamValue(resolvedSearchParams, "department");
  const selectedSection = getSearchParamValue(resolvedSearchParams, "section");
  const filteredRows = data.rows.filter((row) => {
    const matchesDepartment = !selectedDepartment || `${row.departmentId ?? ""}` === selectedDepartment;
    const matchesSection = !selectedSection || `${row.sectionId ?? ""}` === selectedSection;

    return matchesDepartment && matchesSection;
  });

  return (
    <div className="space-y-5">
      <div className="rounded-[1.25rem] bg-surface-container-low p-4">
        <div className="flex flex-wrap gap-3">
        <SummaryChip label="Total library" value={data.metrics.total} />
        <SummaryChip label="Aktif" value={data.metrics.active} />
        <SummaryChip label="Self-input" value={data.metrics.selfInput} />
        <SummaryChip label="Auto-approve" value={data.metrics.autoApproveReady} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="overview">Activity Library Overview</TabsTrigger>
          <TabsTrigger value="create">Tambah Activity Library</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="rounded-[1.4rem] border-0 shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
            <CardHeader className="gap-3">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Settings2 className="size-5 text-primary" />
                Activity Library Overview
              </CardTitle>
              <CardDescription>
                Daftar aktivitas resmi per departemen beserta atribut validasi, SLA, default point, dan pondasi override
                per section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {data.categories.map((item) => (
                    <Badge key={item.label} variant="secondary">
                      {item.label} • {item.count}
                    </Badge>
                  ))}
                </div>
                <ActivityLibraryImportExport rows={filteredRows} currentEmployeeId={data.currentEmployee?.id ?? null} />
              </div>

              <MinimalTableShell
                label="activity library"
                fileName="activity-library"
                searchPlaceholder="Cari activity, department, atribut, atau status..."
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
                dateFilter={false}
                filters={<ActivityLibraryFilters departments={data.departments} sections={data.sections} />}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[280px]">Activity</TableHead>
                      <TableHead className="min-w-[210px]">Scope</TableHead>
                      <TableHead className="min-w-[150px]">Scoring</TableHead>
                      <TableHead className="min-w-[220px]">Validation</TableHead>
                      <TableHead className="min-w-[190px]">Status</TableHead>
                      <TableHead className="min-w-[170px] text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length > 0 ? (
                    filteredRows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-surface-container-low/70">
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{row.activityName}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.activityCode} • {row.category} • creator {row.creatorName ?? "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-sm">
                            <p>{row.departmentName ?? "Global"}</p>
                            <p className="text-xs text-muted-foreground">{row.sectionName ?? "-"}</p>
                            <p className="mt-1 text-xs font-semibold text-primary">
                              {row.siteName ?? "Semua site"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-sm">
                            <p>{row.basePoints} pts</p>
                            <p className="text-xs text-muted-foreground">
                              Complexity {row.complexityLevel} • SLA {row.slaHours} jam
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap gap-2">
                            {row.requiresPhoto ? <Badge variant="outline">Photo</Badge> : null}
                            {row.requiresEquipmentNo ? <Badge variant="outline">Equipment</Badge> : null}
                            {row.requiresLocationGps ? <Badge variant="outline">GPS</Badge> : null}
                            {row.requiresMaterialUsed ? <Badge variant="outline">Material</Badge> : null}
                            {row.autoApproveIfGpsValid ? <Badge variant="outline">Auto approve</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap gap-2">
                            <Badge className={row.isActive ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-800"}>
                              {row.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                            {row.isSelfInput ? <Badge variant="secondary">Self-input</Badge> : null}
                            {row.isAssignable ? <Badge variant="secondary">Assignable</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <ActivityLibraryRowActions
                            row={row}
                            departments={data.departments}
                            sections={data.sections}
                            sites={data.sites}
                            currentEmployeeId={data.currentEmployee?.id ?? null}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Tidak ada activity library sesuai filter department/section.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card className="rounded-[1.4rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="size-5 text-primary" />
                Tambah Activity Library
              </CardTitle>
              <CardDescription>
                Panel untuk Section Head atau admin mengelola master activity library yang nanti dipakai Route Builder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={manageActivityLibraryAction} className="space-y-4">
                <input type="hidden" name="intent" value="create" />
                <input type="hidden" name="createdByEmployeeId" value={data.currentEmployee?.id ?? ""} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Label className="grid gap-2">
                    Activity code
                    <Input name="activityCode" placeholder="TS-003" required />
                  </Label>
                  <Label className="grid gap-2">
                    Category
                    <select name="category" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {["Technical", "HSE", "Administrative", "Training", "Wellness", "Standby"].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Label className="grid gap-2 sm:col-span-2">
                    Activity name
                    <Input name="activityName" placeholder="Nama aktivitas resmi yang tampil ke karyawan" required />
                  </Label>
                  <Label className="grid gap-2 sm:col-span-2">
                    Lokasi kerja / Site
                    <select name="siteId" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="">Global - semua site</option>
                      {data.sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <ActivityRouteDepartmentSectionFields
                    departments={data.departments}
                    sections={data.sections}
                    selectClassName="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    departmentPlaceholder="Tanpa department spesifik"
                    sectionPlaceholder="Tanpa section spesifik"
                  />
                  <Label className="grid gap-2">
                    Base points
                    <Input name="basePoints" type="number" defaultValue={10} />
                  </Label>
                  <Label className="grid gap-2">
                    Complexity
                    <Input name="complexityLevel" type="number" min={1} max={5} defaultValue={2} />
                  </Label>
                  <Label className="grid gap-2">
                    Max daily count
                    <Input name="maxDailyCount" type="number" defaultValue={3} />
                  </Label>
                  <Label className="grid gap-2">
                    Max points per day
                    <Input name="maxPointsPerDay" type="number" defaultValue={50} />
                  </Label>
                  <Label className="grid gap-2 sm:col-span-2">
                    SLA hours
                    <Input name="slaHours" type="number" defaultValue={24} />
                  </Label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["requiresPhoto", "Wajib foto"],
                    ["requiresEquipmentNo", "Wajib nomor equipment"],
                    ["requiresDuration", "Wajib durasi"],
                    ["requiresLocationGps", "Wajib GPS"],
                    ["requiresMaterialUsed", "Wajib material"],
                    ["isAssignable", "Bisa di-assign"],
                    ["isSelfInput", "Bisa self-input"],
                    ["approvalRequired", "Butuh approval"],
                    ["autoApproveIfGpsValid", "Auto-approve jika GPS valid"],
                    ["isActive", "Aktif"],
                  ].map(([field, label]) => (
                    <Label key={field} className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm">
                      <input
                        type="checkbox"
                        name={field}
                        defaultChecked={["requiresDuration", "isAssignable", "isSelfInput", "approvalRequired", "isActive"].includes(field)}
                      />
                      {label}
                    </Label>
                  ))}
                </div>

                <Button type="submit" className="w-full rounded-2xl">
                  Simpan activity library
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
