"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
};

export function MultiSelectSearch({
  label,
  values = [],
  onValuesChange,
  options,
  placeholder,
  className,
}: {
  label: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  className?: string;
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

  const toggleOption = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onValuesChange(values.filter((v) => v !== optionValue));
    } else {
      onValuesChange([...values, optionValue]);
    }
  };

  const removeOption = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== optionValue));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValuesChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          tabIndex={0}
          className={cn(
            "flex h-auto min-h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 cursor-pointer",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 w-[calc(100%-24px)]">
            {values.length === 0 && (
              <span className="text-slate-500 font-normal py-0.5">{placeholder ?? `Pilih ${label}...`}</span>
            )}
            {values.map((val) => {
              const opt = options.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                >
                  {opt?.label ?? val}
                  <button
                    type="button"
                    onClick={(e) => removeOption(e, val)}
                    className="rounded-full hover:bg-blue-200 p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-1">
            {values.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 text-slate-400 opacity-50" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Cari ${label.toLowerCase()}...`}
            className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-9 shadow-none text-sm"
          />
        </div>

        <div className="max-h-60 overflow-auto rounded-lg border border-slate-100 bg-white p-1">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">Tidak ada {label.toLowerCase()} ditemukan.</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    isSelected ? "bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-slate-50"
                  )}
                  onClick={() => toggleOption(option.value)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
