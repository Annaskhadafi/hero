import { getCertificates, getCertificateStats, getCertificateTypes } from "@/app/actions/certificate";
import { db } from "@/db";
import { hrDepartments, hrEmployees } from "@/db/schema/hero";
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
      id: hrEmployees.id,
      name: hrEmployees.fullName,
      employeeCode: hrEmployees.employeeId,
      departmentName: hrDepartments.name,
    })
    .from(hrEmployees)
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .where(eq(hrEmployees.isActive, true))
    .orderBy(asc(hrEmployees.fullName));
}
