"use client";

import { Button } from "@/components/ui/button";
import { MousePointerClick, Check, X, Sparkles, Pencil } from "lucide-react";

export function AttendanceRealBulkToolbar({
  enabled,
  selectedCount,
  onToggle,
  onOpenBulkEditModal,
  onSelectAllWeekends,
  onSetPresent,
  onSetOff,
  onSetSick,
  onSetLeave,
  onSetEmpty,
  onClear,
}: {
  enabled: boolean;
  selectedCount: number;
  onToggle: () => void;
  onOpenBulkEditModal?: () => void;
  onSelectAllWeekends?: () => void;
  onSetPresent: () => void;
  onSetOff?: () => void;
  onSetSick: () => void;
  onSetLeave: () => void;
  onSetEmpty: () => void;
  onClear: () => void;
}) {
  const disabled = selectedCount === 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-white p-2.5 shadow-xs dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={enabled ? "default" : "outline"}
          onClick={onToggle}
          className="h-8 rounded-lg text-xs font-semibold"
        >
          <MousePointerClick className="mr-1.5 size-3.5" />
          Multi Select Mode {selectedCount ? `(${selectedCount})` : ""}
        </Button>
        {enabled && (
          <>
            <div className="h-4 w-px bg-border/60" />
            {onOpenBulkEditModal && (
              <Button
                size="sm"
                variant="default"
                disabled={disabled}
                onClick={onOpenBulkEditModal}
                className="h-8 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-xs"
              >
                <Pencil className="mr-1.5 size-3.5" />
                Edit {selectedCount ? `(${selectedCount})` : ""} Sel Terpilih
              </Button>
            )}
            {onSelectAllWeekends && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSelectAllWeekends}
                className="h-8 rounded-lg border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 text-xs font-medium dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
              >
                <Sparkles className="mr-1.5 size-3.5" />
                Pilih Semua Weekend (Sabtu-Minggu)
              </Button>
            )}
            {onSetOff && (
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={onSetOff}
                className="h-8 rounded-lg border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-medium dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              >
                Set OFF
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={onSetPresent}
              className="h-8 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            >
              Set Masuk
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={onSetSick}
              className="h-8 rounded-lg border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-medium dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            >
              Set Sakit
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={onSetLeave}
              className="h-8 rounded-lg border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 text-xs font-medium dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
            >
              Set Izin
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={onSetEmpty}
              className="h-8 rounded-lg border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-medium dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            >
              Set Clear (-)
            </Button>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground hidden sm:inline">
          {enabled ? "Klik sel untuk memilih beberapa data, lalu klik Edit Sel Terpilih" : "Aktifkan untuk edit massal"}
        </span>
        {enabled && (
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={onClear}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 size-3.5" /> Reset Pilihan
          </Button>
        )}
      </div>
    </div>
  );
}

