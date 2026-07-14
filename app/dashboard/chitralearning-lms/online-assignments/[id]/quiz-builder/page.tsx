import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { db } from "@/db";
import { chitraLearningCampaigns, chitraLearningOnlineAssignmentQuestions } from "@/db/schema/hero";
import { eq, asc } from "drizzle-orm";
import { OnlineAssignmentQuizBuilder } from "./client-page";

export const metadata = {
  title: "Quiz Builder | Online Assignment",
};

export default async function OnlineAssignmentQuizBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user) redirect("/auth/signin");

  const { isLmsAdmin } = await import("@/lib/chitralearning-lms");
  if (!(await isLmsAdmin(session))) redirect("/dashboard/chitralearning-lms");

  const { id } = await params;
  const campaignId = parseInt(id, 10);

  const [campaign] = await db
    .select()
    .from(chitraLearningCampaigns)
    .where(eq(chitraLearningCampaigns.id, campaignId))
    .limit(1);

  if (!campaign || campaign.campaignType !== "online_assignment") {
    redirect("/dashboard/chitralearning-lms/online-assignments");
  }

  const questions = await db
    .select()
    .from(chitraLearningOnlineAssignmentQuestions)
    .where(eq(chitraLearningOnlineAssignmentQuestions.campaignId, campaignId))
    .orderBy(asc(chitraLearningOnlineAssignmentQuestions.sortOrder), asc(chitraLearningOnlineAssignmentQuestions.id));

  return (
    <div className="space-y-6">
      <OnlineAssignmentQuizBuilder campaignId={campaignId} initialQuestions={questions} />
    </div>
  );
}
