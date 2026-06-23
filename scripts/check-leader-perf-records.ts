import { db } from "@/db";
import { sql } from "drizzle-orm";

async function run() {
  const rows = await db.execute(sql`
    SELECT 
      hlp.id, hlp.leader_sn, hlp.reviewer_sn, hlp.period, 
      hlp.survey_score, hlp.response_time_score, hlp.leadership_score,
      hlp.overall_score, hlp.status, hlp.leader_id, hlp.reviewer_id,
      el.name as leader_name, el.employee_sn as leader_emp_sn,
      er.name as reviewer_name, er.employee_sn as reviewer_emp_sn
    FROM hero_hc_leader_performance hlp
    LEFT JOIN hero_employees el ON hlp.leader_sn = el.employee_sn
    LEFT JOIN hero_employees er ON hlp.reviewer_sn = er.employee_sn
    ORDER BY hlp.id DESC
    LIMIT 20;
  `);
  console.log("=== Records in hero_hc_leader_performance ===");
  console.table(rows.rows);
  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
