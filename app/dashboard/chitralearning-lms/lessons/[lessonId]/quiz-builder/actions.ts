'use server'

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { chitraLearningQuizQuestions } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";

function textValue(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

export async function createQuizQuestion(courseId: number, lessonId: number, formData: FormData) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  const questionText = textValue(formData, "questionText");
  const questionImageUrl = textValue(formData, "questionImageUrl");
  const optionA = textValue(formData, "optionA");
  const optionAImageUrl = textValue(formData, "optionAImageUrl");
  const optionB = textValue(formData, "optionB");
  const optionBImageUrl = textValue(formData, "optionBImageUrl");
  const optionC = textValue(formData, "optionC");
  const optionCImageUrl = textValue(formData, "optionCImageUrl");
  const optionD = textValue(formData, "optionD");
  const optionDImageUrl = textValue(formData, "optionDImageUrl");
  const correctOption = textValue(formData, "correctOption", "A");
  const testPhase = textValue(formData, "testPhase", "posttest");
  const questionType = textValue(formData, "questionType", "single_choice");

  const [created] = await db.insert(chitraLearningQuizQuestions).values({
    courseId,
    lessonId,
    questionText,
    questionImageUrl,
    optionA,
    optionAImageUrl,
    optionB,
    optionBImageUrl,
    optionC,
    optionCImageUrl,
    optionD,
    optionDImageUrl,
    correctOption,
    testPhase,
    questionType,
  }).returning();

  revalidatePath(`/dashboard/chitralearning-lms/lessons/${lessonId}/quiz-builder`);
  return created;
}

export async function updateQuizQuestion(questionId: number, formData: FormData) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  const questionText = textValue(formData, "questionText");
  const questionImageUrl = textValue(formData, "questionImageUrl");
  const optionA = textValue(formData, "optionA");
  const optionAImageUrl = textValue(formData, "optionAImageUrl");
  const optionB = textValue(formData, "optionB");
  const optionBImageUrl = textValue(formData, "optionBImageUrl");
  const optionC = textValue(formData, "optionC");
  const optionCImageUrl = textValue(formData, "optionCImageUrl");
  const optionD = textValue(formData, "optionD");
  const optionDImageUrl = textValue(formData, "optionDImageUrl");
  const correctOption = textValue(formData, "correctOption", "A");
  const questionType = textValue(formData, "questionType", "single_choice");

  const [updated] = await db.update(chitraLearningQuizQuestions)
    .set({
      questionText,
      questionImageUrl,
      optionA,
      optionAImageUrl,
      optionB,
      optionBImageUrl,
      optionC,
      optionCImageUrl,
      optionD,
      optionDImageUrl,
      correctOption,
      questionType,
    })
    .where(eq(chitraLearningQuizQuestions.id, questionId))
    .returning();

  revalidatePath(`/dashboard/chitralearning-lms/lessons/${updated?.lessonId ?? ""}/quiz-builder`);
  return updated;
}

export async function deleteQuizQuestion(questionId: number) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  await db.delete(chitraLearningQuizQuestions).where(eq(chitraLearningQuizQuestions.id, questionId));
  revalidatePath("/dashboard/chitralearning-lms");
  return { success: true };
}
