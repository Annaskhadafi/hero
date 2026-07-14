"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

export function SearchableSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  widthClassName = "min-w-[220px]",
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  widthClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? placeholder ?? `Semua ${label}`;

  return (
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
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-[280px] rounded-xl border border-border/80 bg-white p-2 shadow-lg">
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
            onClick={() => {
              onValueChange("");
              setOpen(false);
            }}
          >
            <span>{placeholder ?? `Semua ${label}`}</span>
            {value ? <X className="size-4 text-muted-foreground" /> : null}
          </button>

          {filteredOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted/50"
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
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
  );
}
