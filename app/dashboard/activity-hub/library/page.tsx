import { redirect } from "next/navigation";
import { Layers3, Settings2 } from "lucide-react";
import { manageActivityLibraryAction } from "@/app/dashboard/activity-hub/actions";
import { ActivityLibraryImportExport } from "@/components/activity-library-import-export";
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
    <div className="rounded-lg bg-surface-container-low px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2 font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default async function DailyActivityLibraryPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityLibraryData(session.user.email);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <SummaryChip label="Total library" value={data.metrics.total} />
        <SummaryChip label="Aktif" value={data.metrics.active} />
        <SummaryChip label="Self-input" value={data.metrics.selfInput} />
        <SummaryChip label="Auto-approve" value={data.metrics.autoApproveReady} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="overview">Activity Library Overview</TabsTrigger>
          <TabsTrigger value="create">Tambah Activity Library</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="rounded-[1.4rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-5 text-primary" />
                Activity Library Overview
              </CardTitle>
              <CardDescription>
                Daftar aktivitas resmi per departemen beserta atribut validasi, SLA, dan perilaku approval.
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
                <ActivityLibraryImportExport rows={data.rows} currentEmployeeId={data.currentEmployee?.id ?? null} />
              </div>

              <MinimalTableShell
                label="activity library"
                fileName="activity-library"
                searchPlaceholder="Cari activity, department, atribut, atau status..."
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
                dateFilter={false}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Attributes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-medium">{row.activityName}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.activityCode} • {row.category} • creator {row.creatorName ?? "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-sm">
                            <p>{row.departmentName ?? "Global"}</p>
                            <p className="text-xs text-muted-foreground">{row.sectionName ?? "-"}</p>
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
                          <div className="flex flex-wrap gap-2">
                            <details className="min-w-[220px] rounded-lg border border-border/70 bg-muted/20 p-3">
                              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Edit
                              </summary>
                              <form action={manageActivityLibraryAction} className="mt-3 grid gap-3">
                                <input type="hidden" name="intent" value="update" />
                                <input type="hidden" name="id" value={row.id} />
                                <input type="hidden" name="createdByEmployeeId" value={data.currentEmployee?.id ?? ""} />
                                <input type="hidden" name="category" value={row.category} />
                                <input type="hidden" name="departmentId" value={row.departmentId ?? ""} />
                                <input type="hidden" name="sectionId" value={row.sectionId ?? ""} />
                                <input type="hidden" name="requiresPhoto" value={`${row.requiresPhoto}`} />
                                <input type="hidden" name="requiresEquipmentNo" value={`${row.requiresEquipmentNo}`} />
                                <input type="hidden" name="requiresDuration" value={`${row.requiresDuration}`} />
                                <input type="hidden" name="requiresLocationGps" value={`${row.requiresLocationGps}`} />
                                <input type="hidden" name="requiresMaterialUsed" value={`${row.requiresMaterialUsed}`} />
                                <input type="hidden" name="isAssignable" value={`${row.isAssignable}`} />
                                <input type="hidden" name="isSelfInput" value={`${row.isSelfInput}`} />
                                <input type="hidden" name="approvalRequired" value={`${row.approvalRequired}`} />
                                <input type="hidden" name="autoApproveIfGpsValid" value={`${row.autoApproveIfGpsValid}`} />
                                <Input name="activityCode" defaultValue={row.activityCode} />
                                <Input name="activityName" defaultValue={row.activityName} />
                                <Input name="basePoints" type="number" defaultValue={row.basePoints} />
                                <Input name="complexityLevel" type="number" min={1} max={5} defaultValue={row.complexityLevel} />
                                <Input name="maxDailyCount" type="number" defaultValue={row.maxDailyCount} />
                                <Input name="maxPointsPerDay" type="number" defaultValue={row.maxPointsPerDay} />
                                <Input name="slaHours" type="number" defaultValue={row.slaHours} />
                                <Label className="flex items-center gap-2 text-sm">
                                  <input type="checkbox" name="isActive" defaultChecked={row.isActive} />
                                  Aktif
                                </Label>
                                <Button type="submit" size="sm">Simpan</Button>
                              </form>
                            </details>
                            <form action={manageActivityLibraryAction}>
                              <input type="hidden" name="intent" value="delete" />
                              <input type="hidden" name="id" value={row.id} />
                              <Button type="submit" size="sm" variant="outline" className="text-rose-700">
                                Hapus
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                Panel untuk Section Head atau admin mengelola master activity library departemen.
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
                  <Label className="grid gap-2">
                    Department
                    <select name="departmentId" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="">Tanpa department spesifik</option>
                      {data.departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Label className="grid gap-2">
                    Section
                    <select name="sectionId" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="">Tanpa section spesifik</option>
                      {data.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </Label>
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
