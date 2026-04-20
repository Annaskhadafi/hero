"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";

type DepartmentOption = {
  id: number;
  name: string;
};

type SectionOption = {
  id: number;
  name: string;
  departmentId: number | null;
};

export function ActivityRouteDepartmentSectionFields({
  departments,
  sections,
  defaultDepartmentId,
  defaultSectionId,
  selectClassName,
  departmentPlaceholder = "Semua department",
  sectionPlaceholder = "Semua section",
  filteredSectionPlaceholder = "Pilih section",
}: {
  departments: DepartmentOption[];
  sections: SectionOption[];
  defaultDepartmentId?: number | null;
  defaultSectionId?: number | null;
  selectClassName: string;
  departmentPlaceholder?: string;
  sectionPlaceholder?: string;
  filteredSectionPlaceholder?: string;
}) {
  const [departmentId, setDepartmentId] = React.useState(defaultDepartmentId ? String(defaultDepartmentId) : "");
  const [sectionId, setSectionId] = React.useState(defaultSectionId ? String(defaultSectionId) : "");

  const filteredSections = React.useMemo(() => {
    if (!departmentId) {
      return sections;
    }

    return sections.filter((section) => String(section.departmentId ?? "") === departmentId);
  }, [departmentId, sections]);

  React.useEffect(() => {
    if (!sectionId) {
      return;
    }

    const sectionStillValid = filteredSections.some((section) => String(section.id) === sectionId);
    if (!sectionStillValid) {
      setSectionId("");
    }
  }, [filteredSections, sectionId]);

  return (
    <>
      <Label className="grid gap-2 text-sm font-semibold text-foreground">
        <span>Department</span>
        <select
          name="departmentId"
          className={selectClassName}
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value="">{departmentPlaceholder}</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </Label>

      <Label className="grid gap-2 text-sm font-semibold text-foreground">
        <span>Section</span>
        <select
          name="sectionId"
          className={selectClassName}
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
        >
          <option value="">{departmentId ? filteredSectionPlaceholder : sectionPlaceholder}</option>
          {filteredSections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </Label>
    </>
  );
}
