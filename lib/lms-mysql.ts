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
      `SELECT uc.course_id, uc.progress_percent as progress, uc.final_grade, uc.status, p.post_title as course_name
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
