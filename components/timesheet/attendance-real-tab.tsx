"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AttendanceRealBulkToolbar({
  enabled,
  selectedCount,
  onToggle,
  onSetPresent,
  onSetSick,
  onSetLeave,
  onSetEmpty,
  onClear,
}: {
  enabled: boolean;
  selectedCount: number;
  onToggle: () => void;
  onSetPresent: () => void;
  onSetSick: () => void;
  onSetLeave: () => void;
  onSetEmpty: () => void;
  onClear: () => void;
}) {
  const disabled = selectedCount === 0;

  return (
    <Card className="surface-module-card rounded-[1rem] border-0 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-8 rounded-full px-3 text-xs" variant={enabled ? "default" : "outline"} onClick={onToggle}>
            Multi Select {selectedCount ? `(${selectedCount})` : ""}
          </Button>
          <Button className="h-8 rounded-full px-3 text-xs" variant="outline" disabled={disabled} onClick={onSetPresent}>Masuk</Button>
          <Button className="h-8 rounded-full px-3 text-xs" variant="outline" disabled={disabled} onClick={onSetSick}>Sakit</Button>
          <Button className="h-8 rounded-full px-3 text-xs" variant="outline" disabled={disabled} onClick={onSetLeave}>Izin</Button>
          <Button className="h-8 rounded-full px-3 text-xs" variant="outline" disabled={disabled} onClick={onSetEmpty}>-</Button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">Pilih banyak cell, lalu apply.</p>
          <Button className="h-8 px-2 text-xs" variant="ghost" disabled={disabled} onClick={onClear}>Clear</Button>
        </div>
      </div>
    </Card>
  );
}
