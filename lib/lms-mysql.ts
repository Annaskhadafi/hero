import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employees, trainingRecords } from "@/db/schema/hero";

const lmsDbConfig = {
  host: process.env.LMS_DB_HOST || "153.92.15.50",
  port: Number(process.env.LMS_DB_PORT) || 3306,
  user: process.env.LMS_DB_USER || "u234341468_jh8R1",
  password: process.env.LMS_DB_PASSWORD || "c76l1sLLqQ",
  database: process.env.LMS_DB_NAME || "u234341468_kAKHT",
  connectTimeout: 5000,
};

export async function getLmsProgressFromDb(email: string, sn: string) {
  let connection;
  try {
    connection = await mysql.createConnection(lmsDbConfig);

    // 1. Resolve user ID from wp_users or wp_usermeta
    let userId: number | null = null;

    // First try: Search by email
    const [userRows]: any = await connection.query(
      "SELECT ID FROM wp_users WHERE user_email = ? LIMIT 1",
      [email]
    );

    if (userRows.length > 0) {
      userId = userRows[0].ID;
    } else if (sn) {
      // Second try: Search by employee_sn meta key
      const [metaRows]: any = await connection.query(
        "SELECT user_id FROM wp_usermeta WHERE meta_key = 'employee_sn' AND meta_value = ? LIMIT 1",
        [sn]
      );
      if (metaRows.length > 0) {
        userId = metaRows[0].user_id;
      } else {
        // Third try: Search by username (user_login) matching sn
        const [usernameRows]: any = await connection.query(
          "SELECT ID FROM wp_users WHERE user_login = ? LIMIT 1",
          [sn]
        );
        if (usernameRows.length > 0) {
          userId = usernameRows[0].ID;
        }
      }
    }

    if (!userId) {
      await connection.end();
      return [];
    }

    // 2. Query user courses and progress
    const [courseRows]: any = await connection.query(
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

    await connection.end();
    return courses;
  } catch (error) {
    console.error("[LMS MySQL] Error querying LMS progress:", error);
    if (connection) {
      try {
        await connection.end();
      } catch (e) {}
    }
    throw error;
  }
}

export async function getAllLmsProgressFromDb() {
  let connection;
  try {
    connection = await mysql.createConnection(lmsDbConfig);

    const [courseRows]: any = await connection.query(
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

    await connection.end();
    return records;
  } catch (error) {
    console.error("[LMS MySQL] Error querying all LMS progress:", error);
    if (connection) {
      try {
        await connection.end();
      } catch (e) {}
    }
    throw error;
  }
}

export async function syncLmsToTrainingRecords(email: string) {
  try {
    // 1. Fetch employee info
    const [employee] = await db
      .select({
        id: employees.id,
        employeeSn: employees.employeeSn,
      })
      .from(employees)
      .where(eq(employees.email, email))
      .limit(1);

    if (!employee) return { success: false, message: "Employee not found in HERO" };

    const sn = employee.employeeSn;
    
    // 2. Fetch courses from WordPress MySQL
    const courses = await getLmsProgressFromDb(email, sn);

    if (courses.length === 0) return { success: true, synced: 0 };

    // 3. Filter completed courses
    const completedCourses = courses.filter(
      (c: any) => c.progress === 100 || c.status.toLowerCase() === "completed" || c.status.toLowerCase() === "passed"
    );

    if (completedCourses.length === 0) return { success: true, synced: 0 };

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

    return { success: true, synced: syncCount };
  } catch (error) {
    console.error("[LMS Sync] Error running sync to training records:", error);
    return { success: false, error: String(error) };
  }
}

export async function getLmsUserCourseCurriculum(courseId: number, email: string, sn: string) {
  let connection;
  try {
    connection = await mysql.createConnection(lmsDbConfig);

    // Find WordPress user ID
    let userId: number | null = null;
    const [userRows]: any = await connection.query(
      "SELECT ID FROM wp_users WHERE user_email = ? LIMIT 1",
      [email]
    );

    if (userRows.length > 0) {
      userId = userRows[0].ID;
    } else if (sn) {
      const [metaRows]: any = await connection.query(
        "SELECT user_id FROM wp_usermeta WHERE meta_key = 'employee_sn' AND meta_value = ? LIMIT 1",
        [sn]
      );
      if (metaRows.length > 0) {
        userId = metaRows[0].user_id;
      } else {
        const [usernameRows]: any = await connection.query(
          "SELECT ID FROM wp_users WHERE user_login = ? LIMIT 1",
          [sn]
        );
        if (usernameRows.length > 0) {
          userId = usernameRows[0].ID;
        }
      }
    }

    if (!userId) {
      await connection.end();
      return [];
    }

    // Query curriculum sections for this course
    const [sections]: any[] = await connection.query(
      "SELECT id, title, `order` FROM wp_stm_lms_curriculum_sections WHERE course_id = ? ORDER BY `order` ASC",
      [courseId]
    );

    if (sections.length === 0) {
      await connection.end();
      return [];
    }

    const sectionIds = sections.map((s: any) => s.id);

    // Query all materials (lessons/quizzes) in these sections
    const [materials]: any[] = await connection.query(
      `SELECT m.section_id, m.post_id, m.post_type, p.post_title as title
       FROM wp_stm_lms_curriculum_materials m
       JOIN wp_posts p ON m.post_id = p.ID
       WHERE m.section_id IN (${sectionIds.join(",")})
       ORDER BY m.section_id ASC, m.\`order\` ASC`
    );

    // Query user's lesson progress
    const [userLessons]: any[] = await connection.query(
      "SELECT lesson_id, progress, start_time, end_time FROM wp_stm_lms_user_lessons WHERE course_id = ? AND user_id = ?",
      [courseId, userId]
    );

    const lessonsMap = new Map();
    for (const ul of userLessons) {
      lessonsMap.set(ul.lesson_id, ul);
    }

    // Query user's quiz progress
    const [userQuizzes]: any[] = await connection.query(
      "SELECT quiz_id, progress, status FROM wp_stm_lms_user_quizzes WHERE course_id = ? AND user_id = ?",
      [courseId, userId]
    );

    const quizzesMap = new Map();
    for (const uq of userQuizzes) {
      quizzesMap.set(uq.quiz_id, uq);
    }

    await connection.end();

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
    if (connection) {
      try {
        await connection.end();
      } catch (e) {}
    }
    return [];
  }
}

