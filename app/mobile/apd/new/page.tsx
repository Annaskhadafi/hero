import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { employees, masterDepartments, masterSections } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { ApdRequestForm } from "@/app/dashboard/apd/new/apd-form";
import { fetchApdItemOptions, fetchApdRequestById } from "@/lib/apd-data";

export default async function MobileNewApdPage(props: {
  searchParams: Promise<{ category?: string; edit?: string; id?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

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
            <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">
              {isRevision ? "Revisi Permohonan" : "Form Pengajuan"}
            </p>
            <h1 className="mt-0.5 text-lg font-bold tracking-tight">
              {isRevision ? `Revisi Request: ${existingRequest?.requestNumber}` : "Ajukan Request Barang"}
            </h1>
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
          itemOptions={{ TOOLS: toolsOptions, MATERIAL: materialOptions }}
          defaultMode={defaultMode}
          requestId={existingRequest?.id}
          initialNotes={existingRequest?.notes || ""}
          initialItems={initialItems}
          mobileWide
        />
      </section>
    </div>
  );
}
