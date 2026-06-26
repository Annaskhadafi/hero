import mysql from "mysql2/promise";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { user as authUser } from "@/db/schema/auth";
import { employees, trainingRecords } from "@/db/schema/hero";

const lmsDbConfig = {
  host: process.env.LMS_DB_HOST || "153.92.15.50",
  port: Number(process.env.LMS_DB_PORT) || 3306,
  user: process.env.LMS_DB_USER || "u234341468_jh8R1",
  password: process.env.LMS_DB_PASSWORD || "c76l1sLLqQ",
  database: process.env.LMS_DB_NAME || "u234341468_kAKHT",
  connectTimeout: 5000,
};

// Global Connection Pool
declare global {
  var lmsDbPool: mysql.Pool | undefined;
  var lmsLastSyncTimes: Map<string, number> | undefined;
  var lmsCachedAllProgress: {
    data: any[];
    timestamp: number;
  } | undefined;
  var lmsCachedUserProgress: Map<string, {
    data: any[];
    timestamp: number;
  }> | undefined;
}

if (!globalThis.lmsLastSyncTimes) {
  globalThis.lmsLastSyncTimes = new Map<string, number>();
}

function getPool() {
  if (!globalThis.lmsDbPool) {
    globalThis.lmsDbPool = mysql.createPool({
      ...lmsDbConfig,
      connectionLimit: 5,
      maxIdle: 2,
      idleTimeout: 30000, // 30 seconds idle timeout
      waitForConnections: true,
      queueLimit: 0,
    });
  }
  return globalThis.lmsDbPool;
}

export async function getLmsProgressFromDb(email: string, sn: string) {
  const now = Date.now();
  const cacheDuration = 120000; // Cache for 2 minutes (120,000 ms)

  if (!globalThis.lmsCachedUserProgress) {
    globalThis.lmsCachedUserProgress = new Map();
  }

  const cached = globalThis.lmsCachedUserProgress.get(email);
  if (cached && (now - cached.timestamp < cacheDuration)) {
    console.log(`[LMS MySQL] Returning cached LMS progress data for ${email}`);
    return cached.data;
  }

  try {
    const pool = getPool();

    // 1. Resolve user ID from wp_users or wp_usermeta
    let userId: number | null = null;

    // First try: Search by email
    const [userRows]: any = await pool.query(
      "SELECT ID FROM wp_users WHERE user_email = ? LIMIT 1",
      [email]
    );

    if (userRows.length > 0) {
      userId = userRows[0].ID;
    } else if (sn) {
      // Second try: Search by employee_sn meta key
      const [metaRows]: any = await pool.query(
        "SELECT user_id FROM wp_usermeta WHERE meta_key = 'employee_sn' AND meta_value = ? LIMIT 1",
        [sn]
      );
      if (metaRows.length > 0) {
        userId = metaRows[0].user_id;
      } else {
        // Third try: Search by username (user_login) matching sn
        const [usernameRows]: any = await pool.query(
          "SELECT ID FROM wp_users WHERE user_login = ? LIMIT 1",
          [sn]
        );
        if (usernameRows.length > 0) {
          userId = usernameRows[0].ID;
        }
      }
    }

    if (!userId) {
      return [];
    }

    // 2. Query user courses and progress
    const [courseRows]: any = await pool.query(
      `SELECT uc.course_id, uc.progress_percent as progress, uc.final_grade, uc.status, p.post_title as course_name,
              uc.start_time as startTime, uc.end_time as endTime
       FROM wp_stm_lms_user_courses uc
       JOIN wp_posts p ON uc.course_id = p.ID
       WHERE uc.user_id = ? AND p.post_status = 'publish'`,
      [userId]
    );

    const courses = courseRows.map((row: any) => ({
      course_id: row.course_id,
      course_name: row.course_name,
      progress: row.progress || 0,
      status: row.status,
      grade: row.final_grade !== null ? Number(row.final_grade) : null,
      startTime: row.startTime || null,
      endTime: row.endTime || null,
    }));

    globalThis.lmsCachedUserProgress.set(email, {
      data: courses,
      timestamp: now,
    });

    return courses;
  } catch (error) {
    console.error("[LMS MySQL] Error querying LMS progress:", error);
    const fallback = globalThis.lmsCachedUserProgress?.get(email);
    if (fallback) {
      console.log(`[LMS MySQL] Error encountered. Falling back to expired cached data for ${email}.`);
      return fallback.data;
    }
    throw error;
  }
}

export async function getAllLmsProgressFromDb() {
  const now = Date.now();
  const cacheDuration = 60000; // Cache for 1 minute (60,000 ms)

  if (globalThis.lmsCachedAllProgress && (now - globalThis.lmsCachedAllProgress.timestamp < cacheDuration)) {
    console.log("[LMS MySQL] Returning cached LMS progress data");
    return globalThis.lmsCachedAllProgress.data;
  }

  try {
    const pool = getPool();

    const [courseRows]: any = await pool.query(
      `SELECT uc.course_id, uc.progress_percent as progress, uc.final_grade, uc.status, p.post_title as course_name,
              u.user_email, u.display_name, u.user_login, uc.start_time as startTime, uc.end_time as endTime
       FROM wp_stm_lms_user_courses uc
       JOIN wp_posts p ON uc.course_id = p.ID
       JOIN wp_users u ON uc.user_id = u.ID
       WHERE p.post_status = 'publish'`
    );

    const records = courseRows.map((row: any) => ({
      course_id: row.course_id,
      course_name: row.course_name,
      user_email: row.user_email,
      display_name: row.display_name,
      user_login: row.user_login,
      progress: row.progress || 0,
      status: row.status,
      grade: row.final_grade !== null ? Number(row.final_grade) : null,
      startTime: row.startTime || null,
      endTime: row.endTime || null,
    }));

    globalThis.lmsCachedAllProgress = {
      data: records,
      timestamp: now,
    };

    return records;
  } catch (error) {
    console.error("[LMS MySQL] Error querying all LMS progress:", error);
    if (globalThis.lmsCachedAllProgress) {
      console.log("[LMS MySQL] Error encountered. Falling back to expired cached data.");
      return globalThis.lmsCachedAllProgress.data;
    }
    throw error;
  }
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
      .select({
        id: employees.id,
        employeeSn: employees.employeeSn,
      })
      .from(employees)
      .leftJoin(authUser, eq(employees.authUserId, authUser.id))
      .where(or(eq(employees.email, email), eq(authUser.email, email)))
      .limit(1);

    if (!employee) return { success: false, message: "Employee not found in HERO" };

    const sn = employee.employeeSn;
    
    // 2. Fetch courses from WordPress MySQL
    const courses = await getLmsProgressFromDb(email, sn);

    if (courses.length === 0) {
      globalThis.lmsLastSyncTimes?.set(email, now);
      return { success: true, synced: 0 };
    }

    // 3. Filter completed courses
    const completedCourses = courses.filter(
      (c: any) => c.progress === 100 || c.status.toLowerCase() === "completed" || c.status.toLowerCase() === "passed"
    );

    if (completedCourses.length === 0) {
      globalThis.lmsLastSyncTimes?.set(email, now);
      return { success: true, synced: 0 };
    }

    // 4. Fetch existing HERO training records for this employee
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
    const currentYear = new Date().getFullYear();

    for (const course of completedCourses) {
      const courseNameClean = course.course_name.toLowerCase().trim();

      if (!existingNames.has(courseNameClean)) {
        // Insert new completed training record in HERO database
        await db.insert(trainingRecords).values({
          employeeId: employee.id,
          trainingName: course.course_name,
          provider: "Chitra Learning LMS",
          completedYear: currentYear,
          status: "valid",
        });
        syncCount++;
      }
    }

    globalThis.lmsLastSyncTimes?.set(email, now);
    return { success: true, synced: syncCount };
  } catch (error) {
    console.error("[LMS Sync] Error running sync to training records:", error);
    return { success: false, error: String(error) };
  }
}

export async function getLmsUserCourseCurriculum(courseId: number, email: string, sn: string) {
  try {
    const pool = getPool();

    // Find WordPress user ID
    let userId: number | null = null;
    const [userRows]: any = await pool.query(
      "SELECT ID FROM wp_users WHERE user_email = ? LIMIT 1",
      [email]
    );

    if (userRows.length > 0) {
      userId = userRows[0].ID;
    } else if (sn) {
      const [metaRows]: any = await pool.query(
        "SELECT user_id FROM wp_usermeta WHERE meta_key = 'employee_sn' AND meta_value = ? LIMIT 1",
        [sn]
      );
      if (metaRows.length > 0) {
        userId = metaRows[0].user_id;
      } else {
        const [usernameRows]: any = await pool.query(
          "SELECT ID FROM wp_users WHERE user_login = ? LIMIT 1",
          [sn]
        );
        if (usernameRows.length > 0) {
          userId = usernameRows[0].ID;
        }
      }
    }

    if (!userId) {
      return [];
    }

    // Query curriculum sections for this course
    const [sections]: any[] = await pool.query(
      "SELECT id, title, `order` FROM wp_stm_lms_curriculum_sections WHERE course_id = ? ORDER BY `order` ASC",
      [courseId]
    );

    if (sections.length === 0) {
      return [];
    }

    const sectionIds = sections.map((s: any) => s.id);

    // Query all materials (lessons/quizzes) in these sections
    const [materials]: any[] = await pool.query(
      `SELECT m.section_id, m.post_id, m.post_type, p.post_title as title
       FROM wp_stm_lms_curriculum_materials m
       JOIN wp_posts p ON m.post_id = p.ID
       WHERE m.section_id IN (${sectionIds.join(",")})
       ORDER BY m.section_id ASC, m.\`order\` ASC`
    );

    // Query user's lesson progress
    const [userLessons]: any[] = await pool.query(
      "SELECT lesson_id, progress, start_time, end_time FROM wp_stm_lms_user_lessons WHERE course_id = ? AND user_id = ?",
      [courseId, userId]
    );

    const lessonsMap = new Map();
    for (const ul of userLessons) {
      lessonsMap.set(ul.lesson_id, ul);
    }

    // Query user's quiz progress
    const [userQuizzes]: any[] = await pool.query(
      "SELECT quiz_id, progress, status FROM wp_stm_lms_user_quizzes WHERE course_id = ? AND user_id = ?",
      [courseId, userId]
    );

    const quizzesMap = new Map();
    for (const uq of userQuizzes) {
      quizzesMap.set(uq.quiz_id, uq);
    }

    // Map materials into sections
    return sections.map((section: any) => {
      const sectionMaterials = materials
        .filter((m: any) => m.section_id === section.id)
        .map((m: any) => {
          const isQuiz = m.post_type === "stm-quizzes";
          let progress = 0;
          let status = "not_started";
          let detail = null;

          if (isQuiz) {
            const quizProgress = quizzesMap.get(m.post_id);
            if (quizProgress) {
              progress = quizProgress.progress || 0;
              status = quizProgress.status || "started";
              detail = `Score: ${progress}%`;
            }
          } else {
            const lessonProgress = lessonsMap.get(m.post_id);
            if (lessonProgress) {
              progress = lessonProgress.progress || 0;
              status = lessonProgress.end_time > 0 ? "completed" : "started";
              detail = lessonProgress.end_time > 0 ? "Selesai" : "Sedang dipelajari";
            }
          }

          return {
            post_id: m.post_id,
            title: m.title,
            post_type: m.post_type,
            progress,
            status,
            detail,
          };
        });

      return {
        section_id: section.id,
        title: section.title,
        materials: sectionMaterials,
      };
    });
  } catch (error) {
    console.error("[LMS MySQL] Error querying curriculum details:", error);
    throw error;
  }
}

