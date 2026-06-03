import { redirect } from "next/navigation";
import { Gauge, ShieldCheck, Sparkles } from "lucide-react";
import {
  manageActivityModifierAction,
  resolvePointDisputeAction,
  updateDailyActivityConfigAction,
} from "@/app/dashboard/activity-hub/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getActivityPagePurpose } from "@/lib/activity-navigation";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityConfigurationData } from "@/lib/daily-activity";

function dateTimeLocalValue(reference: Date) {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function SummaryChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2 font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default async function DailyActivityConfigurationPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityConfigurationData(session.user.email);
  const pagePurpose = getActivityPagePurpose("configuration");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <SummaryChip label="Settings" value={data.metrics.settings} />
        <SummaryChip label="Active modifiers" value={data.metrics.activeModifiers} />
        <SummaryChip label="Penalty events" value={data.metrics.penaltyEvents} />
        <SummaryChip label="Pending disputes" value={data.metrics.pendingDisputes} />
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="settings">Rule Global</TabsTrigger>
          <TabsTrigger value="modifiers">Activity Modifiers</TabsTrigger>
          <TabsTrigger value="penalties">Penalty Events</TabsTrigger>
          <TabsTrigger value="disputes">Point Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
        <Card className="rounded-[1.6rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-5 text-primary" />
              {pagePurpose.title}
            </CardTitle>
            <CardDescription>
              {pagePurpose.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.settings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="align-top">
                      <div>
                        <p className="font-medium">{setting.configLabel}</p>
                        <p className="text-xs text-muted-foreground">{setting.configKey}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="secondary">{setting.configValue}</Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <p>{setting.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {setting.siteName ?? "Global"} • update {setting.updatedByName ?? "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <form action={updateDailyActivityConfigAction} className="grid min-w-[220px] gap-2">
                        <input type="hidden" name="id" value={setting.id} />
                        <Input name="configValue" defaultValue={setting.configValue} />
                        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" name="isActive" defaultChecked={setting.isActive} />
                          Aktif
                        </Label>
                        <Button size="sm" type="submit">
                          Simpan
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="modifiers">
        <Card className="rounded-[1.6rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Activity Modifiers
            </CardTitle>
            <CardDescription>
              Event multiplier seperti double point, site competition, atau campaign produktivitas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={manageActivityModifierAction} className="space-y-4 rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <input type="hidden" name="intent" value="create" />
              <input type="hidden" name="createdByEmployeeId" value={data.currentEmployee?.id ?? ""} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Label className="grid gap-2">
                  Site
                  <select name="siteId" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Global</option>
                    {data.sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label className="grid gap-2">
                  Multiplier (%)
                  <Input name="multiplier" type="number" defaultValue={150} />
                </Label>
                <Label className="grid gap-2 sm:col-span-2">
                  Event name
                  <Input name="eventName" placeholder="Example: Double Point Week" />
                </Label>
                <Label className="grid gap-2">
                  Start date
                  <Input name="startDate" type="datetime-local" defaultValue={dateTimeLocalValue(new Date())} />
                </Label>
                <Label className="grid gap-2">
                  End date
                  <Input name="endDate" type="datetime-local" defaultValue={dateTimeLocalValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))} />
                </Label>
              </div>
              <Label className="grid gap-2">
                Description
                <Textarea name="description" rows={3} placeholder="Purpose of the event modifier and its application limits." />
              </Label>
              <Label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-3 text-sm">
                <input type="checkbox" name="isActive" defaultChecked />
                Aktifkan modifier
              </Label>
              <Button type="submit" className="w-full rounded-2xl">
                Tambah modifier
              </Button>
            </form>

            <div className="space-y-3">
              {data.modifiers.map((modifier) => (
                <div key={modifier.id} className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{modifier.eventName}</p>
                      <p className="text-xs text-muted-foreground">
                        {modifier.siteName ?? "Global"} • {modifier.creatorName ?? "-"}
                      </p>
                    </div>
                    <Badge className={modifier.isActive ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-800"}>
                      {modifier.multiplier}%
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{modifier.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {modifier.startDate.toLocaleString("id-ID")} -{" "}
                    {modifier.endDate ? modifier.endDate.toLocaleString("id-ID") : "tanpa batas"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <details className="rounded-lg border border-border/70 bg-background p-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Edit
                      </summary>
                      <form action={manageActivityModifierAction} className="mt-3 grid gap-3">
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={modifier.id} />
                        <input type="hidden" name="createdByEmployeeId" value={data.currentEmployee?.id ?? ""} />
                        <input type="hidden" name="siteId" value={modifier.siteId ?? ""} />
                        <input type="hidden" name="startDate" value={dateTimeLocalValue(modifier.startDate)} />
                        <input type="hidden" name="endDate" value={modifier.endDate ? dateTimeLocalValue(modifier.endDate) : ""} />
                        <Input name="eventName" defaultValue={modifier.eventName} />
                        <Input name="multiplier" type="number" defaultValue={modifier.multiplier} />
                        <Textarea name="description" defaultValue={modifier.description} rows={3} />
                        <Label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="isActive" defaultChecked={modifier.isActive} />
                          Aktif
                        </Label>
                        <Button type="submit" size="sm">Save</Button>
                      </form>
                    </details>
                    <form action={manageActivityModifierAction}>
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={modifier.id} />
                      <Button type="submit" variant="outline" size="sm" className="text-rose-700">
                        Hapus
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="penalties">
        <Card className="rounded-[1.6rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Penalty Events
            </CardTitle>
            <CardDescription>Audit trail penalty otomatis terbaru di Daily Activity System.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.penaltyEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.employeeName}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{event.penaltyCode}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>-{event.pointsDeducted}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{event.disputeStatus}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="disputes">
        <Card className="rounded-[1.6rem]">
          <CardHeader>
            <CardTitle>Point Disputes</CardTitle>
            <CardDescription>Daftar keberatan penalty yang sedang menunggu keputusan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.disputes.map((dispute) => (
              <div key={dispute.id} className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{dispute.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {dispute.penaltyCode} • {dispute.createdAt.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <Badge className={dispute.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-800"}>
                    {dispute.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{dispute.reason}</p>
                {dispute.resolutionNotes ? (
                  <p className="mt-2 text-xs text-muted-foreground">Resolution: {dispute.resolutionNotes}</p>
                ) : null}
                {dispute.status === "pending" && data.currentEmployee ? (
                  <details className="mt-3 rounded-xl border border-border/70 bg-background p-3">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Proses dispute
                    </summary>
                    <form action={resolvePointDisputeAction} className="mt-3 grid gap-3">
                      <input type="hidden" name="disputeId" value={dispute.id} />
                      <input type="hidden" name="resolvedByEmployeeId" value={data.currentEmployee.id} />
                      <Label className="grid gap-2 text-sm">
                        Keputusan
                        <select
                          name="decision"
                          defaultValue="approved"
                          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                        >
                          <option value="approved">Approve dispute dan restore poin</option>
                          <option value="rejected">Reject dispute</option>
                        </select>
                      </Label>
                      <Label className="grid gap-2 text-sm">
                        Catatan keputusan
                        <Textarea
                          name="resolutionNotes"
                          rows={3}
                          placeholder="Write approval/reject reason so audit trail remains clear."
                          required
                          minLength={5}
                        />
                      </Label>
                      <Button type="submit" size="sm" className="w-full rounded-xl">
                        Simpan keputusan
                      </Button>
                    </form>
                  </details>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
