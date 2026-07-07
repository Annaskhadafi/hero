import { getEmployeesForContract, getEmployeeFilterOptions } from "@/app/actions/employee";
import { EmployeeClientPage } from "./client-page";
import type { TableRbacAccess } from "@/components/ui/enterprise-table-kit";

export const metadata = {
  title: "Data Karyawan - HC",
};

export default async function EmployeePage() {
  const [allEmployees, filterOptions] = await Promise.all([
    getEmployeesForContract(),
    getEmployeeFilterOptions(),
  ]);

  const employees = allEmployees.filter(e => e.departmentName === "Central Services");
  const csDeptId = filterOptions.departments.find(d => d.name === "Central Services")?.id;
  
  const filteredOptions = {
    departments: csDeptId ? filterOptions.departments.filter(d => d.id === csDeptId) : filterOptions.departments,
    sections: csDeptId ? filterOptions.sections.filter(s => s.departmentId === csDeptId) : filterOptions.sections,
    locations: filterOptions.locations,
    positions: filterOptions.positions,
  };

  // TODO: Replace with real RBAC lookup once Phase 4 is complete
  const access: TableRbacAccess = {
    canView: true,
    canEdit: true,
    canDelete: true,
    canSelectAll: false,
  };

  return (
    <EmployeeClientPage
      employees={employees}
      filterOptions={filteredOptions}
      access={access}
    />
  );
}
