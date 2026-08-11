"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type EmployeeOption = {
  id: number;
  name: string;
  email: string;
};

export function EmployeeMultiSelect({
  label,
  selectedEmails,
  onChange,
  employees,
  placeholder,
}: {
  label: string;
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  employees: EmployeeOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedSelectedEmails = useMemo(
    () => Array.from(new Set(selectedEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))),
    [selectedEmails],
  );

  const uniqueEmployees = useMemo(() => {
    const seen = new Set<string>();
    return employees.filter((emp) => {
      const email = emp.email.trim().toLowerCase();
      if (!email || seen.has(email)) return false;
      seen.add(email);
      return true;
    });
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return uniqueEmployees;
    }
    return uniqueEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(normalized) ||
        emp.email.toLowerCase().includes(normalized),
    );
  }, [uniqueEmployees, query]);
  const toggleEmployee = (email: string) => {
    onChange(
      normalizedSelectedEmails.includes(email.trim().toLowerCase())
        ? normalizedSelectedEmails.filter((e) => e !== email.trim().toLowerCase())
        : [...normalizedSelectedEmails, email.trim().toLowerCase()],
    );
  };

  const removeEmployee = (email: string) => {
    onChange(normalizedSelectedEmails.filter((e) => e !== email.trim().toLowerCase()));
  };

  const selectedCount = normalizedSelectedEmails.length;
  const triggerLabel =
    selectedCount === 0
      ? placeholder ?? `Pilih ${label}`
      : selectedCount === 1
        ? uniqueEmployees.find((e) => e.email.trim().toLowerCase() === normalizedSelectedEmails[0])?.name ?? "1 dipilih"
        : `${selectedCount} ${label} dipilih`;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="flex h-auto min-h-9 w-full justify-between rounded-lg border border-border/70 bg-white px-3 py-2 text-[13px] font-medium text-foreground shadow-none hover:bg-muted/40"
          >
            <span className="truncate text-left">{triggerLabel}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[380px] rounded-xl border border-border/80 bg-white p-2 shadow-lg"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Cari ${label.toLowerCase()}...`}
              className="h-9 rounded-lg border-border/70 bg-muted/30 pl-9 shadow-none"
            />
          </div>

          <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border/60 bg-white p-1">
            {filteredEmployees.map((emp) => {
              const isSelected = normalizedSelectedEmails.includes(emp.email.trim().toLowerCase());
              return (
                <button
                  key={emp.email}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted/50"
                  onClick={() => toggleEmployee(emp.email)}
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/80 bg-white",
                    )}
                  >
                    {isSelected ? <Check className="size-3" /> : null}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate font-medium">{emp.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {emp.email}
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredEmployees.length === 0 ? (
              <p className="px-2.5 py-4 text-center text-sm text-muted-foreground">
                Tidak ada karyawan ditemukan.
              </p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {normalizedSelectedEmails.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {normalizedSelectedEmails.map((email) => {
            const emp = uniqueEmployees.find((e) => e.email.trim().toLowerCase() === email);
            return (
              <Badge
                key={email}
                variant="secondary"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
              >
                {emp?.name ?? email}
                <button
                  type="button"
                  onClick={() => removeEmployee(email)}
                  className="ml-0.5 inline-flex items-center rounded-sm p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
