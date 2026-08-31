import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT 
      e.id,
      e.name,
      e.email,
      e.department,
      e.job_title
    FROM hero_employees e
    WHERE 
      e.job_title LIKE '%Manager%' OR 
      e.job_title LIKE '%Head%' OR 
      e.job_title LIKE '%Director%' OR 
      e.job_title LIKE '%Leader%' OR 
      e.job_title LIKE '%Supervisor%' OR 
      e.job_title LIKE '%Officer%' OR 
      e.job_title LIKE '%Coordinator%' OR 
      e.name LIKE '%Ria%'
    ORDER BY e.department ASC, e.job_title ASC, e.name ASC
  `);

  const rows = (result as any).rows || result;
  console.log("=== KEY APPROVER CANDIDATES IN COMPANY DIRECTORY ===");
  for (const r of rows as any[]) {
    console.log(`[${r.department || 'GLOBAL'}] ${r.name} — ${r.job_title || 'N/A'} <${r.email || 'no-email'}>`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
