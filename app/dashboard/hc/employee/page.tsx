import { getEmployeesForContract, getEmployeeFilterOptions } from "@/app/actions/employee";
import { EmployeeClientPage } from "./client-page";
import type { TableRbacAccess } from "@/components/ui/enterprise-table-kit";

export const metadata = {
  title: "Data Karyawan - HC",
};

export default async function EmployeePage() {
  const [employees, filterOptions] = await Promise.all([
    getEmployeesForContract(),
    getEmployeeFilterOptions(),
  ]);

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
      filterOptions={filterOptions}
      access={access}
    />
  );
}
