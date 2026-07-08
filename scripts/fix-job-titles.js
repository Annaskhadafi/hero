import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env") });
import pkg from "pg";
const { Client } = pkg;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  
  // Set position_id to NULL where it was incorrectly mapped
  const res = await client.query(`
    UPDATE hero_employees
    SET position_id = NULL
    WHERE position_id IN (
      SELECT e.position_id
      FROM hero_employees e
      LEFT JOIN hero_master_job_titles t ON e.position_id = t.id
      WHERE e.position_id IS NOT NULL 
        AND (
          (t.name = 'Database & Innovation Coordinator' AND e.job_title = 'Staff') OR
          (t.name = 'Facility & Maintenance Supervisor' AND e.job_title = 'Leader') OR
          (t.name = 'Billing' AND e.job_title = 'Manager') OR
          (t.name = 'Accounting & Asset SPV' AND e.job_title = 'Coordinator') OR
          (t.name = 'Executive Secretary' AND e.job_title = 'Jr. Supervisor') OR
          (t.name = 'Export Import Compliance & Principal Relations Manager' AND e.job_title = 'Supervisor')
        )
    )
    AND (
      (job_title = 'Staff' AND position_id = 11) OR
      (job_title = 'Leader' AND position_id = 18) OR
      (job_title = 'Manager' AND position_id = 5) OR
      (job_title = 'Coordinator' AND position_id = 1) OR
      (job_title = 'Jr. Supervisor' AND position_id = 15) OR
      (job_title = 'Supervisor' AND position_id = 17)
    );
  `);
  
  console.log(`Updated ${res.rowCount} rows.`);
  await client.end();
}
run();
