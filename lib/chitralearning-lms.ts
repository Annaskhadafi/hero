import { asc, desc } from "drizzle-orm";

import { db } from "@/db";
import {
  chitraLearningAssignmentResponses,
  chitraLearningCertificates,
  chitraLearningAuditLogs,
  chitraLearningCampaignParticipants,
  chitraLearningCampaigns,
  chitraLearningCourseAccess,
  chitraLearningCourses,
  chitraLearningEnrollments,
  chitraLearningLessons,
  chitraLearningQuizQuestions,
  employees,
  notificationDeliveries,
  notificationEvents,
} from "@/db/schema/hero";
import { getCurrentMenuPermission, getCurrentEmployeeAccessRole } from "@/lib/hero-access";
import { LMS_SECTION_MANAGEMENT_RESOURCE } from '@/lib/chitralearning-lms/notifications'

export async function canManageLmsSection() {
  const permission = await getCurrentMenuPermission(LMS_SECTION_MANAGEMENT_RESOURCE)
  return permission.canView || permission.canEdit
}

export async function isLmsAdmin(session: any) {
  // [1] Check RBAC permission for LMS Builder (primary path)
  const perm = await getCurrentMenuPermission("chitralearning_lms_builder");
  if (perm?.canView || perm?.canEdit) {
    return true;
  }

  // [2] Fallback: check employee.accessRole from DB (most reliable)
  const dynamicRole = await getCurrentEmployeeAccessRole();

  // [3] Also check session role as secondary fallback
  const rawRole = dynamicRole || session?.user?.role;

  if (!rawRole) return false;

  // Normalize: lowercase, remove spaces/underscores/hyphens for loose matching
  const normalized = rawRole.toLowerCase().replace(/[\s_\-]+/g, "");

  // Accept any variant of: admin, superadmin, hradmin, hr
  // e.g. "Super Admin", "super_admin", "Super-Admin", "HR Admin", "hr_admin"
  const ADMIN_NORMALIZED = ["admin", "superadmin", "hradmin", "hr"];
  if (ADMIN_NORMALIZED.includes(normalized)) return true;

  // Also accept if the role name simply contains "admin" or "super"
  // This covers custom role names like "LMS Admin", "System Admin", etc.
  if (normalized.includes("admin") || normalized.includes("super")) return true;

  return false;
}

export const INTERNAL_LMS_FEATURES = [
  {
    feature: "Video / materi",
    description: "Lesson bisa menyimpan video URL, file/resource URL, durasi, urutan, dan wajib/tidak wajib.",
    status: "Aktif internal",
  },
  {
    feature: "Quiz",
    description: "Bank soal pretest/posttest, opsi jawaban teks/gambar, kunci jawaban, poin, dan passing score course.",
    status: "Aktif internal",
  },
  {
    feature: "Certificate",
    description: "Sertifikat internal per karyawan dan course, bisa disambungkan ke Training Records HERO.",
    status: "Aktif internal",
  },
  {
    feature: "Access control",
    description: "Rule akses per course: semua karyawan, department, section, access role, atau employee tertentu.",
    status: "Aktif internal",
  },
  {
    feature: "Commercial flow",
    description: "Cart, payment, wallet, coupon, refund, marketplace revenue tidak dipakai untuk kebutuhan internal.",
    status: "Tidak dipakai",
  },
] as const;

export const INTERNAL_LMS_ACCESS_TYPES = [
  { value: "all", label: "Semua karyawan" },
  { value: "department", label: "Department" },
  { value: "section", label: "Section" },
  { value: "role", label: "Access role" },
  { value: "employee", label: "Karyawan tertentu" },
] as const;

export const INTERNAL_LMS_CAMPAIGN_TARGET_TYPES = [
  { value: "all", label: "Semua karyawan" },
  { value: "site", label: "Site" },
  { value: "department", label: "Department" },
  { value: "section", label: "Section" },
  { value: "role", label: "Access role" },
  { value: "employee", label: "Karyawan tertentu" },
] as const;

export const INTERNAL_LMS_CAMPAIGN_TYPES = [
  { value: "posttest", label: "Post test refreshment" },
  { value: "quiz", label: "Quiz dadakan" },
  { value: "assignment", label: "Assignment" },
] as const;

export const INTERNAL_LMS_RECURRENCE_OPTIONS = [
  { value: "manual", label: "Sekali / manual" },
  { value: "quarterly", label: "Triwulan" },
  { value: "semester", label: "Semester" },
  { value: "yearly", label: "Tahunan" },
] as const;

export const INTERNAL_LMS_LESSON_TYPES = [
  { value: "video", label: "Video" },
  { value: "resource", label: "File / resource" },
  { value: "article", label: "Materi teks" },
  { value: "quiz", label: "Quiz" },
] as const;

export const INTERNAL_LMS_TEST_PHASES = [
  { value: "pretest", label: "Pretest" },
  { value: "posttest", label: "Post test" },
] as const;

export type InternalLmsWorkspaceData = Awaited<ReturnType<typeof getInternalLmsWorkspaceData>>;

type LearnerContext = {
  id: number;
  employeeSn?: string | null;
  department?: string | null;
  section?: string | null;
  accessRole?: string | null;
};

export type InternalLmsManagementEmployee = LearnerContext & {
  name: string;
  email: string;
  workLocation?: string | null;
  jobTitle?: string | null;
  isActive?: boolean | null;
};

export type InternalLmsManagementFilters = {
  site?: string | null;
  department?: string | null;
  section?: string | null;
  role?: string | null;
};

export function slugifyCourseTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeAccessValue(value: string | number | null | undefined) {
  return `${value ?? ""}`.trim().toLowerCase();
}

function addDays(date: Date | string | null | undefined, days: number) {
  const base = date ? new Date(date) : new Date();
  base.setDate(base.getDate() + days);
  return base;
}

function canAccessCourse(
  courseId: number,
  employee: LearnerContext,
  accessRules: InternalLmsWorkspaceData["accessRules"]
) {
  const rules = accessRules.filter((rule) => rule.courseId === courseId && rule.isActive);
  if (rules.length === 0) return false;

  const employeeId = normalizeAccessValue(employee.id);
  const employeeSn = normalizeAccessValue(employee.employeeSn);
  const department = normalizeAccessValue(employee.department);
  const section = normalizeAccessValue(employee.section);
  const accessRole = normalizeAccessValue(employee.accessRole);

  return rules.some((rule) => {
    const value = normalizeAccessValue(rule.accessValue);
    if (rule.accessType === "all" || value === "*") return true;
    if (rule.accessType === "department") return value === department;
    if (rule.accessType === "section") return value === section;
    if (rule.accessType === "role") return value === accessRole;
    if (rule.accessType === "employee") return value === employeeId || value === employeeSn;
    return false;
  });
}

function canTargetEmployee(
  targetType: string,
  targetValue: string | null | undefined,
  employee: InternalLmsManagementEmployee | LearnerContext
) {
  const value = normalizeAccessValue(targetValue || "*");
  if (targetType === "all" || value === "*") return true;

  const employeeId = normalizeAccessValue(employee.id);
  const employeeSn = normalizeAccessValue(employee.employeeSn);
  const department = normalizeAccessValue(employee.department);
  const section = normalizeAccessValue(employee.section);
  const accessRole = normalizeAccessValue(employee.accessRole);
  const workLocation = "workLocation" in employee ? normalizeAccessValue(employee.workLocation) : "";

  if (targetType === "site") return value === workLocation;
  if (targetType === "department") return value === department;
  if (targetType === "section") return value === section;
  if (targetType === "role") return value === accessRole;
  if (targetType === "employee") return value === employeeId || value === employeeSn;
  return false;
}

export function buildInternalLmsLearnerCourses(
  workspace: InternalLmsWorkspaceData,
  employee: LearnerContext | null,
  options: { previewCourseId?: number | null } = {}
) {
  if (!employee) return [];

  const previewCourseId = options.previewCourseId ?? null;
  const campaignCourseIds = new Set(
    workspace.campaignParticipants
      .filter((participant) => participant.employeeId === employee.id)
      .map((participant) => workspace.campaigns.find((campaign) => campaign.id === participant.campaignId)?.courseId ?? null)
      .filter((courseId): courseId is number => typeof courseId === "number")
  );

  return workspace.courses
    .filter((course) => {
      if (previewCourseId === course.id) return true;
      if (campaignCourseIds.has(course.id) && course.status !== "archived") return true;
      
      const hasEnrollment = workspace.enrollments.some(e => e.courseId === course.id && e.employeeId === employee.id);
      if (hasEnrollment) return true;
      
      return course.status === "published" && canAccessCourse(course.id, employee, workspace.accessRules);
    })
    .map((course) => {
      const enrollment = workspace.enrollments.find(
        (item) => item.courseId === course.id && item.employeeId === employee.id
      );
      const certificate = workspace.certificates.find(
        (item) => item.courseId === course.id && item.employeeId === employee.id
      );
      const lessons = workspace.lessons.filter((lesson) => lesson.courseId === course.id);
      const pretestQuestions = workspace.questions.filter(
        (question) => question.courseId === course.id && question.testPhase === "pretest"
      );
      const posttestQuestions = workspace.questions.filter(
        (question) => question.courseId === course.id && question.testPhase !== "pretest"
      );
      const dueAt = enrollment?.dueAt ?? addDays(course.createdAt, course.dueDays ?? 14);
      const posttestPassed = (enrollment?.posttestScore ?? -1) >= course.passingScore || Boolean(certificate);
      const posttestFailed = enrollment?.posttestStatus === "failed";

      return {
        ...course,
        enrollment,
        certificate,
        lessons,
        pretestQuestions,
        posttestQuestions,
        dueAt,
        posttestPassed,
        posttestFailed,
      };
    })
    .sort((left, right) => {
      const leftDue = new Date(left.dueAt).getTime();
      const rightDue = new Date(right.dueAt).getTime();
      return leftDue - rightDue || left.title.localeCompare(right.title);
    });
}

function matchesFilter(value: string | null | undefined, filter: string | null | undefined) {
  if (!filter) return true;
  return normalizeAccessValue(value) === normalizeAccessValue(filter);
}

function certificateStatus(certificate: InternalLmsWorkspaceData["certificates"][number] | undefined) {
  if (!certificate) return "missing";
  if (!certificate.expiresAt) return "valid";

  const now = new Date();
  const expiresAt = new Date(certificate.expiresAt);
  const expiringSoonAt = new Date();
  expiringSoonAt.setDate(expiringSoonAt.getDate() + 30);

  if (expiresAt < now) return "expired";
  if (expiresAt <= expiringSoonAt) return "expiring";
  return "valid";
}

export function buildInternalLmsComplianceRows(
  workspace: InternalLmsWorkspaceData,
  employeeRows: InternalLmsManagementEmployee[],
  filters: InternalLmsManagementFilters = {}
) {
  const activeEmployees = employeeRows.filter((employee) => {
    if (employee.isActive === false) return false;
    return (
      matchesFilter(employee.workLocation, filters.site) &&
      matchesFilter(employee.department, filters.department) &&
      matchesFilter(employee.section, filters.section) &&
      matchesFilter(employee.accessRole, filters.role)
    );
  });

  return workspace.courses
    .filter((course) => course.status === "published")
    .flatMap((course) =>
      activeEmployees
        .filter((employee) => canAccessCourse(course.id, employee, workspace.accessRules))
        .map((employee) => {
          const enrollment = workspace.enrollments.find(
            (item) => item.courseId === course.id && item.employeeId === employee.id
          );
          const certificate = workspace.certificates.find(
            (item) => item.courseId === course.id && item.employeeId === employee.id
          );
          const passed = enrollment?.status === "passed" || Boolean(certificate);
          const failed = enrollment?.status === "failed" || enrollment?.posttestStatus === "failed";
          const status = passed ? "passed" : failed ? "failed" : enrollment ? "learning" : "not_started";

          return {
            courseId: course.id,
            courseTitle: course.title,
            passingScore: course.passingScore,
            employeeId: employee.id,
            employeeName: employee.name,
            employeeSn: employee.employeeSn ?? "",
            email: employee.email,
            site: employee.workLocation ?? "",
            department: employee.department ?? "",
            section: employee.section ?? "",
            role: employee.accessRole ?? "",
            jobTitle: employee.jobTitle ?? "",
            status,
            progress: enrollment?.progress ?? 0,
            score: enrollment?.posttestScore ?? enrollment?.score ?? null,
            dueAt: enrollment?.dueAt ?? addDays(course.createdAt, course.dueDays ?? 14),
            certificateNumber: certificate?.certificateNumber ?? "",
            certificateStatus: certificateStatus(certificate),
            certificateExpiresAt: certificate?.expiresAt ?? null,
          };
        })
    )
    .sort((left, right) => {
      const statusOrder = ["not_started", "learning", "failed", "passed"];
      return (
        statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status) ||
        new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime() ||
        left.employeeName.localeCompare(right.employeeName)
      );
    });
}

export type InternalLmsComplianceRow = ReturnType<typeof buildInternalLmsComplianceRows>[number];

export function summarizeInternalLmsCompliance(rows: InternalLmsComplianceRow[]) {
  return {
    notStarted: rows.filter((row) => row.status === "not_started").length,
    learning: rows.filter((row) => row.status === "learning").length,
    failed: rows.filter((row) => row.status === "failed").length,
    passed: rows.filter((row) => row.status === "passed").length,
    certificateExpired: rows.filter((row) => row.certificateStatus === "expired").length,
    certificateExpiring: rows.filter((row) => row.certificateStatus === "expiring").length,
  };
}

export function buildInternalLmsRefreshmentRows(
  workspace: InternalLmsWorkspaceData,
  employeeRows: InternalLmsManagementEmployee[],
  filters: InternalLmsManagementFilters = {}
) {
  const activeEmployees = employeeRows.filter((employee) => {
    if (employee.isActive === false) return false;
    return (
      matchesFilter(employee.workLocation, filters.site) &&
      matchesFilter(employee.department, filters.department) &&
      matchesFilter(employee.section, filters.section) &&
      matchesFilter(employee.accessRole, filters.role)
    );
  });

  return workspace.campaigns
    .filter((campaign) => campaign.status === "published")
    .flatMap((campaign) =>
      activeEmployees
        .filter((employee) => canTargetEmployee(campaign.targetType, campaign.targetValue, employee))
        .map((employee) => {
          const participant = workspace.campaignParticipants.find(
            (item) => item.campaignId === campaign.id && item.employeeId === employee.id
          );
          const course = workspace.courses.find((item) => item.id === campaign.courseId);
          const enrollment =
            (participant?.enrollmentId
              ? workspace.enrollments.find((item) => item.id === participant.enrollmentId)
              : null) ??
            (course
              ? workspace.enrollments.find((item) => item.courseId === course.id && item.employeeId === employee.id)
              : undefined);
          const assignmentResponse = workspace.assignmentResponses.find(
            (item) => item.campaignId === campaign.id && item.employeeId === employee.id
          );
          const courseScore = enrollment?.posttestScore ?? enrollment?.score ?? null;
          const assignmentScore = assignmentResponse?.score ?? participant?.score ?? null;
          const score = campaign.campaignType === "assignment" ? assignmentScore : courseScore ?? participant?.score ?? null;
          const passed =
            participant?.status === "passed" ||
            enrollment?.status === "passed" ||
            (score != null && score >= campaign.passingScore);
          const failed = participant?.status === "failed" || enrollment?.status === "failed";
          const submitted = Boolean(assignmentResponse) || participant?.status === "submitted";
          const status = passed
            ? "passed"
            : failed
              ? "failed"
              : campaign.campaignType === "assignment" && submitted
                ? "submitted"
                : enrollment?.status === "in_progress"
                  ? "learning"
                  : participant
                    ? "assigned"
                    : "not_started";

          return {
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            campaignType: campaign.campaignType,
            courseId: campaign.courseId,
            courseTitle: course?.title ?? "Assignment tanpa course",
            targetType: campaign.targetType,
            targetValue: campaign.targetValue,
            recurrence: campaign.recurrence,
            passingScore: campaign.passingScore,
            employeeId: employee.id,
            employeeName: employee.name,
            employeeSn: employee.employeeSn ?? "",
            email: employee.email,
            site: employee.workLocation ?? "",
            department: employee.department ?? "",
            section: employee.section ?? "",
            role: employee.accessRole ?? "",
            status,
            score,
            dueAt: campaign.dueAt ?? enrollment?.dueAt ?? null,
            submittedAt: assignmentResponse?.submittedAt ?? participant?.submittedAt ?? null,
          };
        })
    )
    .sort((left, right) => {
      const statusOrder = ["not_started", "assigned", "learning", "failed", "submitted", "passed"];
      return (
        statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status) ||
        new Date(left.dueAt ?? 0).getTime() - new Date(right.dueAt ?? 0).getTime() ||
        left.employeeName.localeCompare(right.employeeName)
      );
    });
}

export type InternalLmsRefreshmentRow = ReturnType<typeof buildInternalLmsRefreshmentRows>[number];

export function summarizeInternalLmsRefreshments(rows: InternalLmsRefreshmentRow[]) {
  return {
    assigned: rows.filter((row) => row.status === "assigned" || row.status === "not_started").length,
    learning: rows.filter((row) => row.status === "learning").length,
    submitted: rows.filter((row) => row.status === "submitted").length,
    failed: rows.filter((row) => row.status === "failed").length,
    passed: rows.filter((row) => row.status === "passed").length,
  };
}

export function buildInternalLmsRoleMatrix(rows: InternalLmsComplianceRow[]) {
  const grouped = new Map<
    string,
    {
      role: string;
      courseTitle: string;
      total: number;
      notStarted: number;
      learning: number;
      failed: number;
      passed: number;
      compliance: number;
    }
  >();

  for (const row of rows) {
    const role = row.role || row.jobTitle || "Tanpa role";
    const key = `${role}::${row.courseId}`;
    const item =
      grouped.get(key) ??
      {
        role,
        courseTitle: row.courseTitle,
        total: 0,
        notStarted: 0,
        learning: 0,
        failed: 0,
        passed: 0,
        compliance: 0,
      };

    item.total += 1;
    if (row.status === "not_started") item.notStarted += 1;
    if (row.status === "learning") item.learning += 1;
    if (row.status === "failed") item.failed += 1;
    if (row.status === "passed") item.passed += 1;
    item.compliance = item.total > 0 ? Math.round((item.passed / item.total) * 100) : 0;
    grouped.set(key, item);
  }

  return Array.from(grouped.values()).sort(
    (left, right) => left.role.localeCompare(right.role) || left.courseTitle.localeCompare(right.courseTitle)
  );
}

export async function runInternalLmsReminderTick(input: {
  actorEmployeeId?: number | null;
  filters?: InternalLmsManagementFilters;
} = {}) {
  const workspace = await getInternalLmsWorkspaceData();
  if (!workspace.schemaReady) {
    return { reminded: 0, skipped: "schema_not_ready" };
  }

  const employeeRows = await getInternalLmsEmployeeOptions();
  const complianceRows = buildInternalLmsComplianceRows(workspace, employeeRows, input.filters).filter(
    (row) => row.status === "not_started" || row.status === "learning" || row.status === "failed"
  );
  const refreshmentRows = buildInternalLmsRefreshmentRows(workspace, employeeRows, input.filters).filter(
    (row) => row.status === "not_started" || row.status === "assigned" || row.status === "learning" || row.status === "failed"
  );
  const now = new Date();

  for (const row of complianceRows) {
    if (!row.email) continue;

    const [event] = await db
      .insert(notificationEvents)
      .values({
        channel: "in_app",
        eventType: "chitralearning_course_reminder",
        recipient: row.email,
        payloadSnapshot: JSON.stringify({
          title: "Reminder ChitraLearning",
          body: `${row.courseTitle} belum selesai. Status: ${row.status}.`,
          url: "/dashboard/chitralearning-lms",
          courseId: row.courseId,
          dueAt: new Date(row.dueAt).toISOString(),
        }),
        deliveryStatus: "delivered",
        deliveredAt: now,
        createdAt: now,
      })
      .returning({ id: notificationEvents.id });

    await db.insert(notificationDeliveries).values({
      notificationEventId: event.id,
      deliveryChannel: "in_app",
      recipient: row.email,
      status: "delivered",
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const row of refreshmentRows) {
    if (!row.email) continue;

    const [event] = await db
      .insert(notificationEvents)
      .values({
        channel: "in_app",
        eventType: "chitralearning_refreshment_reminder",
        recipient: row.email,
        payloadSnapshot: JSON.stringify({
          title: "Reminder Refreshment ChitraLearning",
          body: `${row.campaignTitle} belum selesai. Status: ${row.status}.`,
          url: "/dashboard/chitralearning-lms",
          campaignId: row.campaignId,
          dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : null,
        }),
        deliveryStatus: "delivered",
        deliveredAt: now,
        createdAt: now,
      })
      .returning({ id: notificationEvents.id });

    await db.insert(notificationDeliveries).values({
      notificationEventId: event.id,
      deliveryChannel: "in_app",
      recipient: row.email,
      status: "delivered",
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.insert(chitraLearningAuditLogs).values({
    actorEmployeeId: input.actorEmployeeId ?? null,
    action: "reminder_run",
    afterValue: {
      count: complianceRows.length + refreshmentRows.length,
      courseCount: complianceRows.length,
      refreshmentCount: refreshmentRows.length,
      filters: input.filters ?? {},
    },
    note: "In-app reminder queued for unfinished ChitraLearning participants and refreshment campaigns.",
  });

  return { reminded: complianceRows.length + refreshmentRows.length, skipped: null };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isMissingRelationError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return message.includes("relation") && message.includes("does not exist");
}

async function optionalRelationRows<T>(query: PromiseLike<T[]>) {
  try {
    return await query;
  } catch (error) {
    // ponytail: keep the page readable while additive LMS tables are being rolled out; remove after migrations are mandatory.
    if (isMissingRelationError(error)) return [];
    throw error;
  }
}

export async function getInternalLmsWorkspaceData() {
  try {
    const [
      courses,
      lessons,
      questions,
      accessRules,
      enrollments,
      certificates,
      auditLogs,
      campaigns,
      campaignParticipants,
      assignmentResponses,
    ] = await Promise.all([
      db.select().from(chitraLearningCourses).orderBy(desc(chitraLearningCourses.createdAt)),
      db.select().from(chitraLearningLessons).orderBy(asc(chitraLearningLessons.sortOrder), asc(chitraLearningLessons.id)),
      db
        .select()
        .from(chitraLearningQuizQuestions)
        .orderBy(asc(chitraLearningQuizQuestions.sortOrder), asc(chitraLearningQuizQuestions.id)),
      db.select().from(chitraLearningCourseAccess).orderBy(desc(chitraLearningCourseAccess.createdAt)),
      db.select().from(chitraLearningEnrollments),
      db.select().from(chitraLearningCertificates).orderBy(desc(chitraLearningCertificates.issuedAt)),
      db.select().from(chitraLearningAuditLogs).orderBy(desc(chitraLearningAuditLogs.createdAt)).limit(80),
      optionalRelationRows(db.select().from(chitraLearningCampaigns).orderBy(desc(chitraLearningCampaigns.createdAt))),
      optionalRelationRows(db.select().from(chitraLearningCampaignParticipants)),
      optionalRelationRows(
        db.select().from(chitraLearningAssignmentResponses).orderBy(desc(chitraLearningAssignmentResponses.submittedAt))
      ),
    ]);

    const lessonCountByCourse = new Map<number, number>();
    const quizCountByCourse = new Map<number, number>();
    const pretestCountByCourse = new Map<number, number>();
    const posttestCountByCourse = new Map<number, number>();
    const accessCountByCourse = new Map<number, number>();
    const enrollmentCountByCourse = new Map<number, number>();
    const certificateCountByCourse = new Map<number, number>();
    const campaignCountByCourse = new Map<number, number>();

    for (const lesson of lessons) {
      lessonCountByCourse.set(lesson.courseId, (lessonCountByCourse.get(lesson.courseId) ?? 0) + 1);
    }

    for (const question of questions) {
      quizCountByCourse.set(question.courseId, (quizCountByCourse.get(question.courseId) ?? 0) + 1);
      if (question.testPhase === "pretest") {
        pretestCountByCourse.set(question.courseId, (pretestCountByCourse.get(question.courseId) ?? 0) + 1);
      } else {
        posttestCountByCourse.set(question.courseId, (posttestCountByCourse.get(question.courseId) ?? 0) + 1);
      }
    }

    for (const rule of accessRules) {
      if (rule.isActive) {
        accessCountByCourse.set(rule.courseId, (accessCountByCourse.get(rule.courseId) ?? 0) + 1);
      }
    }

    for (const enrollment of enrollments) {
      enrollmentCountByCourse.set(enrollment.courseId, (enrollmentCountByCourse.get(enrollment.courseId) ?? 0) + 1);
    }

    for (const certificate of certificates) {
      certificateCountByCourse.set(certificate.courseId, (certificateCountByCourse.get(certificate.courseId) ?? 0) + 1);
    }

    for (const campaign of campaigns) {
      if (campaign.courseId) {
        campaignCountByCourse.set(campaign.courseId, (campaignCountByCourse.get(campaign.courseId) ?? 0) + 1);
      }
    }

    return {
      schemaReady: true,
      error: null,
      courses: courses.map((course) => ({
        ...course,
        lessonCount: lessonCountByCourse.get(course.id) ?? 0,
        quizQuestionCount: quizCountByCourse.get(course.id) ?? 0,
        pretestQuestionCount: pretestCountByCourse.get(course.id) ?? 0,
        posttestQuestionCount: posttestCountByCourse.get(course.id) ?? 0,
        accessRuleCount: accessCountByCourse.get(course.id) ?? 0,
        enrollmentCount: enrollmentCountByCourse.get(course.id) ?? 0,
        certificateCount: certificateCountByCourse.get(course.id) ?? 0,
        campaignCount: campaignCountByCourse.get(course.id) ?? 0,
      })),
      lessons,
      questions,
      accessRules,
      enrollments,
      certificates,
      auditLogs,
      campaigns,
      campaignParticipants,
      assignmentResponses,
    };
  } catch (error) {
    console.error("[ChitraLearning LMS] internal workspace query failed", error);

    return {
      schemaReady: false,
      error: errorMessage(error),
      courses: [],
      lessons: [],
      questions: [],
      accessRules: [],
      enrollments: [],
      certificates: [],
      auditLogs: [],
      campaigns: [],
      campaignParticipants: [],
      assignmentResponses: [],
    };
  }
}

export async function getInternalLmsEmployeeOptions() {
  return db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      employeeSn: employees.employeeSn,
      department: employees.department,
      section: employees.section,
      accessRole: employees.accessRole,
      workLocation: employees.workLocation,
      jobTitle: employees.jobTitle,
      isActive: employees.isActive,
    })
    .from(employees)
    .orderBy(asc(employees.name));
}
