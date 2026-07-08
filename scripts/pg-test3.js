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
    SELECT e.job_title, s.name as section, count(*) 
    FROM hero_employees e
    LEFT JOIN hero_master_sections s ON e.section_id = s.id
    WHERE e.position_id = 11
    GROUP BY e.job_title, s.name
  `);
  console.log(res.rows);
  await client.end();
}
run();
