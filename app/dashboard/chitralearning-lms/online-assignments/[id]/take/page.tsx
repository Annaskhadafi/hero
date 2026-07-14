import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { db } from "@/db";
import { chitraLearningCampaigns, chitraLearningOnlineAssignmentQuestions, chitraLearningAuditLogs, employees } from "@/db/schema/hero";
import { eq, and, asc, sql } from "drizzle-orm";
import { type QuizQuestion } from "@/components/lms/lms-quiz-player";
import { resolveUploadUrl } from "@/lib/s3-storage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { OnlineAssignmentPlayer } from "./player";

export const metadata = {
  title: "Kerjakan Assignment | ChitraLearning LMS",
};

export default async function TakeOnlineAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user) redirect("/auth/signin");

  const { id } = await params;
  const campaignId = parseInt(id, 10);

  const [campaign] = await db
    .select()
    .from(chitraLearningCampaigns)
    .where(eq(chitraLearningCampaigns.id, campaignId))
    .limit(1);

  if (!campaign || campaign.status !== "published" || campaign.campaignType !== "online_assignment") {
    redirect("/dashboard/chitralearning-lms");
  }

  const currentEmployeeRows = await db
    .select()
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1);

  const currentEmployee = currentEmployeeRows[0];
  if (!currentEmployee) redirect("/dashboard/chitralearning-lms");

  const questions = await db
    .select()
    .from(chitraLearningOnlineAssignmentQuestions)
    .where(eq(chitraLearningOnlineAssignmentQuestions.campaignId, campaignId))
    .orderBy(asc(chitraLearningOnlineAssignmentQuestions.sortOrder), asc(chitraLearningOnlineAssignmentQuestions.id));

  const quizQuestions: QuizQuestion[] = questions.map((q) => ({
    id: q.id,
    questionType: q.questionType || "single_choice",
    question: q.questionText,
    questionImageUrl: resolveUploadUrl(q.questionImageUrl),
    questionMetadata: q.questionMetadata,
    options: [
      { id: "A", text: q.optionA, imageUrl: resolveUploadUrl(q.optionAImageUrl) },
      { id: "B", text: q.optionB, imageUrl: resolveUploadUrl(q.optionBImageUrl) },
      { id: "C", text: q.optionC, imageUrl: resolveUploadUrl(q.optionCImageUrl) },
      { id: "D", text: q.optionD, imageUrl: resolveUploadUrl(q.optionDImageUrl) },
    ].filter((o) => o.text),
  }));

  let attemptCount = 0;
  const auditRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(chitraLearningAuditLogs)
    .where(and(
      eq(chitraLearningAuditLogs.employeeId, currentEmployee.id),
      eq(chitraLearningAuditLogs.action, "online_assignment_submitted"),
      sql`CAST(after_value->>'campaignId' AS INTEGER) = ${campaignId}`
    ));
  attemptCount = Number(auditRows[0].count);

  const maxRetakes = campaign.maxRetakes ?? -1;

  return (
    <div className="min-h-[calc(100vh-4rem)] -mx-6 -my-6 bg-slate-50">
      <div className="h-14 border-b border-slate-100 flex items-center px-4 bg-white shadow-sm">
        <Button variant="ghost" size="sm" asChild className="text-slate-500">
          <Link href="/dashboard/chitralearning-lms/online-assignments">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Link>
        </Button>
        <div className="flex-1 text-center">
          <h1 className="font-heading font-semibold text-slate-900 text-sm">{campaign.title}</h1>
        </div>
        {campaign.durationMinutes > 0 && (
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Clock className="h-4 w-4" /> {campaign.durationMinutes} menit
          </div>
        )}
      </div>

      <OnlineAssignmentPlayer
        campaignId={campaignId}
        title={campaign.title}
        description={campaign.description}
        durationMinutes={campaign.durationMinutes ?? 0}
        questions={quizQuestions}
        attemptCount={attemptCount}
        maxRetakes={maxRetakes}
      />
    </div>
  );
}
