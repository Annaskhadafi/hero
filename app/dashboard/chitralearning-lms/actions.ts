'use server'

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  chitraLearningAssignmentResponses,
  chitraLearningAuditLogs,
  chitraLearningCampaignParticipants,
  chitraLearningCampaigns,
  chitraLearningCategories,
  chitraLearningCertificateTemplates,
  chitraLearningCertificates,
  chitraLearningCourseAccess,
  chitraLearningCourses,
  chitraLearningEnrollments,
  chitraLearningLessons,
  chitraLearningQuizQuestions,
  employees,
  trainingRecords,
} from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { runInternalLmsReminderTick, slugifyCourseTitle } from "@/lib/chitralearning-lms";

const LMS_PATH = "/dashboard/chitralearning-lms";

export async function createCourse(formData: FormData) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const title = textValue(formData, "title");
  const description = textValue(formData, "description");
  const newCategoryName = textValue(formData, "newCategoryName");
  
  let categoryId = numberValue(formData, "categoryId") || null;
  let categoryName = textValue(formData, "categoryName") || "Internal";

  if (newCategoryName) {
    const slug = slugifyCourseTitle(newCategoryName);
    const [inserted] = await db.insert(chitraLearningCategories).values({
      name: newCategoryName,
      slug: slug,
    }).returning({ id: chitraLearningCategories.id });
    categoryId = inserted.id;
    categoryName = newCategoryName;
  } else if (categoryId) {
    const [existingCategory] = await db.select({ id: chitraLearningCategories.id }).from(chitraLearningCategories).where(eq(chitraLearningCategories.id, categoryId)).limit(1);
    if (!existingCategory) {
      categoryId = null;
    }
  } else {
    categoryId = null;
  }
  const level = textValue(formData, "level", "beginner");
  const coverImageUrl = textValue(formData, "coverImageUrl");
  const videoPreviewUrl = textValue(formData, "videoPreviewUrl");

  const slugBase = slugifyCourseTitle(title);
  let slug = slugBase;
  let counter = 1;
  while (true) {
    const [existing] = await db.select({ id: chitraLearningCourses.id }).from(chitraLearningCourses).where(eq(chitraLearningCourses.slug, slug)).limit(1);
    if (!existing) break;
    slug = `${slugBase}-${counter++}`;
  }

  const [created] = await db.insert(chitraLearningCourses).values({
    title,
    slug,
    description,
    categoryId,
    category: categoryName,
    level,
    coverImageUrl,
    videoPreviewUrl,
    status: "draft",
    createdByEmployeeId: employee.id,
  }).returning({ slug: chitraLearningCourses.slug });

  revalidateLms();
  return created.slug;
}

export async function updateCourseBaseInfo(courseId: number, formData: FormData) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  const title = textValue(formData, "title");
  const description = textValue(formData, "description");
  const newCategoryName = textValue(formData, "newCategoryName");

  let categoryId = numberValue(formData, "categoryId") || null;
  let categoryName = textValue(formData, "categoryName") || "Internal";

  if (newCategoryName) {
    const slug = slugifyCourseTitle(newCategoryName);
    const [inserted] = await db.insert(chitraLearningCategories).values({
      name: newCategoryName,
      slug: slug,
    }).returning({ id: chitraLearningCategories.id });
    categoryId = inserted.id;
    categoryName = newCategoryName;
  } else if (categoryId) {
    const [existingCategory] = await db.select({ id: chitraLearningCategories.id }).from(chitraLearningCategories).where(eq(chitraLearningCategories.id, categoryId)).limit(1);
    if (!existingCategory) {
      categoryId = null;
    }
  } else {
    categoryId = null;
  }
  const level = textValue(formData, "level", "beginner");
  const coverImageUrl = textValue(formData, "coverImageUrl");
  const videoPreviewUrl = textValue(formData, "videoPreviewUrl");

  await db.update(chitraLearningCourses).set({
    title,
    description,
    categoryId,
    category: categoryName,
    level,
    coverImageUrl,
    videoPreviewUrl,
    updatedAt: new Date()
  }).where(eq(chitraLearningCourses.id, courseId));

  revalidateLms();
  return { success: true };
}

export async function updateCourseSettings(courseId: number, formData: FormData) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  const status = textValue(formData, "status", "draft");
  const passingScore = numberValue(formData, "passingScore", 80);
  const dueDays = numberValue(formData, "dueDays", 30);
  const certificateEnabled = textValue(formData, "certificateEnabled") === "yes";
  const gradingType = textValue(formData, "gradingType", "posttest_only");
  const pretestWeight = numberValue(formData, "pretestWeight", 0);
  const posttestWeight = numberValue(formData, "posttestWeight", 100);

  await db.update(chitraLearningCourses).set({
    status,
    passingScore,
    dueDays,
    certificateEnabled,
    gradingType,
    pretestWeight,
    posttestWeight,
    updatedAt: new Date()
  }).where(eq(chitraLearningCourses.id, courseId));

  revalidateLms();
  return { success: true };
}

function textValue(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(textValue(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function dateValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeValue(value: string | number | null | undefined) {
  return `${value ?? ""}`.trim().toLowerCase();
}

export async function createLesson(courseId: number, formData: FormData) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  const title = textValue(formData, "title");
  const description = textValue(formData, "description");
  const sectionTitle = textValue(formData, "sectionTitle", "Materi Pembelajaran");
  const lessonType = textValue(formData, "lessonType", "video");
  const videoUrl = textValue(formData, "videoUrl");
  const fileUrl = textValue(formData, "fileUrl");
  const durationMinutes = numberValue(formData, "durationMinutes", 0);
  const isRequired = formData.get("isRequired") === "true";
  
  let quizSettings = null;
  const quizSettingsStr = formData.get("quizSettings");
  if (typeof quizSettingsStr === "string" && quizSettingsStr) {
    try {
      quizSettings = JSON.parse(quizSettingsStr);
    } catch (e) {
      // ignore
    }
  }

  // Get max sortOrder for this course
  const [maxOrder] = await db.select({ max: sql<number>`MAX(sort_order)` })
    .from(chitraLearningLessons)
    .where(eq(chitraLearningLessons.courseId, courseId));
    
  const nextOrder = (maxOrder?.max || 0) + 1;

  const [created] = await db.insert(chitraLearningLessons).values({
    courseId,
    title,
    description,
    sectionTitle,
    lessonType,
    videoUrl,
    fileUrl,
    durationMinutes,
    quizSettings,
    sortOrder: nextOrder,
    isRequired,
  }).returning();

  revalidateLms();
  revalidatePath(`/dashboard/chitralearning-lms/courses/${courseId}/edit`);
  return created;
}

export async function updateLesson(lessonId: number, formData: FormData) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  const title = textValue(formData, "title");
  const description = textValue(formData, "description");
  const sectionTitle = textValue(formData, "sectionTitle", "Materi Pembelajaran");
  const lessonType = textValue(formData, "lessonType", "video");
  const videoUrl = textValue(formData, "videoUrl");
  const fileUrl = textValue(formData, "fileUrl");
  const durationMinutes = numberValue(formData, "durationMinutes", 0);
  const isRequired = formData.get("isRequired") === "true";
  
  let quizSettings = null;
  const quizSettingsStr = formData.get("quizSettings");
  if (typeof quizSettingsStr === "string" && quizSettingsStr) {
    try {
      quizSettings = JSON.parse(quizSettingsStr);
    } catch (e) {
      // ignore
    }
  }

  const [updated] = await db.update(chitraLearningLessons)
    .set({
      title,
      description,
      sectionTitle,
      lessonType,
      videoUrl,
      fileUrl,
      durationMinutes,
      quizSettings,
      isRequired,
      updatedAt: new Date(),
    })
    .where(eq(chitraLearningLessons.id, lessonId))
    .returning();

  revalidateLms();
  return updated;
}

export async function deleteLesson(lessonId: number) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  await db.delete(chitraLearningLessons).where(eq(chitraLearningLessons.id, lessonId));
  revalidateLms();
  return { success: true };
}

export async function deleteQuizQuestion(questionId: number) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  await db.delete(chitraLearningQuizQuestions).where(eq(chitraLearningQuizQuestions.id, questionId));
  revalidateLms();
  return { success: true };
}

export async function reorderCurriculum(courseId: number, sections: any[]) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  // Format of sections is BuilderSection[]: { title: string, lessons: { id: string }[] }
  let sectionOrder = 1;
  let sortOrder = 1;

  // Use a transaction to ensure all updates happen or none
  await db.transaction(async (tx) => {
    for (const section of sections) {
      for (const lesson of section.lessons) {
        if (!lesson.id.startsWith('new-')) {
          await tx.update(chitraLearningLessons)
            .set({
              sectionTitle: section.title,
              sectionOrder: sectionOrder,
              sortOrder: sortOrder,
            })
            .where(eq(chitraLearningLessons.id, parseInt(lesson.id, 10)));
          sortOrder++;
        }
      }
      sectionOrder++;
    }
  });

  revalidateLms();
  return { success: true };
}

export async function getInternalLmsAllQuestionsAction() {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  // Fetch all questions with their course and lesson context
  const questions = await db
    .select({
      id: chitraLearningQuizQuestions.id,
      questionText: chitraLearningQuizQuestions.questionText,
      courseTitle: chitraLearningCourses.title,
      lessonTitle: chitraLearningLessons.title,
      testPhase: chitraLearningQuizQuestions.testPhase,
    })
    .from(chitraLearningQuizQuestions)
    .leftJoin(chitraLearningCourses, eq(chitraLearningQuizQuestions.courseId, chitraLearningCourses.id))
    .leftJoin(chitraLearningLessons, eq(chitraLearningQuizQuestions.lessonId, chitraLearningLessons.id))
    .orderBy(desc(chitraLearningQuizQuestions.createdAt));

  return questions;
}

export async function copyInternalLmsQuestionsAction(sourceQuestionIds: number[], targetCourseId: number, targetLessonId: number) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  if (!sourceQuestionIds.length) return { success: true };

  // Fetch source questions
  const sourceQuestions = await db
    .select()
    .from(chitraLearningQuizQuestions)
    .where(sql`${chitraLearningQuizQuestions.id} IN (${sql.join(sourceQuestionIds, sql`, `)})`);

  if (!sourceQuestions.length) return { success: false, message: "No questions found" };

  // Determine max sort order in target lesson
  const [maxOrder] = await db.select({ max: sql<number>`MAX(sort_order)` })
    .from(chitraLearningQuizQuestions)
    .where(eq(chitraLearningQuizQuestions.lessonId, targetLessonId));
    
  let nextOrder = (maxOrder?.max || 0) + 1;

  // Insert copies
  const newQuestions = sourceQuestions.map(q => ({
    courseId: targetCourseId,
    lessonId: targetLessonId,
    testPhase: q.testPhase,
    questionText: q.questionText,
    questionImageUrl: q.questionImageUrl,
    optionA: q.optionA,
    optionAImageUrl: q.optionAImageUrl,
    optionB: q.optionB,
    optionBImageUrl: q.optionBImageUrl,
    optionC: q.optionC,
    optionCImageUrl: q.optionCImageUrl,
    optionD: q.optionD,
    optionDImageUrl: q.optionDImageUrl,
    correctOption: q.correctOption,
    points: q.points,
    sortOrder: nextOrder++,
  }));

  await db.insert(chitraLearningQuizQuestions).values(newQuestions);

  revalidateLms();
  revalidatePath(`/dashboard/chitralearning-lms/courses/${targetCourseId}/edit`);
  return { success: true };
}

async function getCurrentEmployeeId() {
  const employee = await getCurrentEmployee();
  return employee?.id ?? null;
}

async function getCurrentEmployee() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const [employee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      employeeSn: employees.employeeSn,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1);

  return employee ?? null;
}

function revalidateLms() {
  revalidatePath(LMS_PATH, "layout");
}

async function logInternalLmsAudit(input: {
  actorEmployeeId?: number | null;
  action: string;
  courseId?: number | null;
  employeeId?: number | null;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  note?: string;
}) {
  await db.insert(chitraLearningAuditLogs).values({
    actorEmployeeId: input.actorEmployeeId ?? null,
    action: input.action,
    courseId: input.courseId ?? null,
    employeeId: input.employeeId ?? null,
    beforeValue: input.beforeValue ?? {},
    afterValue: input.afterValue ?? {},
    note: input.note ?? "",
  });
}

function dueDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, days || 14));
  return date;
}

function clampScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

async function getCourse(courseId: number) {
  const [course] = await db
    .select()
    .from(chitraLearningCourses)
    .where(eq(chitraLearningCourses.id, courseId))
    .limit(1);

  return course ?? null;
}

async function getLessonProgress(courseId: number, lessonId: number) {
  const lessons = await db
    .select({ id: chitraLearningLessons.id })
    .from(chitraLearningLessons)
    .where(eq(chitraLearningLessons.courseId, courseId))
    .orderBy(asc(chitraLearningLessons.sectionOrder), asc(chitraLearningLessons.sortOrder), asc(chitraLearningLessons.id));
  const lessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (lessonIndex < 0 || lessons.length === 0) return 0;
  return clampScore(((lessonIndex + 1) / lessons.length) * 100);
}

async function getOrCreateEnrollment(
  courseId: number,
  employeeId: number,
  options: { dueAt?: Date | null; assignedByEmployeeId?: number | null } = {}
) {
  const [existing] = await db
    .select()
    .from(chitraLearningEnrollments)
    .where(and(eq(chitraLearningEnrollments.courseId, courseId), eq(chitraLearningEnrollments.employeeId, employeeId)))
    .limit(1);

  if (existing) {
    if (options.dueAt && !existing.dueAt) {
      await db
        .update(chitraLearningEnrollments)
        .set({
          dueAt: options.dueAt,
          assignedByEmployeeId: existing.assignedByEmployeeId ?? options.assignedByEmployeeId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(chitraLearningEnrollments.id, existing.id));
    }
    return existing;
  }

  const course = await getCourse(courseId);
  const [created] = await db
    .insert(chitraLearningEnrollments)
    .values({
      courseId,
      employeeId,
      status: "in_progress",
      progress: 10,
      assignedByEmployeeId: options.assignedByEmployeeId ?? null,
      startedAt: new Date(),
      dueAt: options.dueAt ?? dueDate(course?.dueDays ?? 14),
    })
    .returning();

  return created;
}

export async function completeInternalLmsLessonAction(input: { courseId: number; lessonId: number }) {
  const employee = await getCurrentEmployee();
  if (!employee || !input.courseId || !input.lessonId) return null;

  const enrollment = await getOrCreateEnrollment(input.courseId, employee.id);
  const progress = Math.max(enrollment.progress, await getLessonProgress(input.courseId, input.lessonId));

  await db
    .update(chitraLearningEnrollments)
    .set({
      status: progress >= 100 ? "passed" : "in_progress",
      progress,
      lastLessonId: input.lessonId,
      completedAt: progress >= 100 ? new Date() : enrollment.completedAt,
      updatedAt: new Date(),
    })
    .where(eq(chitraLearningEnrollments.id, enrollment.id));

  await logInternalLmsAudit({
    actorEmployeeId: employee.id,
    action: "lesson_completed",
    courseId: input.courseId,
    employeeId: employee.id,
    afterValue: { lessonId: input.lessonId, progress },
  });

  revalidateLms();
  return { progress };
}

function matchesCampaignTarget(
  targetType: string,
  targetValue: string,
  employee: {
    id: number;
    employeeSn?: string | null;
    department?: string | null;
    section?: string | null;
    accessRole?: string | null;
    workLocation?: string | null;
  }
) {
  const value = normalizeValue(targetValue || "*");
  if (targetType === "all" || value === "*") return true;
  if (targetType === "site") return value === normalizeValue(employee.workLocation);
  if (targetType === "department") return value === normalizeValue(employee.department);
  if (targetType === "section") return value === normalizeValue(employee.section);
  if (targetType === "role") return value === normalizeValue(employee.accessRole);
  if (targetType === "employee") return value === normalizeValue(employee.id) || value === normalizeValue(employee.employeeSn);
  return false;
}

async function issueCertificateForEmployee(
  courseId: number,
  employeeId: number,
  enrollmentId: number | null = null,
  actorEmployeeId: number | null = null,
  note = ""
) {
  const [existingCertificate] = await db
    .select({ id: chitraLearningCertificates.id })
    .from(chitraLearningCertificates)
    .where(
      and(
        eq(chitraLearningCertificates.courseId, courseId),
        eq(chitraLearningCertificates.employeeId, employeeId)
      )
    )
    .limit(1);

  if (existingCertificate) return existingCertificate.id;

  const course = await getCourse(courseId);
  const [trainingRecord] = await db
    .insert(trainingRecords)
    .values({
      employeeId,
      trainingName: course?.title || "ChitraLearning Internal Course",
      provider: "ChitraLearning LMS Internal",
      completedYear: new Date().getFullYear(),
      status: "valid",
    })
    .returning({ id: trainingRecords.id });

  const [certificate] = await db
    .insert(chitraLearningCertificates)
    .values({
      courseId,
      employeeId,
      enrollmentId,
      trainingRecordId: trainingRecord?.id ?? null,
      certificateNumber: `CL-${new Date().getFullYear()}-${courseId}-${employeeId}`,
      status: "issued",
      metadata: {
        source: "chitralearning-internal",
        issuedBy: await getCurrentEmployeeId(),
      },
    })
    .returning({ id: chitraLearningCertificates.id });

  await logInternalLmsAudit({
    actorEmployeeId: actorEmployeeId ?? (await getCurrentEmployeeId()),
    action: "certificate_issued",
    courseId,
    employeeId,
    afterValue: {
      certificateId: certificate.id,
      certificateNumber: `CL-${new Date().getFullYear()}-${courseId}-${employeeId}`,
      trainingRecordId: trainingRecord?.id ?? null,
    },
    note,
  });

  revalidatePath("/dashboard/training-records");
  return certificate.id;
}

export async function createInternalLmsCourseAction(formData: FormData) {
  const title = textValue(formData, "title");

  if (!title) {
    throw new Error("Judul course wajib diisi");
  }

  const baseSlug = slugifyCourseTitle(title) || "internal-course";
  const createdByEmployeeId = await getCurrentEmployeeId();

  const [course] = await db.insert(chitraLearningCourses).values({
    title,
    slug: `${baseSlug}-${Date.now().toString(36)}`,
    description: textValue(formData, "description"),
    category: textValue(formData, "category", "Internal") || "Internal",
    status: textValue(formData, "status", "draft") || "draft",
    passingScore: numberValue(formData, "passingScore", 80),
    estimatedMinutes: numberValue(formData, "estimatedMinutes", 0),
    dueDays: numberValue(formData, "dueDays", 14),
    certificateEnabled: formData.get("certificateEnabled") === "on",
    createdByEmployeeId,
  }).returning();

  if (course.status === "published") {
    await logInternalLmsAudit({
      actorEmployeeId: createdByEmployeeId,
      action: "course_published",
      courseId: course.id,
      afterValue: {
        status: course.status,
        passingScore: course.passingScore,
      },
      note: "Course created as published.",
    });
  }

  revalidateLms();
}

export async function updateInternalLmsCourseGovernanceAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
  const actorEmployeeId = await getCurrentEmployeeId();
  const course = await getCourse(courseId);

  if (!course) {
    throw new Error("Course tidak ditemukan");
  }

  const nextStatus = textValue(formData, "status", course.status) || course.status;
  const nextPassingScore = numberValue(formData, "passingScore", course.passingScore);
  const nextDueDays = numberValue(formData, "dueDays", course.dueDays);
  const nextCertificateEnabled = formData.get("certificateEnabled") === "on";

  await db
    .update(chitraLearningCourses)
    .set({
      status: nextStatus,
      passingScore: nextPassingScore,
      dueDays: Math.max(1, nextDueDays),
      certificateEnabled: nextCertificateEnabled,
      updatedAt: new Date(),
    })
    .where(eq(chitraLearningCourses.id, courseId));

  const beforeValue = {
    status: course.status,
    passingScore: course.passingScore,
    dueDays: course.dueDays,
    certificateEnabled: course.certificateEnabled,
  };
  const afterValue = {
    status: nextStatus,
    passingScore: nextPassingScore,
    dueDays: Math.max(1, nextDueDays),
    certificateEnabled: nextCertificateEnabled,
  };

  if (course.status !== nextStatus) {
    await logInternalLmsAudit({
      actorEmployeeId,
      action: nextStatus === "published" ? "course_published" : "course_status_changed",
      courseId,
      beforeValue,
      afterValue,
    });
  }

  if (course.passingScore !== nextPassingScore) {
    await logInternalLmsAudit({
      actorEmployeeId,
      action: "passing_score_changed",
      courseId,
      beforeValue,
      afterValue,
    });
  }

  revalidateLms();
}

export async function createInternalLmsCampaignAction(formData: FormData) {
  const title = textValue(formData, "title");
  const campaignType = textValue(formData, "campaignType", "posttest") || "posttest";
  const courseId = numberValue(formData, "courseId");
  const targetType = textValue(formData, "targetType", "all") || "all";
  const targetValue = targetType === "all" ? "*" : textValue(formData, "targetValue");
  const actorEmployeeId = await getCurrentEmployeeId();

  if (!title) {
    throw new Error("Judul campaign wajib diisi");
  }

  if (campaignType !== "assignment" && !courseId) {
    throw new Error("Post test / quiz refreshment wajib pilih course");
  }

  if (targetType !== "all" && !targetValue) {
    throw new Error("Target wajib diisi");
  }

  const course = courseId ? await getCourse(courseId) : null;
  if (courseId && !course) {
    throw new Error("Course tidak ditemukan");
  }

  const passingScore = clampScore(numberValue(formData, "passingScore", course?.passingScore ?? 80));

  const [campaign] = await db
    .insert(chitraLearningCampaigns)
    .values({
      title,
      description: textValue(formData, "description"),
      courseId: courseId || null,
      campaignType,
      targetType,
      targetValue,
      dueAt: dateValue(formData, "dueAt"),
      // ponytail: recurrence is stored as policy only; automatic future campaign generation can reuse this field later.
      recurrence: textValue(formData, "recurrence", "manual") || "manual",
      status: "draft",
      passingScore,
      assignmentPrompt: textValue(formData, "assignmentPrompt"),
      createdByEmployeeId: actorEmployeeId,
    })
    .returning({ id: chitraLearningCampaigns.id });

  await logInternalLmsAudit({
    actorEmployeeId,
    action: "campaign_created",
    courseId: courseId || null,
    afterValue: {
      campaignId: campaign.id,
      campaignType,
      targetType,
      targetValue,
      passingScore,
    },
    note: "Refreshment campaign saved as draft.",
  });

  revalidateLms();
}

export async function publishInternalLmsCampaignAction(formData: FormData) {
  const campaignId = numberValue(formData, "campaignId");
  const actorEmployeeId = await getCurrentEmployeeId();

  const [campaign] = await db
    .select()
    .from(chitraLearningCampaigns)
    .where(eq(chitraLearningCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new Error("Campaign tidak ditemukan");
  }

  if (campaign.status === "archived") {
    throw new Error("Campaign archived tidak bisa dipublish");
  }

  const employeeRows = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      department: employees.department,
      section: employees.section,
      accessRole: employees.accessRole,
      workLocation: employees.workLocation,
      isActive: employees.isActive,
    })
    .from(employees);

  const targetEmployees = employeeRows.filter((employee) => {
    if (employee.isActive === false) return false;
    return matchesCampaignTarget(campaign.targetType, campaign.targetValue, employee);
  });

  const existingParticipants = await db
    .select({
      employeeId: chitraLearningCampaignParticipants.employeeId,
    })
    .from(chitraLearningCampaignParticipants)
    .where(eq(chitraLearningCampaignParticipants.campaignId, campaign.id));
  const existingEmployeeIds = new Set(existingParticipants.map((participant) => participant.employeeId));
  const participantValues = [];

  for (const employee of targetEmployees) {
    if (existingEmployeeIds.has(employee.id)) continue;

    const enrollment = campaign.courseId
      ? await getOrCreateEnrollment(campaign.courseId, employee.id, {
          dueAt: campaign.dueAt,
          assignedByEmployeeId: actorEmployeeId,
        })
      : null;

    participantValues.push({
      campaignId: campaign.id,
      employeeId: employee.id,
      enrollmentId: enrollment?.id ?? null,
      status: "assigned",
    });
  }

  if (participantValues.length > 0) {
    await db.insert(chitraLearningCampaignParticipants).values(participantValues);
  }

  await db
    .update(chitraLearningCampaigns)
    .set({
      status: "published",
      publishedAt: campaign.publishedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(chitraLearningCampaigns.id, campaign.id));

  await logInternalLmsAudit({
    actorEmployeeId,
    action: "campaign_published",
    courseId: campaign.courseId,
    afterValue: {
      campaignId: campaign.id,
      targetCount: targetEmployees.length,
      insertedParticipants: participantValues.length,
      targetType: campaign.targetType,
      targetValue: campaign.targetValue,
    },
    note: "Refreshment campaign published and assigned to target employees.",
  });

  revalidateLms();
}

export async function startInternalLmsCourseAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
  const employee = await getCurrentEmployee();

  if (!courseId || !employee) {
    throw new Error("Course dan karyawan wajib ada");
  }

  const course = await getCourse(courseId);
  if (!course || course.status === "archived") {
    throw new Error("Course tidak tersedia");
  }

  const [existing] = await db
    .select()
    .from(chitraLearningEnrollments)
    .where(and(eq(chitraLearningEnrollments.courseId, courseId), eq(chitraLearningEnrollments.employeeId, employee.id)))
    .limit(1);

  if (existing) {
    await db
      .update(chitraLearningEnrollments)
      .set({
        status: existing.status === "passed" ? existing.status : "in_progress",
        progress: Math.max(existing.progress, 10),
        startedAt: existing.startedAt ?? new Date(),
        dueAt: existing.dueAt ?? dueDate(course.dueDays),
        updatedAt: new Date(),
      })
      .where(eq(chitraLearningEnrollments.id, existing.id));
  } else {
    await db.insert(chitraLearningEnrollments).values({
      courseId,
      employeeId: employee.id,
      status: "in_progress",
      progress: 10,
      startedAt: new Date(),
      dueAt: dueDate(course.dueDays),
    });
  }

  revalidateLms();
}

export async function restartInternalLmsMaterialAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
  const employee = await getCurrentEmployee();

  if (!courseId || !employee) {
    throw new Error("Course dan karyawan wajib ada");
  }

  const enrollment = await getOrCreateEnrollment(courseId, employee.id);
  await db
    .update(chitraLearningEnrollments)
    .set({
      status: "in_progress",
      progress: 20,
      posttestStatus: "not_started",
      lastLessonId: null,
      lastPositionSeconds: 0,
      updatedAt: new Date(),
    })
    .where(eq(chitraLearningEnrollments.id, enrollment.id));

  revalidateLms();
}

export async function saveInternalLmsVideoProgressAction(input: {
  enrollmentId: number;
  lessonId: number;
  positionSeconds: number;
}) {
  const employee = await getCurrentEmployee();
  if (!employee || !input.enrollmentId || !input.lessonId) return;

  const [enrollment] = await db
    .select()
    .from(chitraLearningEnrollments)
    .where(and(eq(chitraLearningEnrollments.id, input.enrollmentId), eq(chitraLearningEnrollments.employeeId, employee.id)))
    .limit(1);

  if (!enrollment) return;

  await db
    .update(chitraLearningEnrollments)
    .set({
      status: enrollment.status === "passed" ? "passed" : "in_progress",
      progress: Math.max(enrollment.progress, 60),
      lastLessonId: input.lessonId,
      lastPositionSeconds: Math.max(0, Math.floor(input.positionSeconds || 0)),
      updatedAt: new Date(),
    })
    .where(eq(chitraLearningEnrollments.id, enrollment.id));
  revalidateLms();
}

export async function submitInternalLmsQuizAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
  const lessonId = numberValue(formData, "lessonId");
  const phase = textValue(formData, "testPhase", "posttest") === "pretest" ? "pretest" : "posttest";
  const employee = await getCurrentEmployee();

  if (!courseId || !employee) {
    throw new Error("Course dan karyawan wajib ada");
  }

  const course = await getCourse(courseId);
  if (!course) {
    throw new Error("Course tidak ditemukan");
  }

  const enrollment = await getOrCreateEnrollment(courseId, employee.id);
  const questions = await db
    .select()
    .from(chitraLearningQuizQuestions)
    .where(
      lessonId
        ? and(
            eq(chitraLearningQuizQuestions.courseId, courseId),
            eq(chitraLearningQuizQuestions.lessonId, lessonId),
            eq(chitraLearningQuizQuestions.testPhase, phase)
          )
        : and(eq(chitraLearningQuizQuestions.courseId, courseId), eq(chitraLearningQuizQuestions.testPhase, phase))
    );

  const totalPoints = questions.reduce((sum, question) => sum + Math.max(1, question.points || 1), 0);
  const awardedPoints = questions.reduce((sum, question) => {
    const answer = textValue(formData, `answer_${question.id}`).toUpperCase();
    const correct = question.correctOption.toUpperCase();
    return sum + (answer && answer === correct ? Math.max(1, question.points || 1) : 0);
  }, 0);
  const score = totalPoints > 0 ? Math.round((awardedPoints / totalPoints) * 100) : 0;

  if (phase === "pretest") {
    const progress = Math.max(enrollment.progress, await getLessonProgress(courseId, lessonId));
    
    const finalScore = course.gradingType === 'weighted' 
        ? Math.round((score * (course.pretestWeight || 0) / 100) + ((enrollment.posttestScore || 0) * (course.posttestWeight || 100) / 100))
        : (enrollment.posttestScore || 0);
    const passed = finalScore >= course.passingScore;

    await db
      .update(chitraLearningEnrollments)
      .set({
        pretestScore: score,
        pretestStatus: "completed",
        progress,
        finalScore,
        isPassed: passed,
        lastLessonId: lessonId || enrollment.lastLessonId,
        updatedAt: new Date(),
      })
      .where(eq(chitraLearningEnrollments.id, enrollment.id));
  } else {
    const finalScore = course.gradingType === 'weighted'
        ? Math.round(((enrollment.pretestScore || 0) * (course.pretestWeight || 0) / 100) + (score * (course.posttestWeight || 100) / 100))
        : score;
    const passed = finalScore >= course.passingScore;

    await db
      .update(chitraLearningEnrollments)
      .set({
        posttestScore: score,
        posttestStatus: passed ? "passed" : "failed",
        score: finalScore,
        finalScore,
        isPassed: passed,
        status: passed ? "passed" : "failed",
        progress: passed ? 100 : Math.max(enrollment.progress, 80),
        lastLessonId: lessonId || enrollment.lastLessonId,
        completedAt: passed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(chitraLearningEnrollments.id, enrollment.id));

    if (passed && course.certificateEnabled) {
      await issueCertificateForEmployee(courseId, employee.id, enrollment.id, employee.id, "auto_issued_after_posttest");
    }

    await db
      .update(chitraLearningCampaignParticipants)
      .set({
        status: passed ? "passed" : "failed",
        score,
        submittedAt: new Date(),
        completedAt: passed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(chitraLearningCampaignParticipants.enrollmentId, enrollment.id));
  }

  await logInternalLmsAudit({
    actorEmployeeId: employee.id,
    action: "quiz_submitted",
    courseId,
    employeeId: employee.id,
    afterValue: {
      lessonId,
      phase,
      score,
      answers: questions.map((question) => ({
        questionId: question.id,
        answer: textValue(formData, `answer_${question.id}`).toUpperCase(),
      })),
    },
  });

  revalidateLms();
}

export async function submitInternalLmsAssignmentResponseAction(formData: FormData) {
  const campaignId = numberValue(formData, "campaignId");
  const responseText = textValue(formData, "responseText");
  const fileUrl = textValue(formData, "fileUrl");
  const employee = await getCurrentEmployee();

  if (!campaignId || !employee) {
    throw new Error("Campaign dan karyawan wajib ada");
  }

  if (!responseText && !fileUrl) {
    throw new Error("Isi assignment atau file URL wajib diisi");
  }

  const [campaign] = await db
    .select()
    .from(chitraLearningCampaigns)
    .where(eq(chitraLearningCampaigns.id, campaignId))
    .limit(1);

  if (!campaign || campaign.status !== "published" || campaign.campaignType !== "assignment") {
    throw new Error("Assignment campaign tidak tersedia");
  }

  const [participant] = await db
    .select()
    .from(chitraLearningCampaignParticipants)
    .where(
      and(
        eq(chitraLearningCampaignParticipants.campaignId, campaignId),
        eq(chitraLearningCampaignParticipants.employeeId, employee.id)
      )
    )
    .limit(1);

  if (!participant) {
    throw new Error("Karyawan belum terdaftar di assignment ini");
  }

  await db.insert(chitraLearningAssignmentResponses).values({
    campaignId,
    employeeId: employee.id,
    responseText,
    fileUrl,
    status: "submitted",
  });

  await db
    .update(chitraLearningCampaignParticipants)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(chitraLearningCampaignParticipants.id, participant.id));

  await logInternalLmsAudit({
    actorEmployeeId: employee.id,
    action: "assignment_submitted",
    courseId: campaign.courseId,
    employeeId: employee.id,
    afterValue: {
      campaignId,
      fileUrl,
    },
  });

  revalidateLms();
}

export async function cloneInternalLmsCourseAction(formData: FormData) {
  const sourceCourseId = numberValue(formData, "courseId");
  const createdByEmployeeId = await getCurrentEmployeeId();
  const source = await getCourse(sourceCourseId);

  if (!source) {
    throw new Error("Course sumber tidak ditemukan");
  }

  const [course] = await db
    .insert(chitraLearningCourses)
    .values({
      title: `${source.title} (Copy)`,
      slug: `${source.slug}-copy-${Date.now().toString(36)}`,
      description: source.description,
      category: source.category,
      status: "draft",
      coverImageUrl: source.coverImageUrl,
      passingScore: source.passingScore,
      estimatedMinutes: source.estimatedMinutes,
      dueDays: source.dueDays,
      certificateEnabled: source.certificateEnabled,
      createdByEmployeeId,
    })
    .returning();

  const [lessons, questions] = await Promise.all([
    db.select().from(chitraLearningLessons).where(eq(chitraLearningLessons.courseId, sourceCourseId)),
    db.select().from(chitraLearningQuizQuestions).where(eq(chitraLearningQuizQuestions.courseId, sourceCourseId)),
  ]);

  if (lessons.length > 0) {
    await db.insert(chitraLearningLessons).values(
      lessons.map((lesson) => ({
        courseId: course.id,
        lessonType: lesson.lessonType,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl,
        fileUrl: lesson.fileUrl,
        durationMinutes: lesson.durationMinutes,
        sortOrder: lesson.sortOrder,
        isRequired: lesson.isRequired,
      }))
    );
  }

  if (questions.length > 0) {
    await db.insert(chitraLearningQuizQuestions).values(
      questions.map((question) => ({
        courseId: course.id,
        testPhase: question.testPhase,
        questionText: question.questionText,
        questionImageUrl: question.questionImageUrl,
        optionA: question.optionA,
        optionAImageUrl: question.optionAImageUrl,
        optionB: question.optionB,
        optionBImageUrl: question.optionBImageUrl,
        optionC: question.optionC,
        optionCImageUrl: question.optionCImageUrl,
        optionD: question.optionD,
        optionDImageUrl: question.optionDImageUrl,
        correctOption: question.correctOption,
        points: question.points,
        sortOrder: question.sortOrder,
      }))
    );
  }

  revalidateLms();
}

export async function duplicateInternalLmsQuestionAction(formData: FormData) {
  const questionId = numberValue(formData, "questionId");
  const [question] = await db
    .select()
    .from(chitraLearningQuizQuestions)
    .where(eq(chitraLearningQuizQuestions.id, questionId))
    .limit(1);

  if (!question) {
    throw new Error("Question tidak ditemukan");
  }

  await db.insert(chitraLearningQuizQuestions).values({
    courseId: question.courseId,
    lessonId: question.lessonId,
    testPhase: question.testPhase,
    questionText: `${question.questionText} (Copy)`,
    questionImageUrl: question.questionImageUrl,
    optionA: question.optionA,
    optionAImageUrl: question.optionAImageUrl,
    optionB: question.optionB,
    optionBImageUrl: question.optionBImageUrl,
    optionC: question.optionC,
    optionCImageUrl: question.optionCImageUrl,
    optionD: question.optionD,
    optionDImageUrl: question.optionDImageUrl,
    correctOption: question.correctOption,
    points: question.points,
    sortOrder: question.sortOrder + 1,
  });

  revalidateLms();
}

export async function createInternalLmsLessonAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
  const title = textValue(formData, "title");

  if (!courseId || !title) {
    throw new Error("Course dan judul lesson wajib diisi");
  }

  await db.insert(chitraLearningLessons).values({
    courseId,
    title,
    lessonType: textValue(formData, "lessonType", "video") || "video",
    description: textValue(formData, "description"),
    videoUrl: textValue(formData, "videoUrl"),
    fileUrl: textValue(formData, "fileUrl"),
    durationMinutes: numberValue(formData, "durationMinutes", 0),
    sortOrder: numberValue(formData, "sortOrder", 1),
    isRequired: formData.get("isRequired") === "on",
  });

  revalidateLms();
}

export async function createInternalLmsQuizQuestionAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
  const questionText = textValue(formData, "questionText");

  if (!courseId || !questionText) {
    throw new Error("Course dan pertanyaan quiz wajib diisi");
  }

  await db.insert(chitraLearningQuizQuestions).values({
    courseId,
    testPhase: textValue(formData, "testPhase", "posttest") || "posttest",
    questionText,
    questionImageUrl: textValue(formData, "questionImageUrl"),
    optionA: textValue(formData, "optionA"),
    optionAImageUrl: textValue(formData, "optionAImageUrl"),
    optionB: textValue(formData, "optionB"),
    optionBImageUrl: textValue(formData, "optionBImageUrl"),
    optionC: textValue(formData, "optionC"),
    optionCImageUrl: textValue(formData, "optionCImageUrl"),
    optionD: textValue(formData, "optionD"),
    optionDImageUrl: textValue(formData, "optionDImageUrl"),
    correctOption: textValue(formData, "correctOption", "A").toUpperCase() || "A",
    points: numberValue(formData, "points", 1),
    sortOrder: numberValue(formData, "sortOrder", 1),
  });

  revalidateLms();
}

export async function createInternalLmsAccessRuleAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
  const accessType = textValue(formData, "accessType", "all") || "all";
  const accessValue = accessType === "all" ? "*" : textValue(formData, "accessValue");

  if (!courseId || !accessType || !accessValue) {
    throw new Error("Course, tipe akses, dan nilai akses wajib diisi");
  }

  await db.insert(chitraLearningCourseAccess).values({
    courseId,
    accessType,
    accessValue,
    description: textValue(formData, "description"),
    isActive: formData.get("isActive") === "on",
  });

  revalidateLms();
}

export async function issueInternalLmsCertificateAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
  const employeeId = numberValue(formData, "employeeId");

  if (!courseId || !employeeId) {
    throw new Error("Course dan karyawan wajib diisi");
  }

  const [existingCertificate] = await db
    .select({ id: chitraLearningCertificates.id })
    .from(chitraLearningCertificates)
    .where(
      and(
        eq(chitraLearningCertificates.courseId, courseId),
        eq(chitraLearningCertificates.employeeId, employeeId)
      )
    )
    .limit(1);

  if (existingCertificate) {
    revalidateLms();
    return;
  }

  const [course] = await db
    .select({ title: chitraLearningCourses.title })
    .from(chitraLearningCourses)
    .where(eq(chitraLearningCourses.id, courseId))
    .limit(1);

  const [trainingRecord] = await db
    .insert(trainingRecords)
    .values({
      employeeId,
      trainingName: course?.title || "ChitraLearning Internal Course",
      provider: "ChitraLearning LMS Internal",
      completedYear: new Date().getFullYear(),
      status: "valid",
    })
    .returning({ id: trainingRecords.id });

  await db.insert(chitraLearningCertificates).values({
    courseId,
    employeeId,
    trainingRecordId: trainingRecord?.id ?? null,
    certificateNumber:
      textValue(formData, "certificateNumber") || `CL-${new Date().getFullYear()}-${courseId}-${employeeId}`,
    status: "issued",
    metadata: {
      source: "chitralearning-internal",
      issuedBy: await getCurrentEmployeeId(),
    },
  });

  await logInternalLmsAudit({
    actorEmployeeId: await getCurrentEmployeeId(),
    action: "certificate_issued",
    courseId,
    employeeId,
    afterValue: {
      certificateNumber:
        textValue(formData, "certificateNumber") || `CL-${new Date().getFullYear()}-${courseId}-${employeeId}`,
      trainingRecordId: trainingRecord?.id ?? null,
    },
    note: "Manual certificate issue.",
  });

  revalidatePath("/dashboard/training-records");
  revalidateLms();
}

export async function runInternalLmsReminderAction(formData: FormData) {
  const actorEmployeeId = await getCurrentEmployeeId();

  await runInternalLmsReminderTick({
    actorEmployeeId,
    filters: {
      site: textValue(formData, "site"),
      department: textValue(formData, "department"),
      section: textValue(formData, "section"),
      role: textValue(formData, "role"),
    },
  });

  revalidateLms();
}

export async function requestInternalLmsEnrollmentAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
  const employee = await getCurrentEmployee();

  if (!courseId || !employee) {
    throw new Error("Course dan karyawan wajib ada");
  }

  const course = await getCourse(courseId);
  if (!course || course.status === "archived") {
    throw new Error("Course tidak tersedia");
  }

  const [existing] = await db
    .select()
    .from(chitraLearningEnrollments)
    .where(and(eq(chitraLearningEnrollments.courseId, courseId), eq(chitraLearningEnrollments.employeeId, employee.id)))
    .limit(1);

  if (existing) {
    throw new Error("Anda sudah terdaftar atau request sudah pending");
  }

  await db.insert(chitraLearningEnrollments).values({
    courseId,
    employeeId: employee.id,
    enrollmentType: "self",
    approvalStatus: "pending",
    status: "assigned",
    progress: 0,
    dueAt: dueDate(course.dueDays),
  });

  revalidateLms();
}

export async function approveInternalLmsEnrollmentAction(formData: FormData) {
  const enrollmentId = numberValue(formData, "enrollmentId");
  const isApproved = textValue(formData, "status") === "approved";
  const rejectionReason = textValue(formData, "rejectionReason") || "";
  const actorEmployeeId = await getCurrentEmployeeId();

  if (!enrollmentId) throw new Error("Enrollment ID wajib");

  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) {
    throw new Error("Akses ditolak");
  }

  await db
    .update(chitraLearningEnrollments)
    .set({
      approvalStatus: isApproved ? "approved" : "rejected",
      approvedByEmployeeId: actorEmployeeId,
      approvedAt: new Date(),
      rejectionReason: isApproved ? null : rejectionReason,
      updatedAt: new Date(),
    })
    .where(eq(chitraLearningEnrollments.id, enrollmentId));

  revalidateLms();
}

export async function updateCourseAccessRules(courseId: number, rules: { accessType: string, accessValue: string, description: string, isActive: boolean }[]) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  await db.delete(chitraLearningCourseAccess).where(eq(chitraLearningCourseAccess.courseId, courseId));
  
  if (rules.length > 0) {
    await db.insert(chitraLearningCourseAccess).values(rules.map(r => ({
      courseId,
      accessType: r.accessType,
      accessValue: r.accessValue,
      description: r.description,
      isActive: r.isActive
    })));
  }

  revalidateLms();
}

export async function updateCertificateTemplateAction(courseId: number, backgroundImageUrl: string, canvasData: any) {
  const session = await getServerSession();
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms');
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) throw new Error("Unauthorized");

  const [existing] = await db
    .select({ id: chitraLearningCertificateTemplates.id })
    .from(chitraLearningCertificateTemplates)
    .where(eq(chitraLearningCertificateTemplates.courseId, courseId))
    .limit(1);

  if (existing) {
    await db.update(chitraLearningCertificateTemplates).set({
      backgroundImageUrl,
      canvasData,
      updatedAt: new Date()
    }).where(eq(chitraLearningCertificateTemplates.id, existing.id));
  } else {
    await db.insert(chitraLearningCertificateTemplates).values({
      courseId,
      backgroundImageUrl,
      canvasData
    });
  }

  revalidateLms();
}
