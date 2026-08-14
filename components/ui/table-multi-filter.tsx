"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TableMultiFilterOption = {
  value: string;
  label: string;
};

export function TableMultiFilter({
  label,
  filterKey,
  options,
  widthClassName = "w-[220px]",
}: {
  label: string;
  filterKey: string;
  options: TableMultiFilterOption[];
  widthClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const selectedLabel =
    selected.length === 0
      ? `Semua ${label}`
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label ?? `1 ${label}`
        : `${selected.length} ${label}`;

  useEffect(() => {
    inputRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    inputRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [selected]);

  useEffect(() => {
    const handleReset = () => setSelected([]);
    const handlePreset = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string; value?: string }>;
      if (customEvent.detail?.key !== filterKey) {
        return;
      }

      const nextValue = customEvent.detail.value?.trim() ?? "";
      setSelected(nextValue ? nextValue.split("|").filter(Boolean) : []);
    };

    window.addEventListener("hero-table-reset-filters", handleReset);
    window.addEventListener("hero-table-apply-filter", handlePreset as EventListener);

    return () => {
      window.removeEventListener("hero-table-reset-filters", handleReset);
      window.removeEventListener("hero-table-apply-filter", handlePreset as EventListener);
    };
  }, [filterKey]);

  return (
    <div className="flex-none">
      <input ref={inputRef} type="hidden" data-table-filter-key={filterKey} value={selected.join("|")} readOnly />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-9 justify-between rounded-lg border border-border/70 bg-white px-3 text-[13px] font-medium text-foreground shadow-none hover:bg-muted/40",
              widthClassName,
            )}
          >
            <span className="truncate text-left">{selectedLabel}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] rounded-xl border border-border/80 bg-white p-2 shadow-lg">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Cari ${label.toLowerCase()}...`}
              className="h-9 rounded-lg border-border/70 bg-muted/30 pl-9 shadow-none"
            />
          </div>

          <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border/60 bg-white p-1">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted/50"
              onClick={() => setSelected([])}
            >
              <span>Semua {label}</span>
              {selected.length > 0 ? <X className="size-4 text-muted-foreground" /> : null}
            </button>

            {filteredOptions.map((option, index) => {
              const isSelected = selected.includes(option.value);

              return (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted/50"
                  onClick={() =>
                    setSelected((current) =>
                      current.includes(option.value)
                        ? current.filter((value) => value !== option.value)
                        : [...current, option.value],
                    )
                  }
                >
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded border border-border/80 bg-white",
                      isSelected && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {isSelected ? <Check className="size-3" /> : null}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
