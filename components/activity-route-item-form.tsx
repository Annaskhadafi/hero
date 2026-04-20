"use client";

import * as React from "react";
import { manageActivityRouteItemAction } from "@/app/dashboard/activity-hub/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LibraryOption = {
  id: number;
  activityCode: string;
  activityName: string;
  category: string;
  basePoints: number;
};

type RouteItemValue = {
  id: number;
  libraryActivityId: number | null;
  itemCode: string;
  itemLabel: string;
  itemDescription: string;
  pointOverride: number | null;
  sortOrder: number;
  requiresUnit: boolean;
  requiresTime: boolean;
  requiresRemark: boolean;
  requiresPhoto: boolean;
  requiresChecklistEvidence: boolean;
  isOptional: boolean;
  allowCustomUnit: boolean;
  libraryPoints: number | null;
};

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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Label className="grid gap-2 text-sm font-semibold text-foreground">
      <span>{label}</span>
      {children}
    </Label>
  );
}

export function ActivityRouteItemForm({
  groupId,
  item,
  defaultSortOrder,
  library,
  selectClassName,
}: {
  groupId: number;
  item?: RouteItemValue;
  defaultSortOrder: number;
  library: LibraryOption[];
  selectClassName: string;
}) {
  const isUpdate = Boolean(item);
  const [libraryActivityId, setLibraryActivityId] = React.useState(item?.libraryActivityId ? String(item.libraryActivityId) : "");
  const [itemCode, setItemCode] = React.useState(item?.itemCode ?? "");
  const [itemLabel, setItemLabel] = React.useState(item?.itemLabel ?? "");
  const [itemDescription, setItemDescription] = React.useState(item?.itemDescription ?? "");
  const [pointOverride, setPointOverride] = React.useState(item?.pointOverride != null ? String(item.pointOverride) : "");

  const selectedLibrary = React.useMemo(
    () => library.find((libraryItem) => String(libraryItem.id) === libraryActivityId),
    [library, libraryActivityId],
  );

  function handleLibraryChange(value: string) {
    setLibraryActivityId(value);

    const nextLibrary = library.find((libraryItem) => String(libraryItem.id) === value);
    if (!nextLibrary) {
      return;
    }

    setItemCode(nextLibrary.activityCode);
    setItemLabel(nextLibrary.activityName);
    setItemDescription((current) => current || nextLibrary.category);
    setPointOverride("");
  }

  return (
    <form action={manageActivityRouteItemAction} className="grid gap-3">
      <input type="hidden" name="intent" value={isUpdate ? "update" : "create"} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input type="hidden" name="routeGroupId" value={groupId} />

      <FieldLabel label="Library activity">
        <select
          name="libraryActivityId"
          className={selectClassName}
          value={libraryActivityId}
          onChange={(event) => handleLibraryChange(event.target.value)}
        >
          <option value="">Custom item tanpa library</option>
          {library.map((libraryItem) => (
            <option key={libraryItem.id} value={libraryItem.id}>
              {libraryItem.activityCode} - {libraryItem.activityName}
            </option>
          ))}
        </select>
      </FieldLabel>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel label="Item code">
          <Input
            name="itemCode"
            value={itemCode}
            onChange={(event) => setItemCode(event.target.value)}
            placeholder="Pilih library atau isi custom"
          />
        </FieldLabel>
        <FieldLabel label="Sort">
          <Input name="sortOrder" type="number" defaultValue={item?.sortOrder ?? defaultSortOrder} />
        </FieldLabel>
      </div>

      <FieldLabel label="Item label">
        <Input
          name="itemLabel"
          value={itemLabel}
          onChange={(event) => setItemLabel(event.target.value)}
          placeholder="Pilih library atau isi nama checklist"
          required
        />
      </FieldLabel>

      <FieldLabel label="Description">
        <Textarea
          name="itemDescription"
          value={itemDescription}
          onChange={(event) => setItemDescription(event.target.value)}
          rows={3}
          placeholder="Keterangan pekerjaan."
        />
      </FieldLabel>

      <FieldLabel label="Point override">
        <Input
          name="pointOverride"
          type="number"
          value={pointOverride}
          onChange={(event) => setPointOverride(event.target.value)}
          placeholder={selectedLibrary ? `Kosong = pakai default ${selectedLibrary.basePoints} pts` : "Kosong = pakai default"}
        />
      </FieldLabel>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <CheckField name="requiresUnit" label="Butuh unit" defaultChecked={item?.requiresUnit ?? false} />
        <CheckField name="requiresTime" label="Butuh jam" defaultChecked={item?.requiresTime ?? true} />
        <CheckField name="requiresRemark" label="Butuh remark" defaultChecked={item?.requiresRemark ?? false} />
        <CheckField name="requiresPhoto" label="Butuh photo" defaultChecked={item?.requiresPhoto ?? false} />
        <CheckField
          name="requiresChecklistEvidence"
          label="Butuh evidence"
          defaultChecked={item?.requiresChecklistEvidence ?? false}
        />
        <CheckField name="isOptional" label="Optional" defaultChecked={item?.isOptional ?? false} />
        <CheckField name="allowCustomUnit" label="Custom unit" defaultChecked={item?.allowCustomUnit ?? true} />
      </div>

      <Button type="submit" size="sm" className="rounded-xl">
        {isUpdate ? "Simpan item" : "Tambah item"}
      </Button>
    </form>
  );
}
