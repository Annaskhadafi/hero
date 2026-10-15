import { AdminPageShell } from "@/components/admin-page-shell";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { db } from "@/db";
import { employees, masterDepartments, masterSections, sites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { fetchMaritalStatusRequests } from "@/lib/marital-status-data";
import { fetchApproverOptions } from "@/lib/apd-data";
import { MaritalStatusDashboardClient } from "./client-page";

export default async function MaritalStatusDashboardPage() {
  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) return notFound();

  const [employeeProfile] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      maritalStatus: employees.maritalStatus,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      siteId: employees.siteId,
      siteName: sites.name,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.id, currentEmployee.id))
    .limit(1);

  if (!employeeProfile) return notFound();

  const [requests, approverOptions, marriedEmployees, analytics, pickerEmployees] = await Promise.all([
    fetchMaritalStatusRequests(),
    fetchApproverOptions(),
    import("@/lib/marital-status-data").then((m) => m.fetchMarriedOnSiteEmployees()),
    import("@/lib/marital-status-data").then((m) => m.fetchMaritalStatusAnalytics()),
    import("@/lib/marital-status-data").then((m) => m.fetchEmployeesForMaritalPicker()),
  ]);

  return (
    <AdminPageShell
      eyebrow="Central Service / Management"
      title="Pergantian Status Pernikahan"
      description="Dashboard analisis, master direktori status Married On Site, dan permohonan pergantian status karyawan."
    >
      <MaritalStatusDashboardClient
        currentEmployeeId={currentEmployee.id}
        employeeProfile={{
          id: employeeProfile.id,
          name: employeeProfile.name,
          employeeSn: employeeProfile.employeeSn,
          jobTitle: employeeProfile.jobTitle || "-",
          maritalStatus: employeeProfile.maritalStatus || "Belum Diisi",
          departmentName: employeeProfile.departmentName || "Central Services",
          sectionName: employeeProfile.sectionName || "Service Operation",
          siteId: employeeProfile.siteId,
          siteName: employeeProfile.siteName || "-",
        }}
        initialRequests={requests}
        approverOptions={approverOptions}
        initialMarriedEmployees={marriedEmployees}
        initialAnalytics={analytics}
        pickerEmployees={pickerEmployees}
      />
    </AdminPageShell>
  );
}
