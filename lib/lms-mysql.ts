import { eq, or, and } from "drizzle-orm";
import { db } from "@/db";
import { user as authUser } from "@/db/schema/auth";
import { employees, trainingRecords, chitraLearningCourses, chitraLearningEnrollments } from "@/db/schema/hero";

declare global {
  var lmsLastSyncTimes: Map<string, number> | undefined;
}

if (!globalThis.lmsLastSyncTimes) {
  globalThis.lmsLastSyncTimes = new Map<string, number>();
}

export async function syncLmsToTrainingRecords(email: string) {
  try {
    const now = Date.now();
    const lastSync = globalThis.lmsLastSyncTimes?.get(email) || 0;
    if (now - lastSync < 2 * 60 * 1000) {
      return { success: true, synced: 0 };
    }

    // 1. Fetch employee info
    const [employee] = await db
      .select({ id: employees.id })
      .from(employees)
      .leftJoin(authUser, eq(employees.authUserId, authUser.id))
      .where(or(eq(employees.email, email), eq(authUser.email, email)))
      .limit(1);

    if (!employee) return { success: false, message: "Employee not found in HERO" };

    // 2. Fetch completed courses from internal PostgreSQL LMS
    const internalCompletedCourses = await db
      .select({
        courseName: chitraLearningCourses.title,
        completedAt: chitraLearningEnrollments.completedAt,
        progress: chitraLearningEnrollments.progress,
        status: chitraLearningEnrollments.status,
      })
      .from(chitraLearningEnrollments)
      .innerJoin(chitraLearningCourses, eq(chitraLearningEnrollments.courseId, chitraLearningCourses.id))
      .where(
        and(
          eq(chitraLearningEnrollments.employeeId, employee.id),
          or(
            eq(chitraLearningEnrollments.status, 'passed'),
            eq(chitraLearningEnrollments.progress, 100)
          )
        )
      );

    if (internalCompletedCourses.length === 0) {
      globalThis.lmsLastSyncTimes?.set(email, now);
      return { success: true, synced: 0 };
    }

    // 3. Fetch existing HERO training records for this employee
    const existingRecords = await db
      .select({
        trainingName: trainingRecords.trainingName,
        provider: trainingRecords.provider,
      })
      .from(trainingRecords)
      .where(eq(trainingRecords.employeeId, employee.id));

    const existingNames = new Set(
      existingRecords
        .filter((r) => r.provider.toLowerCase().includes("chitra learning") || r.provider.toLowerCase().includes("lms"))
        .map((r) => r.trainingName.toLowerCase().trim())
    );

    let syncCount = 0;

    for (const course of internalCompletedCourses) {
      const courseNameClean = course.courseName.toLowerCase().trim();

      if (!existingNames.has(courseNameClean)) {
        await db.insert(trainingRecords).values({
          employeeId: employee.id,
          trainingName: course.courseName,
          provider: "Chitra Learning LMS",
          completedYear: course.completedAt ? course.completedAt.getFullYear() : new Date().getFullYear(),
          status: "valid",
        });
        syncCount++;
        existingNames.add(courseNameClean); // Prevent duplicates in the same run
      }
    }

    globalThis.lmsLastSyncTimes?.set(email, now);
    return { success: true, synced: syncCount };
  } catch (error) {
    console.error("[LMS Sync] Error running sync to training records:", error);
    return { success: false, error: String(error) };
  }
}

// Dummy functions for backward compatibility with old WP pages that might still be hit before being deleted
export async function getLmsProgressFromDb(email: string, sn: string) {
  return [];
}
export async function getAllLmsProgressFromDb() {
  return [];
}
export async function getLmsUserCourseCurriculum(courseId: number, email: string, sn: string) {
  return [];
}
