"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

type MultiOption = {
  value: string;
  label: string;
};

function SearchableMultiFilter({
  label,
  filterKey,
  options,
}: {
  label: string;
  filterKey: string;
  options: MultiOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
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

  return (
    <div className="flex-none">
      <input ref={inputRef} type="hidden" data-table-filter-key={filterKey} value={selected.join("|")} readOnly />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="dense"
            className="w-[220px] justify-between bg-surface-container-lowest"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[260px] p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Cari ${label.toLowerCase()}...`}
              className="h-9 pl-8"
            />
          </div>
          <div className="mt-2 max-h-64 overflow-auto">
            <button
              type="button"
              className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm hover:bg-surface-container-low"
              onClick={() => setSelected([])}
            >
              Semua {label}
            </button>
            {filteredOptions.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-container-low"
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
                      "grid size-4 place-items-center rounded border border-outline-ghost",
                      isSelected && "bg-primary text-primary-foreground",
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

export function ActivityLibraryFilters({
  departments,
  sections,
}: {
  departments: DepartmentOption[];
  sections: SectionOption[];
}) {
  return (
    <div className="flex min-w-max items-center gap-2">
      <SearchableMultiFilter
        label="Department"
        filterKey="department"
        options={departments.map((department) => ({
          value: department.name,
          label: department.name,
        }))}
      />
      <SearchableMultiFilter
        label="Section"
        filterKey="section"
        options={sections.map((section) => ({
          value: section.name,
          label: section.name,
        }))}
      />
    </div>
  );
}
