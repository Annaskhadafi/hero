import { getEmployeesForContract } from "@/app/actions/employee";
import { EmployeeClientPage } from "./client-page";

export const metadata = {
  title: "Data Karyawan - HC",
};

export default async function EmployeePage() {
  const employees = await getEmployeesForContract();
  
  return <EmployeeClientPage employees={employees} />;
}
