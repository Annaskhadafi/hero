import { redirect } from "next/navigation";
import { Layers3, Settings2 } from "lucide-react";
import { AdminCrudDialog } from "@/components/admin/admin-crud-dialog";
import { ActivityLibraryCreateForm } from "@/components/activity-library-create-form";
import { ActivityLibraryFilters } from "@/components/activity-library-filters";
import { ActivityLibraryImportExport } from "@/components/activity-library-import-export";
import { ActivityLibraryRowActions } from "@/components/activity-library-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActivityPagePurpose } from "@/lib/activity-navigation";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityLibraryData } from "@/lib/daily-activity";

function SummaryChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-border/60">
      <span className="text-xs font-black uppercase text-muted-foreground">{label}</span>
      <span className="ml-3 font-display text-xl font-black text-foreground">{value}</span>
    </div>
  );
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
  await searchParams;
  const filteredRows = data.rows;
  const pagePurpose = getActivityPagePurpose("library");

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
          <TabsTrigger value="overview">Kamus Aktivitas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="surface-module-card rounded-[1.1rem] border-0">
            <CardHeader className="gap-3">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Settings2 className="size-5 text-primary" />
                {pagePurpose.title}
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {pagePurpose.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.categories.map((item) => (
                  <Badge key={item.label} variant="secondary">
                    {item.label} • {item.count}
                  </Badge>
                ))}
              </div>

              <MinimalTableShell
                label="activity library"
                fileName="activity-library"
                searchPlaceholder="Search activity, department, attribute, or status..."
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
                dateFilter={false}
                filters={<ActivityLibraryFilters departments={data.departments} sections={data.sections} />}
                importAction={<ActivityLibraryImportExport rows={filteredRows} currentEmployeeId={data.currentEmployee?.id ?? null} mode="import" />}
                primaryAction={
                  <AdminCrudDialog
                    title="Tambah Kamus Aktivitas"
                    description="Tambah pekerjaan resmi beserta base point dan requirement validasinya."
                    size="lg"
                  >
                    <ActivityLibraryCreateForm
                      currentEmployeeId={data.currentEmployee?.id ?? null}
                      routeFolders={data.routeFolders}
                      existingActivities={filteredRows}
                      sites={data.sites}
                      departments={data.departments}
                      sections={data.sections}
                    />
                  </AdminCrudDialog>
                }
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
                      <TableRow
                        key={row.id}
                        className="hover:bg-surface-container-low/70"
                        data-filter-department={row.departmentName ?? ""}
                        data-filter-section={row.sectionName ?? ""}
                        data-filter-category={row.category}
                        data-filter-status={row.isActive ? "Aktif" : "Nonaktif"}
                      >
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{row.activityName}</p>
                              {row.children && row.children.length > 0 ? (
                                <Badge variant="secondary">Group</Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {row.activityCode} • {row.category} • creator {row.creatorName ?? "-"}
                            </p>
                            {row.children && row.children.length > 0 ? (
                              <div className="mt-1.5 space-y-1 rounded-lg bg-surface-container-low/70 p-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                                  Anggota group ({row.children.length})
                                </p>
                                {row.children.map((child) => (
                                  <p key={child.id} className="text-xs text-muted-foreground">
                                    <span className="font-bold text-foreground">{child.activityCode}</span> •{" "}
                                    {child.activityName}
                                  </p>
                                ))}
                              </div>
                            ) : null}
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
                          <p className="text-sm font-medium text-foreground">
                            {row.isActive ? "Aktif" : "Nonaktif"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[row.isSelfInput ? "Self-input" : null, row.isAssignable ? "Assignable" : null].filter(Boolean).join(" • ") || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="align-top">
                          <ActivityLibraryRowActions
                            row={row}
                            departments={data.departments}
                            sections={data.sections}
                            sites={data.sites}
                            currentEmployeeId={data.currentEmployee?.id ?? null}
                            routeFolders={data.routeFolders}
                            routeGroupMappings={data.routeGroupMappings}
                            existingActivities={filteredRows}
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
          <Card className="surface-module-card rounded-[1.1rem] border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="size-5 text-primary" />
                Tambah Kamus Aktivitas
              </CardTitle>
              <CardDescription>
                Panel untuk Section Head atau admin mengelola kamus pekerjaan resmi yang nanti dipakai Route Kerja Harian.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLibraryCreateForm
                currentEmployeeId={data.currentEmployee?.id ?? null}
                routeFolders={data.routeFolders}
                sites={data.sites}
                departments={data.departments}
                sections={data.sections}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
