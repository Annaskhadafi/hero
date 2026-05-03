"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";

type EmployeeOption = {
  id: number;
  name: string;
  employeeSn: string;
  department: string;
};

export function TrainingRecordFilters({
  employees,
  departments,
  years,
}: {
  employees: EmployeeOption[];
  departments: string[];
  years: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedEmployeeId = searchParams.get("employeeId") ?? "";
  const selectedDepartment = searchParams.get("department") ?? "";
  const selectedYear = searchParams.get("year") ?? "";

  function updateFilter(key: "employeeId" | "department" | "year", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function applyPreset(preset: "expiring" | "current-year") {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("employeeId");
    if (preset === "expiring") {
      params.set("year", "");
    } else {
      params.set("year", `${new Date().getFullYear()}`);
    }
    const query = params.toString().replace(/(^|&)year=(&|$)/, "$1").replace(/^&|&$/g, "").replace(/&&+/g, "&");
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function resetFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("employeeId");
    params.delete("department");
    params.delete("year");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const visibleEmployees = selectedDepartment
    ? employees.filter((employee) => employee.department === selectedDepartment)
    : employees;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchableSelect
        label="karyawan"
        value={selectedEmployeeId}
        onValueChange={(value) => updateFilter("employeeId", value)}
        placeholder="All employees"
        options={visibleEmployees.map((employee) => ({
          value: String(employee.id),
          label: `${employee.name}${employee.employeeSn ? ` (${employee.employeeSn})` : ""}`,
        }))}
        widthClassName="min-w-[260px]"
      />

      <SearchableSelect
        label="department"
        value={selectedDepartment}
        onValueChange={(value) => updateFilter("department", value)}
        placeholder="All departments"
        options={departments.map((department) => ({ value: department, label: department }))}
        widthClassName="min-w-[200px]"
      />

      <SearchableSelect
        label="tahun"
        value={selectedYear}
        onValueChange={(value) => updateFilter("year", value)}
        placeholder="All years"
        options={years.map((year) => ({ value: String(year), label: String(year) }))}
        widthClassName="min-w-[150px]"
      />

      <Button type="button" variant="outline" onClick={() => applyPreset("current-year")} className="h-9 rounded-lg border-0 bg-white px-3 text-[13px] font-medium normal-case tracking-normal shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]">Tahun berjalan</Button>
      <Button type="button" variant="outline" onClick={() => updateFilter("department", "Operations")} className="h-9 rounded-lg border-0 bg-white px-3 text-[13px] font-medium normal-case tracking-normal shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]">Fokus operasi</Button>
      {selectedEmployeeId || selectedDepartment || selectedYear ? (
        <Button
          type="button"
          variant="ghost"
          onClick={resetFilters}
          className="h-9 rounded-lg px-3 text-[13px] font-medium normal-case tracking-normal text-muted-foreground"
        >
          <RotateCcw className="size-4" />
          Reset scope
        </Button>
      ) : null}
    </div>
  );
}

