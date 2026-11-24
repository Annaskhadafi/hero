import { notFound } from "next/navigation";
import { getPublicEmployeeEcard } from '@/lib/public-employee-ecard';
import { EmployeeEcard } from "@/components/mobile/employee-ecard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PublicBusinessCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const employee = await getPublicEmployeeEcard(token);
  if (!employee) notFound();

  const publicBaseUrl = "https://hero.chitraparatama.com";
  const cardUrl = `${publicBaseUrl}/business-card/${employee.publicIdentifier}`;
  const contactUrl = `/business-card/${employee.publicIdentifier}/contact.vcf`;
  const title = employee.jobTitle || employee.role;

  return <main className="min-h-svh bg-[#e9e5dc] p-2 sm:px-5 sm:py-10">
    <EmployeeEcard name={employee.name} title={title} email={employee.email} phone={employee.phoneNumber} cardUrl={cardUrl} contactUrl={contactUrl} />
  </main>;
}
