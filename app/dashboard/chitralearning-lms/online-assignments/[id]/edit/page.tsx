import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { db } from "@/db";
import { chitraLearningCampaigns, masterDepartments, masterSections, sites } from "@/db/schema/hero";
import { eq, asc } from "drizzle-orm";
import { OnlineAssignmentForm } from "../../new/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ListChecks } from "lucide-react";

export const metadata = {
  title: "Edit Online Assignment | ChitraLearning LMS",
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

export default async function EditOnlineAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user) redirect("/auth/signin");

  const { isLmsAdmin } = await import("@/lib/chitralearning-lms");
  if (!(await isLmsAdmin(session))) redirect("/dashboard/chitralearning-lms");

  const { id } = await params;
  const [campaign] = await db
    .select()
    .from(chitraLearningCampaigns)
    .where(eq(chitraLearningCampaigns.id, parseInt(id, 10)))
    .limit(1);

  if (!campaign || campaign.campaignType !== "online_assignment") {
    redirect("/dashboard/chitralearning-lms/online-assignments");
  }

  const masterData = await getMasterData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="text-slate-500">
              <Link href="/dashboard/chitralearning-lms/online-assignments"><ArrowLeft className="mr-1 h-4 w-4" />Kembali</Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold font-heading">Edit Assignment</h1>
          <p className="text-slate-500">Edit detail assignment online dan kelola soal quiz.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/chitralearning-lms/online-assignments/${campaign.id}/quiz-builder`}>
            <ListChecks className="mr-2 h-4 w-4" /> Kelola Soal
          </Link>
        </Button>
      </div>
      <OnlineAssignmentForm
        mode="edit"
        masterData={masterData}
        initial={{
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          targetType: campaign.targetType,
          targetValue: campaign.targetValue,
          dueAt: campaign.dueAt ? new Date(campaign.dueAt).toISOString() : null,
          passingScore: campaign.passingScore,
          maxRetakes: campaign.maxRetakes ?? -1,
          durationMinutes: campaign.durationMinutes ?? 0,
          periodStart: campaign.periodStart ? new Date(campaign.periodStart).toISOString() : null,
          periodEnd: campaign.periodEnd ? new Date(campaign.periodEnd).toISOString() : null,
          status: campaign.status,
        }}
      />
    </div>
  );
}
