"use client";

import { TableMultiFilter } from "@/components/ui/table-multi-filter";

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

export function ActivityLibraryFilters({
  departments,
  sections,
}: {
  departments: DepartmentOption[];
  sections: SectionOption[];
}) {
  const departmentOptions = Array.from(
    new Map(
      departments
        .filter((dept) => Boolean(dept.name))
        .map((dept) => [dept.name.trim(), { value: dept.name.trim(), label: dept.name.trim() }])
    ).values()
  );

  const sectionOptions = Array.from(
    new Map(
      sections
        .filter((sec) => Boolean(sec.name))
        .map((sec) => [sec.name.trim(), { value: sec.name.trim(), label: sec.name.trim() }])
    ).values()
  );

  return (
    <div className="flex min-w-max items-center gap-2">
      <TableMultiFilter
        label="Group"
        filterKey="group"
        options={[
          { value: "Group", label: "Aktivitas Group" },
          { value: "Non-Group", label: "Aktivitas Tunggal (Non-Group)" },
        ]}
      />
      <TableMultiFilter
        label="Department"
        filterKey="department"
        options={departmentOptions}
      />
      <TableMultiFilter
        label="Section"
        filterKey="section"
        options={sectionOptions}
      />
    </div>
  );
}
