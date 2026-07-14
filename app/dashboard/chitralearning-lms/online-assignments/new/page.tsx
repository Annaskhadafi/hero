import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { db } from "@/db";
import { masterDepartments, masterSections, sites } from "@/db/schema/hero";
import { eq, asc } from "drizzle-orm";
import { OnlineAssignmentForm } from "./form";

export const metadata = {
  title: "Buat Online Assignment | ChitraLearning LMS",
};

async function getMasterData() {
  const [departments, sections, siteList] = await Promise.all([
    db
      .select({ id: masterDepartments.id, name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true))
      .orderBy(asc(masterDepartments.name)),
    db
      .select({ id: masterSections.id, name: masterSections.name })
      .from(masterSections)
      .where(eq(masterSections.isActive, true))
      .orderBy(asc(masterSections.name)),
    db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name)),
  ]);
  return { departments, sections, sites: siteList };
}

export default async function NewOnlineAssignmentPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/auth/signin");

  const { isLmsAdmin } = await import("@/lib/chitralearning-lms");
  if (!(await isLmsAdmin(session))) redirect("/dashboard/chitralearning-lms");

  const masterData = await getMasterData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Buat Online Assignment</h1>
        <p className="text-slate-500">Buat assignment online atau quiz dadakan untuk karyawan.</p>
      </div>
      <OnlineAssignmentForm mode="create" masterData={masterData} />
    </div>
  );
}
