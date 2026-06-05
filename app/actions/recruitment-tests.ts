"use server";

import { db } from "@/db";
import { hcOnlineTests, hcOnlineTestQuestions, hcOnlineTestAssignments, hcOnlineTestAnswers } from "@/db/schema/hero";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";

export async function getOnlineTests() {
  return await db.select().from(hcOnlineTests).orderBy(desc(hcOnlineTests.createdAt));
}

export async function getTestWithQuestions(testId: number) {
  const [test] = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.id, testId)).limit(1);
  if (!test) return null;

  const questions = await db.select().from(hcOnlineTestQuestions).where(eq(hcOnlineTestQuestions.testId, testId)).orderBy(hcOnlineTestQuestions.sortOrder);
  
  const resolvedQuestions = await Promise.all(questions.map(async (q) => {
    let resolvedImageUrl = q.imageUrl;
    if (resolvedImageUrl) {
      resolvedImageUrl = await getS3ObjectReadUrl(resolvedImageUrl) || resolvedImageUrl;
    }
    
    let resolvedOptions = q.options;
    if (Array.isArray(resolvedOptions)) {
      resolvedOptions = await Promise.all(resolvedOptions.map(async (opt: any) => {
        if (opt.imageUrl) {
          return { ...opt, imageUrl: await getS3ObjectReadUrl(opt.imageUrl) || opt.imageUrl };
        }
        return opt;
      }));
    }
    
    return { ...q, imageUrl: resolvedImageUrl, options: resolvedOptions };
  }));

  return { test, questions: resolvedQuestions };
}

export async function createOnlineTest(data: { title: string; description: string; timeLimitMinutes: number; passingScore: number }) {
  const [created] = await db.insert(hcOnlineTests).values({
    title: data.title,
    description: data.description,
    timeLimitMinutes: data.timeLimitMinutes,
    passingScore: data.passingScore,
  }).returning();
  
  revalidatePath("/dashboard/hc/recruitment/tests");
  return created;
}

export async function updateOnlineTest(id: number, data: any) {
  const [updated] = await db.update(hcOnlineTests).set({ ...data, updatedAt: new Date() }).where(eq(hcOnlineTests.id, id)).returning();
  revalidatePath("/dashboard/hc/recruitment/tests");
  return updated;
}

export async function addTestQuestion(testId: number, data: { questionType: string; questionText: string; imageUrl?: string; options?: any; correctAnswer: string; points: number; sortOrder: number }) {
  const [created] = await db.insert(hcOnlineTestQuestions).values({
    testId,
    questionType: data.questionType,
    questionText: data.questionText,
    imageUrl: data.imageUrl || '',
    options: data.options || null,
    correctAnswer: data.correctAnswer,
    points: data.points,
    sortOrder: data.sortOrder,
  }).returning();

  revalidatePath("/dashboard/hc/recruitment/tests");
  return created;
}

export async function deleteTestQuestion(questionId: number) {
  await db.delete(hcOnlineTestQuestions).where(eq(hcOnlineTestQuestions.id, questionId));
  revalidatePath("/dashboard/hc/recruitment/tests");
}

export async function deleteOnlineTest(id: number) {
  await db.delete(hcOnlineTests).where(eq(hcOnlineTests.id, id));
  revalidatePath("/dashboard/hc/recruitment/tests");
}
