"use client";

import { LmsQuizPlayer, type QuizQuestion } from "@/components/lms/lms-quiz-player";
import { submitOnlineAssignmentQuizAction } from "@/app/dashboard/chitralearning-lms/actions";

interface OnlineAssignmentPlayerProps {
  campaignId: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  questions: QuizQuestion[];
  attemptCount: number;
  maxRetakes: number;
}

export function OnlineAssignmentPlayer({ campaignId, title, description, durationMinutes, questions, attemptCount, maxRetakes }: OnlineAssignmentPlayerProps) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {description && (
        <div className="mb-8 p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-600">
          {description}
        </div>
      )}

      <LmsQuizPlayer
        courseId={0}
        lessonId={campaignId}
        testPhase="posttest"
        questions={questions}
        nextLessonHref={null}
        courseHref="/dashboard/chitralearning-lms/online-assignments"
        attemptCount={attemptCount}
        maxRetakes={maxRetakes}
        submitAction={submitOnlineAssignmentQuizAction}
      />
    </div>
  );
}
