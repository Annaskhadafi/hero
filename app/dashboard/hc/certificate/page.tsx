import { getCertificates } from "@/app/actions/certificate";
import { db } from "@/db";
import { hrEmployees } from "@/db/schema/hero";
import { eq, asc } from "drizzle-orm";
import { CertificateClientPage } from "./client-page";

export const metadata = {
  title: "Sertifikat SIO & POP - HC",
};

export default async function CertificatePage() {
  const [certificates, employeesData] = await Promise.all([
    getCertificates(),
    db
      .select({
        id: hrEmployees.id,
        name: hrEmployees.fullName,
      })
      .from(hrEmployees)
      .where(eq(hrEmployees.isActive, true))
      .orderBy(asc(hrEmployees.fullName))
  ]);
  
  return <CertificateClientPage certificates={certificates} employees={employeesData} />;
}
