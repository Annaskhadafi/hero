import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { EmployeeEcard } from "@/components/mobile/employee-ecard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PublicBusinessCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{64}$/.test(token)) notFound();

  const [employee] = await db.select({
    name: employees.name,
    jobTitle: employees.jobTitle,
    role: employees.role,
    email: employees.email,
    phoneNumber: employees.phoneNumber,
    publicToken: employees.businessCardPublicToken,
    sharingEnabled: employees.businessCardPublicEnabled,
    isActive: employees.isActive,
  }).from(employees).where(eq(employees.businessCardPublicToken, token)).limit(1);

  if (!employee || !employee.publicToken || !employee.sharingEnabled || !employee.isActive) notFound();

  const publicBaseUrl = "https://hero.chitraparatama.com";
  const cardUrl = `${publicBaseUrl}/business-card/${token}`;
  const contactUrl = `/business-card/${token}/contact.vcf`;
  const title = employee.jobTitle || employee.role;

  return <main className="min-h-svh bg-[#e9e5dc] p-2 sm:px-5 sm:py-10">
    <EmployeeEcard name={employee.name} title={title} email={employee.email} phone={employee.phoneNumber} cardUrl={cardUrl} contactUrl={contactUrl} />
  </main>;
}
