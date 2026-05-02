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
  return (
    <div className="flex min-w-max items-center gap-2">
      <TableMultiFilter
        label="Department"
        filterKey="department"
        options={departments.map((department) => ({
          value: department.name,
          label: department.name,
        }))}
      />
      <TableMultiFilter
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
