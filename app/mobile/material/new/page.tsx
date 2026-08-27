import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { employees, masterDepartments, masterSections } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { ApdRequestForm } from "@/app/dashboard/apd/new/apd-form";
import { fetchApdItemOptions } from "@/lib/apd-data";

export default async function MobileNewMaterialPage() {
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

  const materialOptions = await fetchApdItemOptions("MATERIAL");

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <section className="rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 p-5 text-white">
        <div className="flex items-center gap-3">
          <Link
            prefetch={false}
            href="/mobile/material"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 active:scale-95 transition-transform"
            aria-label="Kembali"
          >
            <ArrowLeft className="size-5 text-amber-200" />
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-amber-200">Form Pengajuan</p>
            <h1 className="mt-0.5 text-lg font-bold tracking-tight">Ajukan Request Material</h1>
          </div>
        </div>
      </section>

      {/* Form Container */}
      <section className="-mx-4 w-[calc(100%+2rem)] rounded-xl border-0 bg-transparent p-0 shadow-none">
        <ApdRequestForm 
          employeeName={employeeProfile.name}
          employeeSn={employeeProfile.employeeSn}
          departmentName={employeeProfile.departmentName}
          sectionName={employeeProfile.sectionName}
          itemOptions={{ TOOLS: [], MATERIAL: materialOptions }}
          defaultMode="material"
          mobileWide
        />
      </section>
    </div>
  );
}
