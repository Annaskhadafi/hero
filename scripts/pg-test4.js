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
  const res = await client.query(`
    SELECT e.position_id, t.name as mapped_title, e.job_title as raw_title, count(*)
    FROM hero_employees e
    LEFT JOIN hero_master_job_titles t ON e.position_id = t.id
    WHERE e.position_id IS NOT NULL AND t.name != e.job_title
    GROUP BY e.position_id, t.name, e.job_title
    ORDER BY count(*) DESC
    LIMIT 20
  `);
  console.log(res.rows);
  await client.end();
}
run();
