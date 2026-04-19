"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

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

export function ActivityLibraryFilters({
  departments,
  sections,
}: {
  departments: DepartmentOption[];
  sections: SectionOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedDepartment = searchParams.get("department") ?? "";
  const selectedSection = searchParams.get("section") ?? "";
  const visibleSections = selectedDepartment
    ? sections.filter((section) => `${section.departmentId ?? ""}` === selectedDepartment)
    : sections;

  function updateFilter(key: "department" | "section", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    if (key === "department") {
      params.delete("section");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function resetFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("department");
    params.delete("section");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={selectedDepartment}
        onChange={(event) => updateFilter("department", event.target.value)}
        className="h-9 min-w-[180px] rounded-lg border-0 bg-white px-3 text-[13px] font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
        aria-label="Filter department"
      >
        <option value="">Semua Department</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>

      <select
        value={selectedSection}
        onChange={(event) => updateFilter("section", event.target.value)}
        className="h-9 min-w-[180px] rounded-lg border-0 bg-white px-3 text-[13px] font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
        aria-label="Filter section"
      >
        <option value="">Semua Section</option>
        {visibleSections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.name}
          </option>
        ))}
      </select>

      {selectedDepartment || selectedSection ? (
        <Button
          type="button"
          variant="ghost"
          onClick={resetFilters}
          className="h-9 rounded-lg px-3 text-[13px] font-medium normal-case tracking-normal text-muted-foreground"
        >
          <RotateCcw className="size-4" />
          Reset Scope
        </Button>
      ) : null}
    </div>
  );
}

