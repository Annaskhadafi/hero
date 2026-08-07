"use client";

import { useState } from "react";
import { manageActivityLibraryAction } from "@/app/dashboard/activity-hub/actions";
import { ActivityLibraryRouteMappingField } from "@/components/activity-library-route-mapping-field";
import { ActivityRouteDepartmentSectionFields } from "@/components/activity-route-scope-fields";
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
  sites,
  departments,
  sections,
}: {
  currentEmployeeId: number | null;
  routeFolders: AdminRouteFolder[];
  sites: Array<{ id: number; name: string }>;
  departments: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; name: string; departmentId: number | null }>;
}) {
  const [isGroupChecked, setIsGroupChecked] = useState(false);

  return (
    <form action={manageActivityLibraryAction} className="space-y-4">
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
          <div className="sm:col-span-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <ActivityLibraryRouteMappingField routeFolders={routeFolders} />
          </div>
        ) : null}

        <Label className="grid gap-2 sm:col-span-2">
          Lokasi kerja / Site
          <select name="siteId" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
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
          selectClassName="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          departmentPlaceholder="No specific department"
          sectionPlaceholder="No specific section"
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

      <Button type="submit" className="w-full rounded-lg">
        Simpan activity library
      </Button>
    </form>
  );
}
