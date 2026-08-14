"use client";

import { useState, useMemo, useEffect } from "react";
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

export function ActivityDepartmentSectionMultiSelect({
  departments,
  sections,
  defaultDepartmentIds = [],
  defaultSectionIds = [],
  defaultDepartmentId,
  defaultSectionId,
  departmentLabel = "Department",
  sectionLabel = "Section",
}: {
  departments: DepartmentOption[];
  sections: SectionOption[];
  defaultDepartmentIds?: number[];
  defaultSectionIds?: number[];
  defaultDepartmentId?: number | null;
  defaultSectionId?: number | null;
  departmentLabel?: string;
  sectionLabel?: string;
}) {
  const initialDeptIds = useMemo(() => {
    if (defaultDepartmentIds && defaultDepartmentIds.length > 0) return defaultDepartmentIds;
    if (defaultDepartmentId != null) return [defaultDepartmentId];
    return [];
  }, [defaultDepartmentIds, defaultDepartmentId]);

  const initialSecIds = useMemo(() => {
    if (defaultSectionIds && defaultSectionIds.length > 0) return defaultSectionIds;
    if (defaultSectionId != null) return [defaultSectionId];
    return [];
  }, [defaultSectionIds, defaultSectionId]);

  const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>(initialDeptIds);
  const [selectedSecIds, setSelectedSecIds] = useState<number[]>(initialSecIds);

  const isGlobalDept = selectedDeptIds.length === 0;
  const isGlobalSec = selectedSecIds.length === 0;

  function toggleDepartment(id: number) {
    setSelectedDeptIds((current) =>
      current.includes(id) ? current.filter((deptId) => deptId !== id) : [...current, id]
    );
  }

  function toggleSection(id: number) {
    setSelectedSecIds((current) =>
      current.includes(id) ? current.filter((secId) => secId !== id) : [...current, id]
    );
  }

  const filteredSections = useMemo(() => {
    if (selectedDeptIds.length === 0) {
      return sections;
    }
    return sections.filter(
      (sec) => sec.departmentId == null || selectedDeptIds.includes(sec.departmentId)
    );
  }, [selectedDeptIds, sections]);

  // Clean up selected sections if their parent department is no longer selected
  useEffect(() => {
    if (selectedSecIds.length === 0 || selectedDeptIds.length === 0) return;
    const validSecIds = selectedSecIds.filter((secId) =>
      filteredSections.some((sec) => sec.id === secId)
    );
    if (validSecIds.length !== selectedSecIds.length) {
      setSelectedSecIds(validSecIds);
    }
  }, [filteredSections, selectedSecIds, selectedDeptIds]);

  const selectedDeptNames = departments
    .filter((dept) => selectedDeptIds.includes(dept.id))
    .map((dept) => dept.name)
    .join(", ");

  const selectedSecNames = sections
    .filter((sec) => selectedSecIds.includes(sec.id))
    .map((sec) => sec.name)
    .join(", ");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Department Multi-Select */}
      <Label className="grid gap-2 text-sm font-semibold">
        {departmentLabel}
        <input type="hidden" name="departmentIds" value={selectedDeptIds.join(",")} />
        <input type="hidden" name="departmentId" value={selectedDeptIds[0] ? String(selectedDeptIds[0]) : ""} />
        <div className="max-h-52 overflow-y-auto rounded-lg border border-border/70 bg-background p-2">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-low">
            <input
              type="checkbox"
              checked={isGlobalDept}
              onChange={() => setSelectedDeptIds([])}
              className="size-4 rounded border-border accent-primary"
            />
            <span className="font-medium">Global - semua department</span>
          </label>
          {departments.map((dept) => (
            <label
              key={dept.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-low"
            >
              <input
                type="checkbox"
                checked={selectedDeptIds.includes(dept.id)}
                onChange={() => toggleDepartment(dept.id)}
                className="size-4 rounded border-border accent-primary"
              />
              <span>{dept.name}</span>
            </label>
          ))}
        </div>
        <p className="text-xs font-normal text-muted-foreground">
          {isGlobalDept
            ? "Aktivitas berlaku untuk semua department."
            : `${selectedDeptIds.length} department dipilih: ${selectedDeptNames}`}
        </p>
      </Label>

      {/* Section Multi-Select */}
      <Label className="grid gap-2 text-sm font-semibold">
        {sectionLabel}
        <input type="hidden" name="sectionIds" value={selectedSecIds.join(",")} />
        <input type="hidden" name="sectionId" value={selectedSecIds[0] ? String(selectedSecIds[0]) : ""} />
        <div className="max-h-52 overflow-y-auto rounded-lg border border-border/70 bg-background p-2">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-low">
            <input
              type="checkbox"
              checked={isGlobalSec}
              onChange={() => setSelectedSecIds([])}
              className="size-4 rounded border-border accent-primary"
            />
            <span className="font-medium">Global - semua section</span>
          </label>
          {filteredSections.map((sec) => (
            <label
              key={sec.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-low"
            >
              <input
                type="checkbox"
                checked={selectedSecIds.includes(sec.id)}
                onChange={() => toggleSection(sec.id)}
                className="size-4 rounded border-border accent-primary"
              />
              <span>{sec.name}</span>
            </label>
          ))}
        </div>
        <p className="text-xs font-normal text-muted-foreground">
          {isGlobalSec
            ? "Aktivitas berlaku untuk semua section."
            : `${selectedSecIds.length} section dipilih: ${selectedSecNames}`}
        </p>
      </Label>
    </div>
  );
}
