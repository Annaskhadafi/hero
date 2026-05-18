import { redirect } from "next/navigation";
import { GitBranch, Layers3, ListChecks, Pencil, Plus, Route, Trash2 } from "lucide-react";
import {
  manageActivityRouteGroupAction,
  manageActivityRouteItemAction,
  manageActivityRouteTemplateAction,
  manageActivitySectionOverrideAction,
} from "@/app/dashboard/activity-hub/actions";
import { ActivityRouteItemForm } from "@/components/activity-route-item-form";
import { ActivityRouteDepartmentSectionFields } from "@/components/activity-route-scope-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityRouteBuilderData } from "@/lib/daily-activity";

type RouteBuilderData = Awaited<ReturnType<typeof getDailyActivityRouteBuilderData>>;
type RouteTemplate = RouteBuilderData["templates"][number];
type RouteGroup = RouteTemplate["groups"][number];
type RouteItem = RouteGroup["items"][number];

const selectClass =
  "h-11 rounded-xl border-0 bg-surface-container-low px-3 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)] outline-none focus:shadow-[inset_0_-2px_0_#003461]";

function SummaryChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-border/60">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className="ml-3 font-display text-xl font-black text-foreground">{value}</span>
    </div>
  );
}

function CheckField({
  name,
  label,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <Label className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10)]">
      <input type="hidden" name={name} value="false" />
      <input type="checkbox" name={name} value="true" defaultChecked={defaultChecked} />
      {label}
    </Label>
  );
}

function FieldLabel({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Label className={`grid gap-2 text-sm font-semibold text-foreground ${className}`}>
      <span>{label}</span>
      {children}
    </Label>
  );
}

function scopeText(template: RouteTemplate) {
  return [
    template.siteName ?? "Semua site",
    template.departmentName ?? "Semua department",
    template.sectionName ?? "Semua section",
    template.positionName ?? "Semua jabatan",
  ].join(" / ");
}

function itemBadges(item: RouteItem) {
  return [
    item.requiresUnit ? "Unit" : null,
    item.requiresTime ? "Time" : null,
    item.requiresRemark ? "Remark" : null,
    item.requiresPhoto ? "Photo" : null,
    item.requiresChecklistEvidence ? "Evidence" : null,
    item.allowCustomUnit ? "Custom unit" : null,
    item.isOptional ? "Optional" : "Mandatory",
  ].filter(Boolean) as string[];
}

function RouteTemplateForm({
  data,
  template,
}: {
  data: RouteBuilderData;
  template?: RouteTemplate;
}) {
  const isUpdate = Boolean(template);

  return (
    <form action={manageActivityRouteTemplateAction} className="grid gap-4">
      <input type="hidden" name="intent" value={isUpdate ? "update" : "create"} />
      {template ? <input type="hidden" name="id" value={template.id} /> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <FieldLabel label="Route code">
          <Input name="routeCode" defaultValue={template?.routeCode ?? ""} placeholder="ROUTE-TS-002" required />
        </FieldLabel>
        <FieldLabel label="Version">
          <Input name="versionLabel" defaultValue={template?.versionLabel ?? "v1"} placeholder="v1" />
        </FieldLabel>
        <FieldLabel label="Route name" className="lg:col-span-2">
          <Input
            name="routeName"
            defaultValue={template?.routeName ?? ""}
            placeholder="Tire Service Daily Route - Night Shift"
            required
          />
        </FieldLabel>
        <FieldLabel label="Site">
          <select name="siteId" className={selectClass} defaultValue={template?.siteId ?? ""}>
            <option value="">Semua site</option>
            {data.sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </FieldLabel>
        <ActivityRouteDepartmentSectionFields
          departments={data.departments}
          sections={data.sections}
          defaultDepartmentId={template?.departmentId}
          defaultSectionId={template?.sectionId}
          selectClassName={selectClass}
        />
        <FieldLabel label="Position">
          <select name="positionId" className={selectClass} defaultValue={template?.positionId ?? ""}>
            <option value="">Semua jabatan</option>
            {data.positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Shift">
          <Input name="shiftCode" defaultValue={template?.shiftCode ?? "ALL"} placeholder="DAY / NIGHT / ALL" />
        </FieldLabel>
        <FieldLabel label="Description" className="lg:col-span-2">
          <Textarea
            name="description"
            defaultValue={template?.description ?? ""}
            rows={3}
            placeholder="Short route description and when it is used."
          />
        </FieldLabel>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <CheckField name="mobileEnabled" label="Mobile enabled" defaultChecked={template?.mobileEnabled ?? true} />
        <CheckField name="approvalRequired" label="Need approval" defaultChecked={template?.approvalRequired ?? false} />
        <CheckField name="isActive" label="Aktif" defaultChecked={template?.isActive ?? true} />
      </div>

      <Button type="submit" className="rounded-xl">
        {isUpdate ? "Simpan route" : "Tambah route"}
      </Button>
    </form>
  );
}

function AddRouteDialog({ data }: { data: RouteBuilderData }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-xl px-4">
          <Plus className="size-4" />
          Tambah route baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl overflow-hidden bg-surface-container-lowest p-0">
        <DialogHeader className="bg-surface-container-low px-6 py-5 pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Route className="size-5 text-primary" />
            Tambah Route Baru
          </DialogTitle>
          <DialogDescription>
            Create route per section, position, and shift. After saving, open route row to add group and item.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-6 py-5">
          <RouteTemplateForm data={data} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddGroupDialog({
  templateId,
  defaultSortOrder,
}: {
  templateId: number;
  defaultSortOrder: number;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" className="size-11 rounded-xl" title="Add group">
          <GitBranch className="size-4" />
          <span className="sr-only">Tambah group</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl overflow-hidden bg-surface-container-lowest p-0">
        <DialogHeader className="bg-surface-container-low px-6 py-5 pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GitBranch className="size-5 text-primary" />
            Tambah Group
          </DialogTitle>
          <DialogDescription>
            Group jadi level nested pertama di bawah route. Item checklist ditambahkan setelah group ada.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-6 py-5">
          <RouteGroupForm templateId={templateId} defaultSortOrder={defaultSortOrder} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditRouteDialog({ data, template }: { data: RouteBuilderData; template: RouteTemplate }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="size-11 rounded-xl border-0 bg-surface-container-low text-primary shadow-[inset_0_0_0_1px_rgba(0,52,97,0.14)]"
          title="Edit route"
        >
          <Pencil className="size-4" />
          <span className="sr-only">Edit route</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl overflow-hidden bg-surface-container-lowest p-0">
        <DialogHeader className="bg-surface-container-low px-6 py-5 pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Route className="size-5 text-primary" />
            Edit Route
          </DialogTitle>
          <DialogDescription>
            Ubah scope route, status mobile, approval, dan metadata utama.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-6 py-5">
          <RouteTemplateForm data={data} template={template} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RouteGroupForm({
  templateId,
  group,
  defaultSortOrder,
}: {
  templateId: number;
  group?: RouteGroup;
  defaultSortOrder: number;
}) {
  const isUpdate = Boolean(group);

  return (
    <form action={manageActivityRouteGroupAction} className="grid gap-3">
      <input type="hidden" name="intent" value={isUpdate ? "update" : "create"} />
      {group ? <input type="hidden" name="id" value={group.id} /> : null}
      <input type="hidden" name="routeTemplateId" value={templateId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel label="Group key">
          <Input name="groupKey" defaultValue={group?.groupKey ?? ""} placeholder="inspection-night" required />
        </FieldLabel>
        <FieldLabel label="Sort">
          <Input name="sortOrder" type="number" defaultValue={group?.sortOrder ?? defaultSortOrder} />
        </FieldLabel>
      </div>
      <FieldLabel label="Group name">
        <Input name="groupName" defaultValue={group?.groupName ?? ""} placeholder="Inspection / Night Shift" required />
      </FieldLabel>
      <FieldLabel label="Description">
        <Textarea name="description" defaultValue={group?.description ?? ""} rows={3} placeholder="Group description." />
      </FieldLabel>
      <CheckField name="isRequired" label="Required group" defaultChecked={group?.isRequired ?? true} />
      <Button type="submit" size="sm" className="rounded-xl">
        {isUpdate ? "Simpan group" : "Tambah group"}
      </Button>
    </form>
  );
}

function DeleteForm({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: number;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="intent" value="delete" />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" className="rounded-xl border-0 bg-white text-rose-700">
        <Trash2 className="size-4" />
        {label}
      </Button>
    </form>
  );
}

function GroupBuilder({
  template,
  group,
  data,
}: {
  template: RouteTemplate;
  group: RouteGroup;
  data: RouteBuilderData;
}) {
  return (
    <details className="group rounded-[1.1rem] bg-white ring-1 ring-border/60">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 md:grid-cols-[minmax(220px,1fr)_130px_130px_130px] md:items-center [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            {group.groupKey}
          </span>
          <span className="mt-1 block font-display text-base font-black text-foreground">{group.groupName}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{group.description || "No description."}</span>
        </span>
        <Badge variant="outline" className="w-fit rounded-full border-0 bg-surface-container-low">
          Sort {group.sortOrder}
        </Badge>
        <Badge variant="outline" className="w-fit rounded-full border-0 bg-surface-container-low">
          {group.items.length} item
        </Badge>
        <span className="text-sm font-semibold text-primary">Open group</span>
      </summary>

      <div className="space-y-4 bg-surface-container-low px-4 pb-4 pt-1">
        <div className="space-y-2">
          {group.items.length > 0 ? (
            group.items.map((item) => (
              <details key={item.id} className="rounded-xl bg-white p-3 ring-1 ring-border/60">
                <summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[minmax(220px,1fr)_140px_120px_100px] md:items-center [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      {item.itemCode || item.libraryCode || "CUSTOM"}
                    </span>
                    <span className="mt-1 block font-semibold text-foreground">{item.itemLabel}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.itemDescription || item.libraryName || "No item description."}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">{item.libraryCode ?? "Custom"}</span>
                  <Badge className="w-fit border-0 bg-[#eaf4fb] text-[#003f78]">
                    {item.pointOverride ?? item.libraryPoints ?? 0} pts
                  </Badge>
                  <span className="text-sm font-semibold text-primary">Edit</span>
                </summary>
                <div className="mt-3 space-y-3 rounded-xl bg-surface-container-low p-3">
                  <div className="flex flex-wrap gap-2">
                    {itemBadges(item).map((badge) => (
                      <Badge key={badge} variant="outline" className="rounded-full border-0 bg-white">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  <ActivityRouteItemForm
                    groupId={group.id}
                    item={item}
                    defaultSortOrder={item.sortOrder}
                    library={data.library}
                    selectClassName={selectClass}
                  />
                  <DeleteForm action={manageActivityRouteItemAction} id={item.id} label="Delete item" />
                </div>
              </details>
            ))
          ) : (
            <div className="rounded-xl bg-white px-4 py-5 text-sm text-muted-foreground">
              Group ini belum punya item.
            </div>
          )}
        </div>

        <details className="rounded-xl bg-white p-4 ring-1 ring-border/60">
          <summary className="cursor-pointer list-none text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
            + Tambah item ke group ini
          </summary>
          <div className="mt-4">
            <ActivityRouteItemForm
              groupId={group.id}
              defaultSortOrder={group.items.length + 1}
              library={data.library}
              selectClassName={selectClass}
            />
          </div>
        </details>

        <details className="rounded-xl bg-white p-4 ring-1 ring-border/60">
          <summary className="cursor-pointer list-none text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
            Edit / hapus group
          </summary>
          <div className="mt-4 space-y-3">
            <RouteGroupForm templateId={template.id} group={group} defaultSortOrder={group.sortOrder} />
            <DeleteForm action={manageActivityRouteGroupAction} id={group.id} label="Delete group" />
          </div>
        </details>
      </div>
    </details>
  );
}

function RouteBuilderRow({ template, data }: { template: RouteTemplate; data: RouteBuilderData }) {
  const itemCount = template.groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <TableRow>
      <TableCell className="p-0">
        <details className="group">
          <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 hover:bg-surface-container-low/60 md:grid-cols-[minmax(260px,1.35fr)_minmax(240px,1fr)_130px_120px_120px] md:items-center [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                {template.routeCode} • {template.versionLabel}
              </span>
              <span className="mt-1 block font-display text-lg font-black text-foreground">{template.routeName}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {template.description || "No route description."}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">{scopeText(template)}</span>
            <span className="text-sm font-semibold text-foreground">{template.shiftCode}</span>
            <span className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full border-0 bg-surface-container-low">
                {template.groups.length} group
              </Badge>
              <Badge variant="outline" className="rounded-full border-0 bg-surface-container-low">
                {itemCount} item
              </Badge>
            </span>
            <span className="flex items-center gap-2">
              <Badge className={template.isActive ? "border-0 bg-emerald-100 text-emerald-900" : "border-0 bg-slate-100 text-slate-800"}>
                {template.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
              <span className="text-sm font-semibold text-primary">Open</span>
            </span>
          </summary>

          <div className="space-y-4 bg-surface-container-low px-4 py-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <div className="space-y-3">
                <div className="rounded-xl bg-white px-4 py-3 text-sm text-muted-foreground ring-1 ring-border/60">
                  Nested route: open group, then open item to edit points, unit, time, remark, photo, evidence.
                </div>
                {template.groups.length > 0 ? (
                  template.groups.map((group) => (
                    <GroupBuilder key={group.id} template={template} group={group} data={data} />
                  ))
                ) : (
                  <div className="rounded-xl bg-white px-4 py-6 text-sm text-muted-foreground">
                    Route ini belum punya group.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Card className="border-0 bg-white ring-1 ring-border/60">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Route actions
                    </p>
                    <div className="flex items-center gap-2">
                      <AddGroupDialog templateId={template.id} defaultSortOrder={template.groups.length + 1} />
                      <EditRouteDialog data={data} template={template} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-white ring-1 ring-border/60">
                  <CardContent className="space-y-3 p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-surface-container-low px-3 py-2">
                        <span className="block text-xs text-muted-foreground">Mobile</span>
                        <span className="font-semibold">{template.mobileEnabled ? "Enabled" : "Disabled"}</span>
                      </div>
                      <div className="rounded-xl bg-surface-container-low px-3 py-2">
                        <span className="block text-xs text-muted-foreground">Approval</span>
                        <span className="font-semibold">{template.approvalRequired ? "Required" : "No"}</span>
                      </div>
                    </div>
                    <DeleteForm action={manageActivityRouteTemplateAction} id={template.id} label="Delete route" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </details>
      </TableCell>
    </TableRow>
  );
}

function OverrideForm({ data }: { data: RouteBuilderData }) {
  return (
    <form action={manageActivitySectionOverrideAction} className="grid gap-4">
      <input type="hidden" name="intent" value="create" />
      <FieldLabel label="Library activity">
        <select name="libraryActivityId" className={selectClass}>
          {data.library.map((library) => (
            <option key={library.id} value={library.id}>
              {library.activityCode} - {library.activityName}
            </option>
          ))}
        </select>
      </FieldLabel>
      <div className="grid gap-3 lg:grid-cols-2">
        <FieldLabel label="Site">
          <select name="siteId" className={selectClass}>
            <option value="">Semua site</option>
            {data.sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </FieldLabel>
        <ActivityRouteDepartmentSectionFields
          departments={data.departments}
          sections={data.sections}
          selectClassName={selectClass}
        />
        <FieldLabel label="Position">
          <select name="positionId" className={selectClass}>
            <option value="">Semua jabatan</option>
            {data.positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Override label">
          <Input name="overrideLabel" placeholder="Optional - section item name" />
        </FieldLabel>
        <FieldLabel label="Override points">
          <Input name="overridePoints" type="number" placeholder="Blank = use default points" />
        </FieldLabel>
        <FieldLabel label="Reason" className="lg:col-span-2">
          <Textarea name="reason" rows={3} placeholder="Reason for label / point change." />
        </FieldLabel>
      </div>
      <CheckField name="isActive" label="Aktif" defaultChecked />
      <Button type="submit" className="rounded-xl">
        Simpan override
      </Button>
    </form>
  );
}

export default async function DailyActivityRoutesPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityRouteBuilderData(session.user.email);

  return (
    <div className="space-y-5">
      <div className="rounded-[1.25rem] bg-surface-container-low p-4">
        <div className="flex flex-wrap gap-3">
          <SummaryChip label="Routes" value={data.metrics.templates} />
          <SummaryChip label="Active" value={data.metrics.activeTemplates} />
          <SummaryChip label="Groups" value={data.metrics.groups} />
          <SummaryChip label="Items" value={data.metrics.items} />
          <SummaryChip label="Overrides" value={data.metrics.overrides} />
        </div>
      </div>

      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="routes">Route Builder</TabsTrigger>
          <TabsTrigger value="overrides">Point Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          <Card className="surface-module-card rounded-[1.1rem] border-0">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ListChecks className="size-5 text-primary" />
                    Simple Nested Routes
                  </CardTitle>
                  <CardDescription>
                    List route first. Click route to open group. Click group to open item.
                  </CardDescription>
                </div>
                <AddRouteDialog data={data} />
              </div>
            </CardHeader>
            <CardContent>
              <MinimalTableShell
                label="routes"
                fileName="activity-routes"
                searchPlaceholder="Search route, section, position, site, or shift..."
                dateFilter={false}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="grid gap-3 md:grid-cols-[minmax(260px,1.35fr)_minmax(240px,1fr)_130px_120px_120px]">
                          <span>Route</span>
                          <span>Scope</span>
                          <span>Shift</span>
                          <span>Nested</span>
                          <span>Status / Aksi</span>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.templates.length > 0 ? (
                      data.templates.map((template) => (
                        <RouteBuilderRow key={template.id} template={template} data={data} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell className="h-24 text-center text-muted-foreground">
                          Belum ada route template.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides" className="space-y-4">
          <Card className="surface-module-card rounded-[1.1rem] border-0">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Layers3 className="size-5 text-primary" />
                    Section Point Overrides
                  </CardTitle>
                  <CardDescription>
                    Section Head can override label and default points without breaking global library.
                  </CardDescription>
                </div>
                <details className="w-full rounded-2xl bg-surface-container-low p-4 lg:w-[420px]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-primary [&::-webkit-details-marker]:hidden">
                    <Plus className="size-4" />
                    Tambah override
                  </summary>
                  <div className="mt-4">
                    <OverrideForm data={data} />
                  </div>
                </details>
              </div>
            </CardHeader>
            <CardContent>
              <MinimalTableShell
                label="point overrides"
                fileName="activity-point-overrides"
                searchPlaceholder="Search section, position, library code, or override..."
                dateFilter={false}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Library</TableHead>
                      <TableHead className="min-w-[240px]">Scope</TableHead>
                      <TableHead className="min-w-[220px]">Override</TableHead>
                      <TableHead className="min-w-[180px]">Reason</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.overrides.length > 0 ? (
                      data.overrides.map((override) => (
                        <TableRow key={override.id}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{override.libraryName}</p>
                              <p className="text-xs text-muted-foreground">{override.libraryCode}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="text-sm">
                              <p>{override.sectionName ?? "Semua section"}</p>
                              <p className="text-xs text-muted-foreground">
                                {override.positionName ?? "Semua jabatan"} / {override.departmentName ?? "Semua department"}
                              </p>
                              <p className="text-xs font-semibold text-primary">{override.siteName ?? "Semua site"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1 text-sm">
                              <p>{override.overrideLabel || "(pakai label default)"}</p>
                              <p className="text-xs text-muted-foreground">
                                {override.overridePoints != null ? `${override.overridePoints} pts` : "Pakai point default"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">{override.reason || "-"}</TableCell>
                          <TableCell className="align-top">
                            <Badge className={override.isActive ? "border-0 bg-emerald-100 text-emerald-900" : "border-0 bg-slate-100 text-slate-800"}>
                              {override.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Belum ada override poin.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
