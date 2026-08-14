"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { manageActivityLibraryAction } from "@/app/dashboard/activity-hub/actions";
import { ActivityGroupMemberSelector, type MinimalActivityOption } from "@/components/activity-group-member-selector";
import { ActivityLibraryRouteMappingField } from "@/components/activity-library-route-mapping-field";
import { ActivityDepartmentSectionMultiSelect } from "@/components/activity-department-section-multi-select";
import { ActivitySiteMultiSelect } from "@/components/activity-site-multi-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminRouteFolder } from "@/lib/daily-activity";

const CREATE_CATEGORY_OPTIONS = ["Technical", "HSE", "Administrative", "Training", "Wellness", "Standby"];

const CREATE_TOGGLE_FIELDS = [
  ["requiresPhoto", "Wajib foto"],
  ["requiresEquipmentNo", "Wajib nomor equipment"],
  ["requiresDuration", "Wajib durasi"],
  ["requiresLocationGps", "Wajib GPS"],
  ["requiresMaterialUsed", "Wajib material"],
  ["requiresTireCount", "Pilihan jumlah tire"],
  ["isAssignable", "Bisa di-assign"],
  ["isSelfInput", "Bisa self-input"],
  ["approvalRequired", "Butuh approval"],
  ["autoApproveIfGpsValid", "Auto-approve jika GPS valid"],
  ["isActive", "Aktif"],
] as const;

const CREATE_DEFAULT_CHECKED = ["requiresDuration", "isAssignable", "isSelfInput", "approvalRequired", "isActive"];

export function ActivityLibraryCreateForm({
  currentEmployeeId,
  routeFolders,
  existingActivities = [],
  sites,
  departments,
  sections,
}: {
  currentEmployeeId: number | null;
  routeFolders: AdminRouteFolder[];
  existingActivities?: MinimalActivityOption[];
  sites: Array<{ id: number; name: string }>;
  departments: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; name: string; departmentId: number | null }>;
}) {
  const [isGroupChecked, setIsGroupChecked] = useState(false);
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSaving(true);

    try {
      const formData = new FormData(event.currentTarget);
      await manageActivityLibraryAction(formData);
      setFeedback({ status: "success", message: "Kamus aktivitas tersimpan." });
      router.refresh();
    } catch (error) {
      setFeedback({
        status: "error",
        message: error instanceof Error ? error.message : "Gagal menyimpan kamus aktivitas.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="intent" value="create" />
      <input type="hidden" name="createdByEmployeeId" value={currentEmployeeId ?? ""} />

      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Konfigurasi Activity</span>
        <label className="flex items-center gap-2 cursor-pointer border border-border/85 rounded-lg px-2.5 py-1 bg-surface-container-low text-sm font-semibold shadow-sm">
          <span>Group</span>
          <input
            type="checkbox"
            name="isGroupActivity"
            checked={isGroupChecked}
            onChange={(event) => setIsGroupChecked(event.target.checked)}
            className="h-4 w-4 rounded-[4px] border-border text-primary shadow-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 items-start">
        <Label className="grid gap-2">
          Activity code
          <Input name="activityCode" placeholder="TS-003" required />
        </Label>
        <Label className="grid gap-2">
          Category
          <select name="category" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            {CREATE_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Label>
        <Label className="grid gap-2 sm:col-span-2">
          Activity name
          <Input name="activityName" placeholder="Official activity name shown to employees" required />
        </Label>

        {isGroupChecked ? (
          <div className="sm:col-span-2 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
            <ActivityGroupMemberSelector existingActivities={existingActivities} />
            <div className="pt-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Atau Petakan ke Route Template (Opsional):
              </span>
              <ActivityLibraryRouteMappingField routeFolders={routeFolders} />
            </div>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <ActivitySiteMultiSelect sites={sites} />
        </div>
        <div className="sm:col-span-2">
          <ActivityDepartmentSectionMultiSelect departments={departments} sections={sections} />
        </div>
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
        {CREATE_TOGGLE_FIELDS.map(([field, label]) => (
          <Label
            key={field}
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm"
          >
            <input
              type="checkbox"
              name={field}
              defaultChecked={CREATE_DEFAULT_CHECKED.includes(field)}
            />
            {label}
          </Label>
        ))}
      </div>

      {feedback ? (
        <Alert
          variant={feedback.status === "error" ? "destructive" : "default"}
          className={
            feedback.status === "success"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-red-50 text-red-700 ring-red-200"
          }
        >
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full rounded-lg" disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Simpan activity library
      </Button>
    </form>
  );
}
