import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { employees, masterDepartments, masterSections } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { ApdRequestForm } from "@/app/dashboard/apd/new/apd-form";

export default async function MobileNewApdPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) return notFound();

  const [employeeProfile] = await db
    .select({
      name: employees.name,
      employeeSn: employees.employeeSn,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(eq(employees.id, currentEmployee.id))
    .limit(1);

  if (!employeeProfile) return notFound();

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <section className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-5 text-white">
        <div className="flex items-center gap-3">
          <Link
            prefetch={false}
            href="/mobile/apd"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 active:scale-95 transition-transform"
            aria-label="Kembali"
          >
            <ArrowLeft className="size-5 text-blue-200" />
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">Form Pengajuan</p>
            <h1 className="mt-0.5 text-lg font-bold tracking-tight">Ajukan APD</h1>
          </div>
        </div>
      </section>

      {/* Form Container */}
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <ApdRequestForm 
          employeeName={employeeProfile.name}
          employeeSn={employeeProfile.employeeSn}
          departmentName={employeeProfile.departmentName}
          sectionName={employeeProfile.sectionName}
        />
      </section>
    </div>
  );
}
