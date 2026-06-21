import { getCertificates, getCertificateStats, getCertificateTypes } from "@/app/actions/certificate";
import { db } from "@/db";
import { employees, hrDepartments } from "@/db/schema/hero";
import { asc, eq } from "drizzle-orm";
import { CertificateClientPage } from "./client-page";

export const metadata = {
  title: "Sertifikat HC - HERO HC",
};

export default async function CertificatePage() {
  const [certificates, stats, certificateTypes, employees] = await Promise.all([
    getCertificates(),
    getCertificateStats(),
    getCertificateTypes(),
    getEmployeeOptions(),
  ]);

  return (
    <CertificateClientPage
      certificates={certificates}
      stats={stats}
      certificateTypes={certificateTypes}
      employees={employees}
    />
  );
}

async function getEmployeeOptions() {
  return db
    .select({
      id: employees.id,
      name: employees.name,
      employeeCode: employees.employeeSn,
      departmentName: hrDepartments.name,
    })
    .from(employees)
    .leftJoin(hrDepartments, eq(employees.departmentId, hrDepartments.id))
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.name));
}
