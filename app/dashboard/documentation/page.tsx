import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployeeAccessRole } from "@/lib/hero-access";
import { DocumentationPortal } from "@/components/documentation/documentation-portal";

export const metadata = {
  title: "Dokumentasi & Blueprint Sistem | HERO Enterprise",
  description:
    "Portal dokumentasi resmi, cetak biru arsitektur, panduan keamanan RBAC, ERD database, dan panduan serah terima (handover) sistem HERO.",
};

export default async function DocumentationPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in?callbackUrl=/dashboard/documentation");
  }

  const userRole = await getCurrentEmployeeAccessRole().catch(() => null);

  return (
    <div className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
      <DocumentationPortal
        currentUser={{
          name: session.user.name,
          email: session.user.email,
          role: userRole,
        }}
      />
    </div>
  );
}
