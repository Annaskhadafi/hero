import { AdminPageShell } from "@/components/admin-page-shell";
import { ApdRequestForm } from "./apd-form";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { db } from "@/db";
import { employees, masterDepartments, masterSections } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { fetchApdItemOptions, fetchApdRequestById } from "@/lib/apd-data";

export default async function NewApdRequestPage(props: {
  searchParams: Promise<{ category?: string; edit?: string; id?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) return notFound();
  
  const editIdStr = searchParams?.edit || searchParams?.id;
  const editId = editIdStr ? parseInt(editIdStr, 10) : undefined;
  let existingRequest: Awaited<ReturnType<typeof fetchApdRequestById>> = null;
  if (editId && !isNaN(editId)) {
    existingRequest = await fetchApdRequestById(editId);
  }

  const defaultMode = existingRequest?.requestCategory
    ? (existingRequest.requestCategory.toLowerCase() as "apd" | "tools" | "material")
    : (searchParams?.category === "tools" || searchParams?.category === "material" || searchParams?.category === "apd") 
      ? searchParams.category 
      : "apd";

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

  const initialItems = existingRequest?.items?.map((item) => ({
    itemType: item.itemType,
    requestType: item.requestType as "baru" | "pergantian",
    quantity: item.quantity,
    notes: item.notes || "",
    photoUrl: item.photoUrl || undefined,
  }));

  const isRevision = Boolean(existingRequest);

  return (
    <AdminPageShell
      eyebrow={isRevision ? "Revisi Permintaan" : "Form Permintaan"}
      title={isRevision ? `Revisi Request: ${existingRequest?.requestNumber}` : "Ajukan Request Barang"}
      description={
        isRevision
          ? "Perbaiki data permohonan yang dikembalikan. Setelah diajukan ulang, permohonan akan diproses langsung ke tahap berikutnya."
          : "Pilih tab Request APD, Request Tools, atau Request Material. Barang baru otomatis disimpan sebagai pilihan berikutnya."
      }
    >
      <div className="mx-auto max-w-4xl pt-6">
        <ApdRequestForm 
          employeeName={employeeProfile.name}
          employeeSn={employeeProfile.employeeSn}
          departmentName={employeeProfile.departmentName}
          sectionName={employeeProfile.sectionName}
          itemOptions={{ TOOLS: toolsOptions, MATERIAL: materialOptions }}
          defaultMode={defaultMode}
          requestId={existingRequest?.id}
          initialNotes={existingRequest?.notes || ""}
          initialItems={initialItems}
        />
      </div>
    </AdminPageShell>
  );
}
