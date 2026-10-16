"use client";

import * as React from "react";
import { HeroSearchableSelect, type HeroSearchableSelectOption } from "@/components/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ActivityModifierCreateFormProps {
  action: (formData: FormData) => Promise<void>;
  sites: Array<{ id: number; name: string }>;
  currentEmployeeId: number | string;
  defaultStartDate: string;
  defaultEndDate: string;
}

export function ActivityModifierCreateForm({
  action,
  sites,
  currentEmployeeId,
  defaultStartDate,
  defaultEndDate,
}: ActivityModifierCreateFormProps) {
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("");

  const siteOptions = React.useMemo<HeroSearchableSelectOption[]>(() => {
    return [
      { value: "", label: "Global (Semua Site)" },
      ...sites.map((site) => ({
        value: String(site.id),
        label: site.name,
      })),
    ];
  }, [sites]);

  return (
    <form action={action} className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
      <input type="hidden" name="intent" value="create" />
      <input type="hidden" name="createdByEmployeeId" value={String(currentEmployeeId)} />
      <input type="hidden" name="siteId" value={selectedSiteId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="siteSelect">Site Target</Label>
          <HeroSearchableSelect
            value={selectedSiteId}
            onChange={(val) => setSelectedSiteId(val ? String(val) : "")}
            options={siteOptions}
            placeholder="Pilih Site Target..."
            className="h-9"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="multiplier">Multiplier (%)</Label>
          <Input id="multiplier" name="multiplier" type="number" defaultValue={150} className="h-9" />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="eventName">Nama Event / Campaign</Label>
          <Input id="eventName" name="eventName" placeholder="Contoh: Double Point Productivity Week" className="h-9" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="startDate">Tanggal Mulai</Label>
          <Input id="startDate" name="startDate" type="datetime-local" defaultValue={defaultStartDate} className="h-9" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">Tanggal Selesai</Label>
          <Input id="endDate" name="endDate" type="datetime-local" defaultValue={defaultEndDate} className="h-9" required />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea id="description" name="description" rows={3} placeholder="Tujuan event modifier dan batas penerapannya." required />
      </div>

      <Label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm cursor-pointer">
        <input type="checkbox" name="isActive" defaultChecked className="size-4 rounded border-gray-300" />
        <span>Aktifkan modifier ini sekarang</span>
      </Label>

      <Button type="submit" className="w-full h-9 rounded-xl font-semibold">
        Tambah Modifier
      </Button>
    </form>
  );
}
