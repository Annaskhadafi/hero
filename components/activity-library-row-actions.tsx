"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { manageActivityLibraryAction } from "@/app/dashboard/activity-hub/actions";
import { ActivityRouteDepartmentSectionFields } from "@/components/activity-route-scope-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type ActivityLibraryRow = {
  id: number;
  activityCode: string;
  activityName: string;
  category: string;
  siteId: number | null;
  siteName: string | null;
  departmentId: number | null;
  sectionId: number | null;
  departmentName: string | null;
  sectionName: string | null;
  basePoints: number;
  complexityLevel: number;
  requiresPhoto: boolean;
  requiresEquipmentNo: boolean;
  requiresDuration: boolean;
  requiresLocationGps: boolean;
  requiresMaterialUsed: boolean;
  maxDailyCount: number;
  maxPointsPerDay: number;
  isAssignable: boolean;
  isSelfInput: boolean;
  approvalRequired: boolean;
  autoApproveIfGpsValid: boolean;
  slaHours: number;
  isActive: boolean;
};

type DepartmentOption = {
  id: number;
  code: string;
  name: string;
};

type SectionOption = {
  id: number;
  code: string;
  name: string;
  departmentId: number | null;
};

type SiteOption = {
  id: number;
  name: string;
  location: string;
};

const CATEGORY_OPTIONS = ["Technical", "HSE", "Administrative", "Training", "Wellness", "Standby"];

const BOOLEAN_FIELDS = [
  "requiresPhoto",
  "requiresEquipmentNo",
  "requiresDuration",
  "requiresLocationGps",
  "requiresMaterialUsed",
  "isAssignable",
  "isSelfInput",
  "approvalRequired",
  "autoApproveIfGpsValid",
  "isActive",
];

const VALIDATION_FIELDS = [
  ["requiresPhoto", "Wajib foto"],
  ["requiresEquipmentNo", "Wajib nomor equipment"],
  ["requiresDuration", "Wajib durasi"],
  ["requiresLocationGps", "Wajib GPS"],
  ["requiresMaterialUsed", "Wajib material"],
] as const;

const BEHAVIOR_FIELDS = [
  ["isAssignable", "Bisa di-assign"],
  ["isSelfInput", "Bisa self-input"],
  ["approvalRequired", "Butuh approval"],
  ["autoApproveIfGpsValid", "Auto approve jika GPS valid"],
  ["isActive", "Aktif"],
] as const;

function asBooleanFieldValue(row: ActivityLibraryRow, field: string) {
  return Boolean(row[field as keyof ActivityLibraryRow]);
}

export function ActivityLibraryRowActions({
  row,
  departments,
  sections,
  sites,
  library,
  currentEmployeeId,
}: {
  row: ActivityLibraryRow;
  departments: DepartmentOption[];
  sections: SectionOption[];
  sites: SiteOption[];
  library: any[];
  currentEmployeeId: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const categoryOptions = CATEGORY_OPTIONS.includes(row.category)
    ? CATEGORY_OPTIONS
    : [row.category, ...CATEGORY_OPTIONS];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    for (const field of BOOLEAN_FIELDS) {
      formData.set(field, formData.has(field) ? "true" : "false");
    }

    try {
      await manageActivityLibraryAction(formData);
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal update activity library.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Hapus activity "${row.activityName}"?`);
    if (!confirmed) return;

    setError("");
    setIsDeleting(true);

    try {
      const formData = new FormData();
      formData.set("intent", "delete");
      formData.set("id", `${row.id}`);
      await manageActivityLibraryAction(formData);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal hapus activity library.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl text-primary hover:bg-surface-container-low"
            aria-label={`Edit ${row.activityName}`}
            title={`Edit ${row.activityName}`}
          >
            <Pencil className="size-4" />
            <span className="sr-only">Edit activity</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Kamus Aktivitas</DialogTitle>
            <DialogDescription>
              Update identitas activity, scoring, validasi bukti, dan perilaku approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="createdByEmployeeId" value={currentEmployeeId ?? ""} />

            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-foreground">{row.activityName}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {row.activityCode} - {row.departmentName ?? "Global"} / {row.sectionName ?? "-"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{row.basePoints} pts</Badge>
                  <Badge variant="outline">SLA {row.slaHours} jam</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Label className="grid gap-2 text-sm font-semibold">
                Activity code
                <Input name="activityCode" defaultValue={row.activityCode} required />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold">
                Category
                <select
                  name="category"
                  defaultValue={row.category}
                  className="h-12 rounded-lg border-0 bg-surface-container-low px-4 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)]"
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Label>
              <Label className="grid gap-2 text-sm font-semibold md:col-span-2">
                Main Activity (Parent)
                <select
                  name="parentId"
                  defaultValue={row.parentId ?? ""}
                  className="h-12 rounded-lg border-0 bg-surface-container-low px-4 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)]"
                >
                  <option value="">- Tidak ada (Sebagai Main Activity) -</option>
                  {library
                    .filter((act) => !act.parentId && act.id !== row.id)
                    .map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.activityName} ({act.activityCode})
                      </option>
                    ))}
                </select>
              </Label>
              <Label className="grid gap-2 text-sm font-semibold md:col-span-2">
                Activity name
                <Input name="activityName" defaultValue={row.activityName} required />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold md:col-span-2">
                Lokasi kerja / Site
                <select
                  name="siteId"
                  defaultValue={row.siteId ?? ""}
                  className="h-12 rounded-lg border-0 bg-surface-container-low px-4 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)]"
                >
                  <option value="">Global - semua site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </Label>
              <ActivityRouteDepartmentSectionFields
                departments={departments}
                sections={sections}
                defaultDepartmentId={row.departmentId}
                defaultSectionId={row.sectionId}
                selectClassName="h-12 rounded-lg border-0 bg-surface-container-low px-4 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)]"
                departmentPlaceholder="Global"
                sectionPlaceholder="No section"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Label className="grid gap-2 text-sm font-semibold">
                Base points
                <Input name="basePoints" type="number" min={0} max={500} defaultValue={row.basePoints} />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold">
                Complexity
                <Input name="complexityLevel" type="number" min={1} max={5} defaultValue={row.complexityLevel} />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold">
                Max daily count
                <Input name="maxDailyCount" type="number" min={1} max={20} defaultValue={row.maxDailyCount} />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold">
                SLA hours
                <Input name="slaHours" type="number" min={1} max={240} defaultValue={row.slaHours} />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold md:col-span-2">
                Max points per day
                <Input name="maxPointsPerDay" type="number" min={1} max={1000} defaultValue={row.maxPointsPerDay} />
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs font-black uppercase text-muted-foreground">Validation required</p>
                <div className="mt-3 grid gap-2">
                  {VALIDATION_FIELDS.map(([field, label]) => (
                    <Label key={field} className="flex min-h-11 items-center gap-3 rounded-lg bg-white px-3 text-sm font-semibold">
                      <input type="checkbox" name={field} defaultChecked={asBooleanFieldValue(row, field)} />
                      {label}
                    </Label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs font-black uppercase text-muted-foreground">Workflow behavior</p>
                <div className="mt-3 grid gap-2">
                  {BEHAVIOR_FIELDS.map(([field, label]) => (
                    <Label key={field} className="flex min-h-11 items-center gap-3 rounded-lg bg-white px-3 text-sm font-semibold">
                      <input type="checkbox" name={field} defaultChecked={asBooleanFieldValue(row, field)} />
                      {label}
                    </Label>
                  ))}
                </div>
              </div>
            </div>

            {error ? (
              <Alert className="border-red-200 text-red-700">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="rounded-xl" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Simpan perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-xl text-rose-700 hover:bg-rose-50"
        onClick={() => void handleDelete()}
        disabled={isDeleting}
        aria-label={`Hapus ${row.activityName}`}
        title={`Hapus ${row.activityName}`}
      >
        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        <span className="sr-only">Hapus activity</span>
      </Button>
    </div>
  );
}
