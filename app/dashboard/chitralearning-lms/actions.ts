'use server'

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  chitraLearningAssignmentResponses,
  chitraLearningAuditLogs,
  chitraLearningCampaignParticipants,
  chitraLearningCampaigns,
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
  revalidatePath(LMS_PATH);
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
}

export async function submitInternalLmsQuizAction(formData: FormData) {
  const courseId = numberValue(formData, "courseId");
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
    .where(and(eq(chitraLearningQuizQuestions.courseId, courseId), eq(chitraLearningQuizQuestions.testPhase, phase)));

  const totalPoints = questions.reduce((sum, question) => sum + Math.max(1, question.points || 1), 0);
  const awardedPoints = questions.reduce((sum, question) => {
    const answer = textValue(formData, `answer_${question.id}`).toUpperCase();
    const correct = question.correctOption.toUpperCase();
    return sum + (answer && answer === correct ? Math.max(1, question.points || 1) : 0);
  }, 0);
  const score = totalPoints > 0 ? Math.round((awardedPoints / totalPoints) * 100) : 0;

  if (phase === "pretest") {
    await db
      .update(chitraLearningEnrollments)
      .set({
        pretestScore: score,
        pretestStatus: "completed",
        progress: Math.max(enrollment.progress, 20),
        updatedAt: new Date(),
      })
      .where(eq(chitraLearningEnrollments.id, enrollment.id));
  } else {
    const passed = score >= course.passingScore;
    await db
      .update(chitraLearningEnrollments)
      .set({
        posttestScore: score,
        posttestStatus: passed ? "passed" : "failed",
        score,
        status: passed ? "passed" : "failed",
        progress: passed ? 100 : Math.max(enrollment.progress, 80),
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
