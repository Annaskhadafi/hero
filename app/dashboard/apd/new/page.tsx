import { AdminPageShell } from "@/components/admin-page-shell";
import { ApdRequestForm } from "./apd-form";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { db } from "@/db";
import { employees, masterDepartments, masterSections } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { fetchApdItemOptions } from "@/lib/apd-data";

export default async function NewApdRequestPage() {
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

  const [toolsOptions, materialOptions] = await Promise.all([
    fetchApdItemOptions("TOOLS"),
    fetchApdItemOptions("MATERIAL"),
  ]);

  return (
    <AdminPageShell
      eyebrow="Form Permintaan"
      title="Ajukan Request Barang"
      description="Pilih tab Request APD, Request Tools, atau Request Material. Barang baru otomatis disimpan sebagai pilihan berikutnya."
    >
      <div className="mx-auto max-w-4xl pt-6">
        <ApdRequestForm 
          employeeName={employeeProfile.name}
          employeeSn={employeeProfile.employeeSn}
          departmentName={employeeProfile.departmentName}
          sectionName={employeeProfile.sectionName}
          itemOptions={{ TOOLS: toolsOptions, MATERIAL: materialOptions }}
        />
      </div>
    </AdminPageShell>
  );
}
