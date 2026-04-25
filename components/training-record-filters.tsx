"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

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
      <select
        value={selectedEmployeeId}
        onChange={(event) => updateFilter("employeeId", event.target.value)}
        className="h-9 min-w-[220px] rounded-lg border-0 bg-white px-3 text-[13px] font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
        aria-label="Filter karyawan"
      >
        <option value="">Semua karyawan</option>
        {visibleEmployees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name} {employee.employeeSn ? `(${employee.employeeSn})` : ""}
          </option>
        ))}
      </select>

      <select
        value={selectedDepartment}
        onChange={(event) => updateFilter("department", event.target.value)}
        className="h-9 min-w-[180px] rounded-lg border-0 bg-white px-3 text-[13px] font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
        aria-label="Filter department"
      >
        <option value="">Semua department</option>
        {departments.map((department) => (
          <option key={department} value={department}>
            {department}
          </option>
        ))}
      </select>

      <select
        value={selectedYear}
        onChange={(event) => updateFilter("year", event.target.value)}
        className="h-9 min-w-[140px] rounded-lg border-0 bg-white px-3 text-[13px] font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
        aria-label="Filter tahun training"
      >
        <option value="">Semua tahun</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

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

