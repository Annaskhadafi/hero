import { getEmployeeFullProfile } from "@/app/actions/employee-profile";
import { EmployeeProfileClientPage } from "./client-page";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Profil & Produktivitas Karyawan - HC",
};

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const hrEmployeeId = parseInt(resolvedParams.id, 10);

  if (isNaN(hrEmployeeId)) {
    notFound();
  }

  const data = await getEmployeeFullProfile(hrEmployeeId);

  if (!data) {
    notFound();
  }

  return (
    <EmployeeProfileClientPage
      profile={data as any}
      hrEmployeeId={hrEmployeeId}
    />
  );
}
